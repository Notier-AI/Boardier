import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createLine, createArrow } from '../elements/base';

/**
 * Multi-point line / arrow tool.
 * Click to place points, double-click or Enter to finish.
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

  onPointerDown(ctx: ToolContext, world: Vec2, e: PointerEvent): void {
    if (!this.drawing) {
      // Start a new line with first two points (second is rubber-banded)
      this.originPos = world;
      this.drawing = true;

      const defaults = ctx.theme.elementDefaults;
      const el = this.isArrow
        ? createArrow({
            x: world.x, y: world.y, width: 0, height: 0,
            points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
            strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
          })
        : createLine({
            x: world.x, y: world.y, width: 0, height: 0,
            points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
            strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
          });

      ctx.history.push(ctx.scene.getElements());
      ctx.scene.addElement(el);
      ctx.scene.setSelection([el.id]);
      this.activeId = el.id;
      ctx.requestRender();
    } else if (this.activeId) {
      // Add a new point at current position
      const el = ctx.scene.getElementById(this.activeId);
      if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
      const pts = [...(el as any).points];
      // Fix the rubber-band point and add a new rubber-band
      const rel: Vec2 = { x: world.x - this.originPos.x, y: world.y - this.originPos.y };
      pts[pts.length - 1] = rel;
      pts.push({ ...rel }); // new rubber-band point
      this.updateLineFromPoints(ctx, pts);
      ctx.requestRender();
    }
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
    const pts = [...(el as any).points];
    const rel: Vec2 = { x: world.x - this.originPos.x, y: world.y - this.originPos.y };
    pts[pts.length - 1] = rel;
    this.updateLineFromPoints(ctx, pts);
    ctx.requestRender();
  }

  onPointerUp(_ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    // Nothing — point is committed on next click or finish
  }

  /** Finish the line on double-click. */
  onDoubleClick(ctx: ToolContext, _world: Vec2): void {
    this.finishLine(ctx);
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      this.finishLine(ctx);
    }
    if (e.key === 'Escape' && this.drawing && this.activeId) {
      ctx.scene.removeElement(this.activeId);
      this.drawing = false;
      this.activeId = null;
      ctx.requestRender();
    }
  }

  onDeactivate(ctx: ToolContext): void {
    if (this.drawing && this.activeId) {
      this.finishLine(ctx);
    }
  }

  private finishLine(ctx: ToolContext): void {
    if (!this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) return;
    const pts = [...(el as any).points];
    // Remove the rubber-band point if it duplicates the previous
    if (pts.length > 2) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      if (Math.abs(last.x - prev.x) < 2 && Math.abs(last.y - prev.y) < 2) {
        pts.pop();
      }
    }
    if (pts.length < 2 || (pts.length === 2 && Math.abs(pts[1].x) < 2 && Math.abs(pts[1].y) < 2)) {
      ctx.scene.removeElement(this.activeId);
    } else {
      this.updateLineFromPoints(ctx, pts);
      ctx.commitHistory();
    }
    this.drawing = false;
    this.activeId = null;
    ctx.setToolType('select');
  }

  private updateLineFromPoints(ctx: ToolContext, pts: Vec2[]): void {
    if (!this.activeId) return;
    // Compute bounding dimensions from points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    ctx.scene.updateElement(this.activeId, {
      points: pts,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    });
  }
}
