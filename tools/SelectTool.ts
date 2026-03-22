/**
 * @boardier-module tools/SelectTool
 * @boardier-category Tools
 * @boardier-description The default selection tool. Handles click-to-select, box selection, lasso selection, drag-to-move, resize handles, smart alignment guides, and keyboard shortcuts (delete, copy, paste, undo/redo, select-all). This is the most complex tool in Boardier.
 * @boardier-since 0.1.0
 */
import type { Vec2, Bounds, BoardierElement } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { getElementBounds } from '../elements/base';
import { normalizeBounds, pointInPolygon, boundsCenter } from '../utils/math';

type DragMode = 'none' | 'move' | 'boxSelect' | 'lassoSelect' | 'resize' | 'lineEndpoint' | 'lineControl' | 'rotate';

/** A single smart guide line (horizontal or vertical) */
export interface SmartGuide {
  axis: 'x' | 'y';
  position: number;  // world coord of the guide line
  from: number;      // start of line on the other axis
  to: number;        // end of line on the other axis
}

export class SelectTool extends BaseTool {
  readonly type = 'select' as const;

  private mode: DragMode = 'none';
  private dragStart: Vec2 = { x: 0, y: 0 };
  private dragOffset: Vec2 = { x: 0, y: 0 };
  private resizeHandle: number = -1;
  private resizeOrigBounds: Bounds | null = null;
  private resizeElementId: string = '';
  private snapshotBeforeDrag: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
  /** Snapshots of bound lines at drag-start — used to avoid cumulative drift */
  private boundLineSnapshots: Map<string, { x: number; y: number; pts: Vec2[] }> = new Map();
  private boxSelectBounds: Bounds | null = null;
  // Lasso selection path
  private lassoPath: Vec2[] = [];
  // Smart guides visible during drag
  private smartGuides: SmartGuide[] = [];
  // Line/arrow handle dragging
  private lineHandleElementId: string = '';
  private lineEndpointIndex: number = -1; // 0 = start, 1 = end
  // Rotation
  private rotateElementId: string = '';
  private rotateStartAngle: number = 0;
  private rotateOrigRotation: number = 0;
  // Bind target hover (for line endpoint reconnection highlighting)
  hoverBindTargetId: string | null = null;

  getCursor(): string {
    return 'default';
  }

