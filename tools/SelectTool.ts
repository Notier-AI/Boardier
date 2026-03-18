import type { Vec2, Bounds, BoardierElement } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { getElementBounds } from '../elements/base';
import { normalizeBounds } from '../utils/math';

type DragMode = 'none' | 'move' | 'boxSelect' | 'resize' | 'lineEndpoint' | 'lineControl';

export class SelectTool extends BaseTool {
  readonly type = 'select' as const;

  private mode: DragMode = 'none';
  private dragStart: Vec2 = { x: 0, y: 0 };
  private dragOffset: Vec2 = { x: 0, y: 0 };
  private resizeHandle: number = -1;
  private resizeOrigBounds: Bounds | null = null;
  private resizeElementId: string = '';
  private snapshotBeforeDrag: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
  private boxSelectBounds: Bounds | null = null;
  // Line/arrow handle dragging
  private lineHandleElementId: string = '';
  private lineEndpointIndex: number = -1; // 0 = start, 1 = end

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

    // Check resize handle on a single selected element (non-line)
    if (selected.length === 1 && selected[0].type !== 'line' && selected[0].type !== 'arrow') {
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
      if (e.shiftKey) {
        if (scene.isSelected(hit.id)) scene.setSelection(scene.getSelectedIds().filter(id => id !== hit.id));
        else scene.addToSelection(hit.id);
      } else if (!scene.isSelected(hit.id)) {
        scene.setSelection([hit.id]);
      }

      this.mode = 'move';
      this.dragStart = world;
      this.snapshotBeforeDrag.clear();
      for (const el of scene.getSelectedElements()) {
        this.snapshotBeforeDrag.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
      }
      ctx.history.push(scene.getElements());
    } else {
      if (!e.shiftKey) scene.clearSelection();
      this.mode = 'boxSelect';
      this.dragStart = world;
      this.boxSelectBounds = null;
    }

    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (this.mode === 'move') {
      const dx = world.x - this.dragStart.x;
      const dy = world.y - this.dragStart.y;
      const updates: { id: string; changes: Partial<BoardierElement> }[] = [];
      for (const [id, orig] of this.snapshotBeforeDrag) {
        updates.push({ id, changes: { x: orig.x + dx, y: orig.y + dy } });
      }
      ctx.scene.updateElements(updates);
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
    } else if (this.mode === 'resize') {
      this.doResize(ctx, world);
    } else if (this.mode === 'lineEndpoint') {
      this.doLineEndpointDrag(ctx, world);
    } else if (this.mode === 'lineControl') {
      this.doLineControlDrag(ctx, world);
    } else {
      const hit = ctx.scene.hitTest(world);
      ctx.setCursor(hit ? 'move' : 'default');
    }
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    if (this.mode === 'move' || this.mode === 'resize' || this.mode === 'lineEndpoint' || this.mode === 'lineControl') {
      ctx.commitHistory();
    }
    this.mode = 'none';
    this.boxSelectBounds = null;
    this.snapshotBeforeDrag.clear();
    this.lineEndpointIndex = -1;
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
  }

  getBoxSelectBounds(): Bounds | null {
    return this.boxSelectBounds;
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
    }

    if (nw < 5) { nw = 5; if (this.resizeHandle === 0 || this.resizeHandle === 3) nx = ob.x + ob.width - 5; }
    if (nh < 5) { nh = 5; if (this.resizeHandle === 0 || this.resizeHandle === 1) ny = ob.y + ob.height - 5; }

    ctx.scene.updateElement(this.resizeElementId, { x: nx, y: ny, width: nw, height: nh });
    ctx.requestRender();
  }

  // ─── Line/arrow endpoint dragging ──────────────────────────────

  private doLineEndpointDrag(ctx: ToolContext, world: Vec2): void {
    const el = ctx.scene.getElementById(this.lineHandleElementId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
    const pts = [...(el as any).points] as Vec2[];
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

  // ─── Line/arrow control-point (bézier bend) ───────────────────

  private doLineControlDrag(ctx: ToolContext, world: Vec2): void {
    const el = ctx.scene.getElementById(this.lineHandleElementId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
    const cp: Vec2 = { x: world.x - el.x, y: world.y - el.y };
    ctx.scene.updateElement(this.lineHandleElementId, { controlPoint: cp });
    ctx.requestRender();
  }
}
