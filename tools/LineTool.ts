import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createLine, createArrow } from '../elements/base';

/**
 * Click-drag line / arrow tool.
 * Press to set start, drag to set end, release to finish.
 * A control point is created at the midpoint — the user can drag it in
 * the SelectTool to curve the line (quadratic bézier), just like Excalidraw.
 */
export class LineTool extends BaseTool {
  readonly type;
  private isArrow: boolean;
  private activeId: string | null = null;
  private originPos: Vec2 = { x: 0, y: 0 };
  private drawing = false;

  constructor(toolType: 'line' | 'arrow') {
    super();
    this.type = toolType;
    this.isArrow = toolType === 'arrow';
  }

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.originPos = world;
    this.drawing = true;

    const defaults = ctx.theme.elementDefaults;
    const el = this.isArrow
      ? createArrow({
          x: world.x, y: world.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          controlPoint: null,
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
        })
      : createLine({
          x: world.x, y: world.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          controlPoint: null,
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
        });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    ctx.scene.setSelection([el.id]);
    this.activeId = el.id;
    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const rel: Vec2 = { x: world.x - this.originPos.x, y: world.y - this.originPos.y };
    const w = Math.max(Math.abs(rel.x), 1);
    const h = Math.max(Math.abs(rel.y), 1);
    ctx.scene.updateElement(this.activeId, {
      points: [{ x: 0, y: 0 }, rel],
      width: w,
      height: h,
    });
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) {
      this.drawing = false;
      this.activeId = null;
      return;
    }
    const pts = (el as any).points as Vec2[];
    const dx = pts[1].x;
    const dy = pts[1].y;
    // Remove zero-length lines
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      ctx.scene.removeElement(this.activeId);
    } else {
      ctx.commitHistory();
    }
    this.drawing = false;
    this.activeId = null;
    ctx.setToolType('select');
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.drawing && this.activeId) {
      ctx.scene.removeElement(this.activeId);
      this.drawing = false;
      this.activeId = null;
      ctx.requestRender();
    }
  }

  onDeactivate(ctx: ToolContext): void {
    if (this.drawing && this.activeId) {
      const el = ctx.scene.getElementById(this.activeId);
      if (el) {
        const pts = (el as any).points as Vec2[];
        if (Math.abs(pts[1].x) < 3 && Math.abs(pts[1].y) < 3) {
          ctx.scene.removeElement(this.activeId);
        } else {
          ctx.commitHistory();
        }
      }
      this.drawing = false;
      this.activeId = null;
    }
  }
}
