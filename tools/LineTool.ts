/**
 * @boardier-module tools/LineTool
 * @boardier-category Tools
 * @boardier-description Tool for creating lines and arrows. Supports straight segments, bézier curves (via alt-drag control point), element binding (snapping to target shapes), and multi-point polylines.
 * @boardier-since 0.1.0
 */
import type { Vec2, BoardierElement } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createLine, createArrow, getElementBounds } from '../elements/base';

/**
 * Click-drag line / arrow tool.
 * Auto-connects to element borders with a blue highlight when hovering near them.
 */

/** Find the closest point on an element's border to a given point. */
function closestBorderPoint(el: BoardierElement, point: Vec2): Vec2 {
  const b = getElementBounds(el);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const hw = b.width / 2;
  const hh = b.height / 2;

  if (el.type === 'ellipse') {
    const angle = Math.atan2(dy, dx);
    return { x: cx + hw * Math.cos(angle), y: cy + hh * Math.sin(angle) };
  }

  // For rectangles, diamonds, frames, etc. — clamp to nearest edge
  if (hw === 0 && hh === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** Find the element under or near a point for binding (excludes the line being drawn and other lines). */
function findBindTarget(ctx: ToolContext, world: Vec2, excludeId: string | null, tolerance: number): BoardierElement | null {
  const elements = ctx.scene.getElements();
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.id === excludeId) continue;
    if (el.type === 'line' || el.type === 'arrow' || el.type === 'freehand' || el.type === 'comment') continue;
    const b = getElementBounds(el);
    // Check if point is within or near the element bounds
    if (world.x >= b.x - tolerance && world.x <= b.x + b.width + tolerance &&
        world.y >= b.y - tolerance && world.y <= b.y + b.height + tolerance) {
      return el;
    }
  }
  return null;
}

export class LineTool extends BaseTool {
  readonly type;
  private isArrow: boolean;
  private activeId: string | null = null;
  private originPos: Vec2 = { x: 0, y: 0 };
  private drawing = false;
  private startBindingId: string | null = null;
  /** ID of element being hovered for potential binding (for highlight). Exposed publicly. */
  hoverBindTargetId: string | null = null;

  constructor(toolType: 'line' | 'arrow') {
    super();
    this.type = toolType;
    this.isArrow = toolType === 'arrow';
  }

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    const tolerance = 15 / (ctx.getViewState().zoom || 1);

    // Check if starting on an element → auto-bind start
    const startTarget = findBindTarget(ctx, world, null, tolerance);
    this.startBindingId = startTarget?.id ?? null;

    // If bound, snap the start to the element border
    let startPoint = world;
    if (startTarget) {
      startPoint = closestBorderPoint(startTarget, world);
    }

    this.originPos = startPoint;
    this.drawing = true;
    this.hoverBindTargetId = null;

    const defaults = ctx.theme.elementDefaults;
    const el = this.isArrow
      ? createArrow({
          x: startPoint.x, y: startPoint.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          controlPoint: null,
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
          startBindingId: this.startBindingId,
        })
      : createLine({
          x: startPoint.x, y: startPoint.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          controlPoint: null,
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
          startBindingId: this.startBindingId,
        });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    ctx.scene.setSelection([el.id]);
    this.activeId = el.id;
    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    const tolerance = 15 / (ctx.getViewState().zoom || 1);

    if (!this.drawing || !this.activeId) {
      // Preview hover target for highlight
      const target = findBindTarget(ctx, world, null, tolerance);
      const newId = target?.id ?? null;
      if (newId !== this.hoverBindTargetId) {
        this.hoverBindTargetId = newId;
        ctx.requestRender();
      }
      return;
    }

    // While drawing, check for end target
    const endTarget = findBindTarget(ctx, world, this.activeId, tolerance);
    const newHover = endTarget?.id ?? null;
    if (newHover !== this.hoverBindTargetId) {
      this.hoverBindTargetId = newHover;
    }

    // Snap end point to target border if hovering
    let endPoint = world;
    if (endTarget) {
      endPoint = closestBorderPoint(endTarget, world);
    }

    const rel: Vec2 = { x: endPoint.x - this.originPos.x, y: endPoint.y - this.originPos.y };
    const w = Math.max(Math.abs(rel.x), 1);
    const h = Math.max(Math.abs(rel.y), 1);
    ctx.scene.updateElement(this.activeId, {
      points: [{ x: 0, y: 0 }, rel],
      width: w,
      height: h,
    });
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) {
      this.drawing = false;
      this.activeId = null;
      this.hoverBindTargetId = null;
      return;
    }

    const tolerance = 15 / (ctx.getViewState().zoom || 1);
    const endTarget = findBindTarget(ctx, world, this.activeId, tolerance);
    const endBindingId = endTarget?.id ?? null;

    const pts = (el as any).points as Vec2[];
    const dx = pts[1].x;
    const dy = pts[1].y;

    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      ctx.scene.removeElement(this.activeId);
    } else {
      // Snap final end point
      if (endTarget) {
        const endPoint = closestBorderPoint(endTarget, world);
        const rel: Vec2 = { x: endPoint.x - this.originPos.x, y: endPoint.y - this.originPos.y };
        ctx.scene.updateElement(this.activeId, {
          points: [{ x: 0, y: 0 }, rel],
          width: Math.max(Math.abs(rel.x), 1),
          height: Math.max(Math.abs(rel.y), 1),
          endBindingId,
        });
      } else {
        ctx.scene.updateElement(this.activeId, { endBindingId: null });
      }
      ctx.commitHistory();
    }

    this.drawing = false;
    this.activeId = null;
    this.hoverBindTargetId = null;
    ctx.setToolType('select');
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.drawing && this.activeId) {
      ctx.scene.removeElement(this.activeId);
      this.drawing = false;
      this.activeId = null;
      this.hoverBindTargetId = null;
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
    this.hoverBindTargetId = null;
  }
}