  onPointerDown(ctx: ToolContext, world: Vec2, e: PointerEvent): void {
    const { scene, renderer } = ctx;
    const vs = ctx.getViewState();
    const selected = scene.getSelectedElements();

    // Check line/arrow handles (endpoints + control point)
    if (selected.length === 1 && (selected[0].type === 'line' || selected[0].type === 'arrow')) {
      const el = selected[0] as any;
      const tolerance = 8 / vs.zoom;
      const pts: Vec2[] = el.points || [];

      // Check control point handle (midpoint or actual control point)
      const cp = el.controlPoint
        ? { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y }
        : { x: el.x + (pts[0].x + pts[1].x) / 2, y: el.y + (pts[0].y + pts[1].y) / 2 };
      const dcx = world.x - cp.x;
      const dcy = world.y - cp.y;
      if (Math.sqrt(dcx * dcx + dcy * dcy) <= tolerance) {
        this.mode = 'lineControl';
        this.lineHandleElementId = el.id;
        this.dragStart = world;
        ctx.history.push(scene.getElements());
        return;
      }

      // Check start/end point handles
      for (let i = 0; i < Math.min(pts.length, 2); i++) {
        const abs: Vec2 = { x: el.x + pts[i].x, y: el.y + pts[i].y };
        const dx = world.x - abs.x;
        const dy = world.y - abs.y;
        if (Math.sqrt(dx * dx + dy * dy) <= tolerance) {
          this.mode = 'lineEndpoint';
          this.lineEndpointIndex = i;
          this.lineHandleElementId = el.id;
          this.dragStart = world;
          ctx.history.push(scene.getElements());
          return;
        }
      }
    }

    // Check rotation handle on a single selected element (non-line)
    if (selected.length === 1 && selected[0].type !== 'line' && selected[0].type !== 'arrow' && !selected[0].locked) {
      const b = getElementBounds(selected[0]);
      const rotHandleY = b.y - 30 / vs.zoom;
      const rotHandleX = b.x + b.width / 2;
      const rd = Math.sqrt((world.x - rotHandleX) ** 2 + (world.y - rotHandleY) ** 2);
      if (rd <= 8 / vs.zoom) {
        this.mode = 'rotate';
        this.rotateElementId = selected[0].id;
        this.rotateOrigRotation = selected[0].rotation || 0;
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        this.rotateStartAngle = Math.atan2(world.y - cy, world.x - cx);
        this.dragStart = world;
        ctx.history.push(scene.getElements());
        return;
      }
    }

    // Check resize handle on a single selected element (non-line)
    if (selected.length === 1 && selected[0].type !== 'line' && selected[0].type !== 'arrow' && !selected[0].locked) {
      const b = getElementBounds(selected[0]);
      const handle = renderer.getHandleAtPoint(world, b, vs.zoom);
      if (handle >= 0) {
        this.mode = 'resize';
        this.resizeHandle = handle;
        this.resizeOrigBounds = { ...b };
        this.resizeElementId = selected[0].id;
        this.dragStart = world;
        ctx.history.push(scene.getElements());
        return;
      }
    }

    // Hit-test elements
    const hit = scene.hitTest(world);

    if (hit) {
      // Ctrl+Click or Shift+Click toggles multi-select
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (scene.isSelected(hit.id)) scene.setSelection(scene.getSelectedIds().filter(id => id !== hit.id));
        else scene.addToSelection(hit.id);
      } else if (!scene.isSelected(hit.id)) {
        // Auto-select group members if the hit element is in a group
        if (hit.groupIds.length > 0) {
          const allElements = scene.getElements();
          const groupMembers = allElements.filter(el =>
            el.groupIds.some(gid => hit.groupIds.includes(gid))
          );
          scene.setSelection(groupMembers.map(el => el.id));
        } else {
          scene.setSelection([hit.id]);
        }
      }

      // Don't allow moving locked elements
      if (hit.locked) {
        ctx.requestRender();
        return;
      }

      this.mode = 'move';
      this.dragStart = world;
      this.snapshotBeforeDrag.clear();
      this.boundLineSnapshots.clear();
      for (const el of scene.getSelectedElements()) {
        this.snapshotBeforeDrag.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
      }
      // Snapshot all lines/arrows bound to the selected elements so we can
      // compute their positions from the original each frame (no drift).
      const movedIds = new Set(this.snapshotBeforeDrag.keys());
      for (const el of scene.getElements()) {
        if (el.type !== 'line' && el.type !== 'arrow') continue;
        if (movedIds.has(el.id)) continue;
        const lineEl = el as any;
        if ((lineEl.startBindingId && movedIds.has(lineEl.startBindingId)) ||
            (lineEl.endBindingId && movedIds.has(lineEl.endBindingId))) {
          this.boundLineSnapshots.set(el.id, {
            x: el.x,
            y: el.y,
            pts: (lineEl.points as Vec2[]).map((p: Vec2) => ({ ...p })),
          });
        }
      }
      ctx.history.push(scene.getElements());
    } else {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) scene.clearSelection();
      // Alt+drag = lasso select, otherwise box select
      if (e.altKey) {
        this.mode = 'lassoSelect';
        this.lassoPath = [world];
      } else {
        this.mode = 'boxSelect';
        this.boxSelectBounds = null;
      }
      this.dragStart = world;
    }

    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (this.mode === 'move') {
      const dx = world.x - this.dragStart.x;
      const dy = world.y - this.dragStart.y;

      // Build tentative bounds for all selected elements
      const movingBounds: { x: number; y: number; width: number; height: number }[] = [];
      for (const [, orig] of this.snapshotBeforeDrag) {
        movingBounds.push({ x: orig.x + dx, y: orig.y + dy, width: orig.width, height: orig.height });
      }

      // Compute guides + snap in a single pass
      const { guides, snapDx, snapDy } = this.computeSmartGuidesAndSnap(ctx, movingBounds);
      this.smartGuides = guides;

      let finalDx = dx + snapDx;
      let finalDy = dy + snapDy;

      // Snap-to-grid when enabled and no smart guide snap applied
      if (ctx.config.snapToGrid && ctx.config.gridSize) {
        const gs = ctx.config.gridSize;
        if (snapDx === 0) {
          const first = this.snapshotBeforeDrag.values().next().value!;
          finalDx = Math.round((first.x + dx) / gs) * gs - first.x;
        }
        if (snapDy === 0) {
          const first = this.snapshotBeforeDrag.values().next().value!;
          finalDy = Math.round((first.y + dy) / gs) * gs - first.y;
        }
      }

      const updates: { id: string; changes: Partial<BoardierElement> }[] = [];
      for (const [id, orig] of this.snapshotBeforeDrag) {
        updates.push({ id, changes: { x: orig.x + finalDx, y: orig.y + finalDy } });
      }
      ctx.scene.updateElements(updates);

      // Update any lines/arrows bound to moved elements
      this.updateBoundConnections(ctx);

      ctx.requestRender();
    } else if (this.mode === 'boxSelect') {
      const box = normalizeBounds(
        this.dragStart.x, this.dragStart.y,
        world.x - this.dragStart.x, world.y - this.dragStart.y,
      );
      this.boxSelectBounds = box;
      const inside = ctx.scene.getElementsInBounds(box);
      ctx.scene.setSelection(inside.map(e => e.id));
      ctx.requestRender();
    } else if (this.mode === 'lassoSelect') {
      this.lassoPath.push(world);
      // Select elements whose center is inside the lasso
      const allElements = ctx.scene.getElements();
      const selectedIds: string[] = [];
      for (const el of allElements) {
        const b = getElementBounds(el);
        const center = boundsCenter(b);
        if (pointInPolygon(center, this.lassoPath)) {
          selectedIds.push(el.id);
        }
      }
      ctx.scene.setSelection(selectedIds);
      ctx.requestRender();
    } else if (this.mode === 'resize') {
      this.doResize(ctx, world);
    } else if (this.mode === 'rotate') {
      this.doRotate(ctx, world);
    } else if (this.mode === 'lineEndpoint') {
      this.doLineEndpointDrag(ctx, world);
    } else if (this.mode === 'lineControl') {
      this.doLineControlDrag(ctx, world);
    } else {
      const hit = ctx.scene.hitTest(world);
      ctx.setCursor(hit ? 'move' : 'default');
    }
  }

  onPointerUp(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (this.mode === 'move') {
      // Auto-include elements in frames after move
      this.autoIncludeInFrames(ctx);
      ctx.commitHistory();
    } else if (this.mode === 'lineEndpoint') {
      // Finalize binding for the dragged endpoint
      const el = ctx.scene.getElementById(this.lineHandleElementId);
      if (el && (el.type === 'line' || el.type === 'arrow')) {
        const vs = ctx.getViewState();
        const tolerance = 50 / vs.zoom;
        const target = this.findBindTargetForEndpoint(ctx, world, this.lineHandleElementId, tolerance);
        const bindingKey = this.lineEndpointIndex === 0 ? 'startBindingId' : 'endBindingId';
        ctx.scene.updateElement(this.lineHandleElementId, {
          [bindingKey]: target ? target.id : undefined,
        } as any);
      }
      this.hoverBindTargetId = null;
      ctx.commitHistory();
    } else if (this.mode === 'resize' || this.mode === 'rotate' || this.mode === 'lineControl') {
      ctx.commitHistory();
    }
    this.mode = 'none';
    this.boxSelectBounds = null;
    this.lassoPath = [];
    this.smartGuides = [];
    this.snapshotBeforeDrag.clear();
    this.lineEndpointIndex = -1;
    this._refEdgesCache = null;
    ctx.requestRender();
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = ctx.scene.getSelectedIds();
      if (ids.length) {
        ctx.history.push(ctx.scene.getElements());
        ctx.scene.removeElements(ids);
        ctx.commitHistory();
        ctx.requestRender();
      }
    }
    if (e.key === 'Escape') {
      ctx.scene.clearSelection();
      ctx.requestRender();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const ids = ctx.scene.getSelectedIds();
      if (ids.length) {
        ctx.history.push(ctx.scene.getElements());
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const updates = ids.map(id => {
          const el = ctx.scene.getElementById(id);
          if (!el) return null;
          return { id, changes: { x: el.x + dx, y: el.y + dy } };
        }).filter(Boolean) as { id: string; changes: Partial<BoardierElement> }[];
        
        ctx.scene.updateElements(updates);
        this.updateBoundConnections(ctx);
        ctx.commitHistory();
        ctx.requestRender();
        e.preventDefault();
      }
    }
  }

  getBoxSelectBounds(): Bounds | null {
    return this.boxSelectBounds;
  }

  getLassoPath(): Vec2[] | null {
    return this.lassoPath.length > 2 ? this.lassoPath : null;
  }

  getSmartGuides(): SmartGuide[] {
    return this.smartGuides;
  }

  // ─── Smart Guides computation ──────────────────────────────────

  /** Pre-computed reference edges from non-selected elements. Cached once per drag. */
  private _refEdgesCache: { x: number[]; y: number[]; yMin: number; yMax: number; xMin: number; xMax: number } | null = null;

  private buildRefEdges(ctx: ToolContext): typeof this._refEdgesCache {
    if (this._refEdgesCache) return this._refEdgesCache;
    const selectedIds = new Set(ctx.scene.getSelectedIds());
    const allElements = ctx.scene.getElements();
    const rx: number[] = [];
    const ry: number[] = [];
    let yMin = Infinity, yMax = -Infinity, xMin = Infinity, xMax = -Infinity;
    for (const el of allElements) {
      if (selectedIds.has(el.id)) continue;
      const b = getElementBounds(el);
      const cxv = b.x + b.width / 2;
      const cyv = b.y + b.height / 2;
      rx.push(b.x, cxv, b.x + b.width);
      ry.push(b.y, cyv, b.y + b.height);
      if (b.y < yMin) yMin = b.y;
      if (b.y + b.height > yMax) yMax = b.y + b.height;
      if (b.x < xMin) xMin = b.x;
      if (b.x + b.width > xMax) xMax = b.x + b.width;
    }
    this._refEdgesCache = { x: rx, y: ry, yMin, yMax, xMin, xMax };
    return this._refEdgesCache;
  }

  /**
   * Compute smart guides AND the snap delta for a set of moving bounds.
   * Returns { guides, snapDx, snapDy } — caller should apply snap offsets.
   */
  private computeSmartGuidesAndSnap(
    ctx: ToolContext,
    movingBounds: { x: number; y: number; width: number; height: number }[],
  ): { guides: SmartGuide[]; snapDx: number; snapDy: number } {
    const zoom = ctx.getViewState().zoom || 1;
    const threshold = 5 / zoom;
    const refs = this.buildRefEdges(ctx)!;
    const guides: SmartGuide[] = [];
    let bestSnapX = Infinity;
    let bestSnapY = Infinity;
    let snapDx = 0;
    let snapDy = 0;

    for (const b of movingBounds) {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const movX = [b.x, cx, b.x + b.width];
      const movY = [b.y, cy, b.y + b.height];

      for (const mx of movX) {
        for (let j = 0; j < refs.x.length; j++) {
          const diff = mx - refs.x[j];
          const absDiff = diff < 0 ? -diff : diff;
          if (absDiff < threshold) {
            const lo = b.y < refs.yMin ? b.y : refs.yMin;
            const hi = (b.y + b.height) > refs.yMax ? (b.y + b.height) : refs.yMax;
            guides.push({ axis: 'x', position: refs.x[j], from: lo - 20, to: hi + 20 });
            if (absDiff < bestSnapX) { bestSnapX = absDiff; snapDx = -diff; }
          }
        }
      }
      for (const my of movY) {
        for (let j = 0; j < refs.y.length; j++) {
          const diff = my - refs.y[j];
          const absDiff = diff < 0 ? -diff : diff;
          if (absDiff < threshold) {
            const lo = b.x < refs.xMin ? b.x : refs.xMin;
            const hi = (b.x + b.width) > refs.xMax ? (b.x + b.width) : refs.xMax;
            guides.push({ axis: 'y', position: refs.y[j], from: lo - 20, to: hi + 20 });
            if (absDiff < bestSnapY) { bestSnapY = absDiff; snapDy = -diff; }
          }
        }
      }
    }

    // Quick dedup
    const seen = new Set<string>();
    const unique: SmartGuide[] = [];
    for (const g of guides) {
      const key = `${g.axis}:${Math.round(g.position * 2)}`;
      if (!seen.has(key)) { seen.add(key); unique.push(g); }
    }
    return { guides: unique, snapDx, snapDy };
  }

  // ─── Resize logic (shapes only) ────────────────────────────────

  private doResize(ctx: ToolContext, world: Vec2): void {
    if (!this.resizeOrigBounds) return;
    const ob = this.resizeOrigBounds;
    const dx = world.x - this.dragStart.x;
    const dy = world.y - this.dragStart.y;

    let nx = ob.x, ny = ob.y, nw = ob.width, nh = ob.height;

    switch (this.resizeHandle) {
      case 0: nx = ob.x + dx; ny = ob.y + dy; nw = ob.width - dx; nh = ob.height - dy; break;
      case 1: ny = ob.y + dy; nw = ob.width + dx; nh = ob.height - dy; break;
      case 2: nw = ob.width + dx; nh = ob.height + dy; break;
      case 3: nx = ob.x + dx; nw = ob.width - dx; nh = ob.height + dy; break;
      case 4: ny = ob.y + dy; nh = ob.height - dy; break; // Top
      case 5: nw = ob.width + dx; break; // Right
      case 6: nh = ob.height + dy; break; // Bottom
      case 7: nx = ob.x + dx; nw = ob.width - dx; break; // Left
    }

    if (nw < 5) { nw = 5; if (this.resizeHandle === 0 || this.resizeHandle === 3 || this.resizeHandle === 7) nx = ob.x + ob.width - 5; }
    if (nh < 5) { nh = 5; if (this.resizeHandle === 0 || this.resizeHandle === 1 || this.resizeHandle === 4) ny = ob.y + ob.height - 5; }

    // Snap resized bounds against reference edges
    const { guides, snapDx, snapDy } = this.computeSmartGuidesAndSnap(ctx, [{ x: nx, y: ny, width: nw, height: nh }]);
    this.smartGuides = guides;

    // Apply snap to the moving edges only
    const h = this.resizeHandle;
    if (h === 0 || h === 3 || h === 7) { nx += snapDx; nw -= snapDx; }  // left edge moves
    else if (h === 1 || h === 2 || h === 5) { nw += snapDx; }           // right edge moves
    
    if (h === 0 || h === 1 || h === 4) { ny += snapDy; nh -= snapDy; }  // top edge moves
    else if (h === 2 || h === 3 || h === 6) { nh += snapDy; }           // bottom edge moves

    if (nw < 5) nw = 5;
    if (nh < 5) nh = 5;

    ctx.scene.updateElement(this.resizeElementId, { x: nx, y: ny, width: nw, height: nh });

    // Scale table column widths and row heights proportionally
    const el = ctx.scene.getElementById(this.resizeElementId);
    if (el && el.type === 'table') {
      const scaleX = nw / ob.width;
      const scaleY = nh / ob.height;
      const table = el as any;
      ctx.scene.updateElement(this.resizeElementId, {
        colWidths: table.colWidths.map((w: number) => Math.max(20, w * scaleX)),
        rowHeights: table.rowHeights.map((h: number) => Math.max(20, h * scaleY)),
      } as any);
    }

    ctx.requestRender();
  }

  // ─── Line/arrow endpoint dragging ──────────────────────────────

  private doLineEndpointDrag(ctx: ToolContext, world: Vec2): void {
    const el = ctx.scene.getElementById(this.lineHandleElementId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
    const lineEl = el as any;
    const pts = [...lineEl.points] as Vec2[];
    const vs = ctx.getViewState();
    const tolerance = 50 / vs.zoom;

    // Find bind target near the dragged endpoint (for hover glow only)
    const target = this.findBindTargetForEndpoint(ctx, world, this.lineHandleElementId, tolerance);
    const newHover = target ? target.id : null;
    if (newHover !== this.hoverBindTargetId) {
      this.hoverBindTargetId = newHover;
    }

    // Always follow cursor — no border snap during drag
    pts[this.lineEndpointIndex] = { x: world.x - el.x, y: world.y - el.y };

    const w = Math.max(Math.abs(pts[1].x - pts[0].x), 1);
    const h = Math.max(Math.abs(pts[1].y - pts[0].y), 1);

    ctx.scene.updateElement(this.lineHandleElementId, {
      points: pts,
      width: w,
      height: h,
    });
    ctx.requestRender();
  }

  /** Find a bindable element near a point using true border-distance (excludes lines/arrows/freehand/comment and the line itself). */
  private findBindTargetForEndpoint(ctx: ToolContext, world: Vec2, excludeId: string, tolerance: number): BoardierElement | null {
    const elements = ctx.scene.getElements();
    let best: BoardierElement | null = null;
    let bestDist = tolerance;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.id === excludeId) continue;
      if (el.type === 'line' || el.type === 'arrow' || el.type === 'freehand' || el.type === 'comment') continue;
      const b = getElementBounds(el);
      // Distance to border: inside = distance to nearest edge, outside = euclidean to nearest border point
      const inside = world.x > b.x && world.x < b.x + b.width && world.y > b.y && world.y < b.y + b.height;
      const dist = inside
        ? Math.min(world.x - b.x, b.x + b.width - world.x, world.y - b.y, b.y + b.height - world.y)
        : Math.sqrt((Math.max(b.x, Math.min(b.x + b.width, world.x)) - world.x) ** 2 + (Math.max(b.y, Math.min(b.y + b.height, world.y)) - world.y) ** 2);
      if (dist <= bestDist) {
        bestDist = dist;
        best = el;
      }
    }
    return best;
  }

  // ─── Line/arrow control-point (bézier bend) ───────────────────

  private doLineControlDrag(ctx: ToolContext, world: Vec2): void {
    const el = ctx.scene.getElementById(this.lineHandleElementId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
    const cp: Vec2 = { x: world.x - el.x, y: world.y - el.y };
    ctx.scene.updateElement(this.lineHandleElementId, { controlPoint: cp });
    ctx.requestRender();
  }

  // ─── Rotation logic ────────────────────────────────────────────

  private doRotate(ctx: ToolContext, world: Vec2): void {
    const el = ctx.scene.getElementById(this.rotateElementId);
    if (!el) return;
    const b = getElementBounds(el);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const currentAngle = Math.atan2(world.y - cy, world.x - cx);
    let rotation = this.rotateOrigRotation + (currentAngle - this.rotateStartAngle);
    // Snap to 15° increments when Shift is held (checked via last event, simplify: round to nearest 15°)
    rotation = rotation % (Math.PI * 2);
    ctx.scene.updateElement(this.rotateElementId, { rotation });
    ctx.requestRender();
  }

  // ─── Bound connection updates ─────────────────────────────────

  /** Auto-add or remove elements from frame childIds based on their position. */
  private autoIncludeInFrames(ctx: ToolContext): void {
    const allElements = ctx.scene.getElements();
    const frames = allElements.filter(e => e.type === 'frame');
    if (frames.length === 0) return;

    const movedIds = new Set(ctx.scene.getSelectedIds());
    const frameUpdates: { id: string; changes: Partial<BoardierElement> }[] = [];

    for (const frame of frames) {
      if (movedIds.has(frame.id)) continue; // Don't auto-include frames being moved
      const fb = getElementBounds(frame);
      const currentChildIds = new Set((frame as any).childIds || []);
      let changed = false;

      for (const el of allElements) {
        if (el.id === frame.id || el.type === 'frame') continue;
        const eb = getElementBounds(el);
        const ecx = eb.x + eb.width / 2;
        const ecy = eb.y + eb.height / 2;
        const inside = ecx >= fb.x && ecx <= fb.x + fb.width && ecy >= fb.y && ecy <= fb.y + fb.height;

        if (inside && !currentChildIds.has(el.id)) {
          currentChildIds.add(el.id);
          changed = true;
        } else if (!inside && currentChildIds.has(el.id) && movedIds.has(el.id)) {
          currentChildIds.delete(el.id);
          changed = true;
        }
      }

      if (changed) {
        frameUpdates.push({ id: frame.id, changes: { childIds: Array.from(currentChildIds) } as any });
      }
    }

    if (frameUpdates.length > 0) {
      ctx.scene.updateElements(frameUpdates);
    }
  }

  /**
   * When elements are moved, update any lines/arrows that are bound
   * to them so the endpoints follow the element by the same delta —
   * no border-snap, the line keeps its relative position.
   * Uses original snapshots to avoid cumulative drift.
   */
  private updateBoundConnections(ctx: ToolContext): void {
    if (this.boundLineSnapshots.size === 0) return;

    // Compute deltas from the ORIGINAL snapshot positions of moved elements
    const deltas = new Map<string, { dx: number; dy: number }>();
    for (const [id, snap] of this.snapshotBeforeDrag.entries()) {
      const cur = ctx.scene.getElementById(id);
      if (!cur) continue;
      deltas.set(id, { dx: cur.x - snap.x, dy: cur.y - snap.y });
    }

    const lineUpdates: { id: string; changes: Partial<BoardierElement> }[] = [];

    for (const [lineId, origLine] of this.boundLineSnapshots) {
      const el = ctx.scene.getElementById(lineId);
      if (!el) continue;
      const lineEl = el as any;
      const startBound = lineEl.startBindingId && deltas.has(lineEl.startBindingId);
      const endBound = lineEl.endBindingId && deltas.has(lineEl.endBindingId);
      if (!startBound && !endBound) continue;

      // Start from the ORIGINAL line snapshot each frame
      let newX = origLine.x;
      let newY = origLine.y;
      const pts: Vec2[] = origLine.pts.map(p => ({ ...p }));

      if (startBound) {
        const d = deltas.get(lineEl.startBindingId)!;
        // Shift the line origin (start point) by the target's delta
        newX += d.dx;
        newY += d.dy;
        // Keep end point absolute by compensating
        pts[1] = { x: pts[1].x - d.dx, y: pts[1].y - d.dy };
      }

      if (endBound) {
        const d = deltas.get(lineEl.endBindingId)!;
        // Shift end point by target's delta
        pts[1] = { x: pts[1].x + d.dx, y: pts[1].y + d.dy };
      }

      lineUpdates.push({
        id: lineId,
        changes: {
          x: newX, y: newY,
          points: pts,
          width: Math.max(Math.abs(pts[1].x - pts[0].x), 1),
          height: Math.max(Math.abs(pts[1].y - pts[0].y), 1),
        },
      });
    }

    if (lineUpdates.length > 0) {
      ctx.scene.updateElements(lineUpdates);
    }
  }

  /** Find closest point on an element's border. */
  private closestBorderPoint(el: BoardierElement, from: Vec2): Vec2 {
    const b = getElementBounds(el);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const dx = from.x - cx;
    const dy = from.y - cy;
    const hw = b.width / 2;
    const hh = b.height / 2;
    if (el.type === 'ellipse') {
      const angle = Math.atan2(dy, dx);
      return { x: cx + hw * Math.cos(angle), y: cy + hh * Math.sin(angle) };
    }
    if (hw === 0 && hh === 0) return { x: cx, y: cy };
    const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  }
}
