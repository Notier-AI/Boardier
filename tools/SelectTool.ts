import type { Vec2, Bounds, BoardierElement } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { getElementBounds } from '../elements/base';
import { normalizeBounds } from '../utils/math';

type DragMode = 'none' | 'move' | 'boxSelect' | 'resize';

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

  getCursor(): string {
    return 'default';
  }

  onPointerDown(ctx: ToolContext, world: Vec2, e: PointerEvent): void {
    const { scene, renderer } = ctx;
    const vs = ctx.getViewState();
    const selected = scene.getSelectedElements();

    // Check resize handle on a single selected element
    if (selected.length === 1) {
      const b = getElementBounds(selected[0]);
      const handle = renderer.getHandleAtPoint(world, b, vs.zoom);
      if (handle >= 0) {
        this.mode = 'resize';
        this.resizeHandle = handle;
        this.resizeOrigBounds = { ...b };
        this.resizeElementId = selected[0].id;
        this.dragStart = world;
        // Save before-state for history
        ctx.history.push(scene.getElements());
        return;
      }
    }

    // Hit-test elements
    const hit = scene.hitTest(world);

    if (hit) {
      if (e.shiftKey) {
        // Toggle selection
        if (scene.isSelected(hit.id)) scene.setSelection(scene.getSelectedIds().filter(id => id !== hit.id));
        else scene.addToSelection(hit.id);
      } else if (!scene.isSelected(hit.id)) {
        scene.setSelection([hit.id]);
      }

      // Start move
      this.mode = 'move';
      this.dragStart = world;
      this.snapshotBeforeDrag.clear();
      for (const el of scene.getSelectedElements()) {
        this.snapshotBeforeDrag.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
      }
      ctx.history.push(scene.getElements());
    } else {
      // Clicked empty — start box select
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
      // Highlight elements in the box
      const inside = ctx.scene.getElementsInBounds(box);
      ctx.scene.setSelection(inside.map(e => e.id));
      ctx.requestRender();
    } else if (this.mode === 'resize') {
      this.doResize(ctx, world);
    } else {
      // Hover cursor
      const hit = ctx.scene.hitTest(world);
      ctx.setCursor(hit ? 'move' : 'default');
    }
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    if (this.mode === 'move' || this.mode === 'resize') {
      ctx.commitHistory();
    }
    this.mode = 'none';
    this.boxSelectBounds = null;
    this.snapshotBeforeDrag.clear();
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

  /** Returns the current box-select bounds (for rendering overlay). */
  getBoxSelectBounds(): Bounds | null {
    return this.boxSelectBounds;
  }

  // ─── Resize logic ─────────────────────────────────────────────────

  private doResize(ctx: ToolContext, world: Vec2): void {
    if (!this.resizeOrigBounds) return;
    const ob = this.resizeOrigBounds;
    const dx = world.x - this.dragStart.x;
    const dy = world.y - this.dragStart.y;

    let nx = ob.x, ny = ob.y, nw = ob.width, nh = ob.height;

    switch (this.resizeHandle) {
      case 0: // top-left
        nx = ob.x + dx; ny = ob.y + dy; nw = ob.width - dx; nh = ob.height - dy;
        break;
      case 1: // top-right
        ny = ob.y + dy; nw = ob.width + dx; nh = ob.height - dy;
        break;
      case 2: // bottom-right
        nw = ob.width + dx; nh = ob.height + dy;
        break;
      case 3: // bottom-left
        nx = ob.x + dx; nw = ob.width - dx; nh = ob.height + dy;
        break;
    }

    // Enforce minimum size
    if (nw < 5) { nw = 5; if (this.resizeHandle === 0 || this.resizeHandle === 3) nx = ob.x + ob.width - 5; }
    if (nh < 5) { nh = 5; if (this.resizeHandle === 0 || this.resizeHandle === 1) ny = ob.y + ob.height - 5; }

    ctx.scene.updateElement(this.resizeElementId, { x: nx, y: ny, width: nw, height: nh });
    ctx.requestRender();
  }
}
