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

/** World-space pixel radius within which a bind target is detected / shown. */
const BIND_TOLERANCE = 50;

/**
 * Distance from a world point to the nearest edge of a bounding box.
 * Returns 0 when on the border, negative when inside, positive when outside.
 * We use the minimum distance to any edge (inside) or the euclidean distance
 * to the nearest corner/edge projection (outside).
 */
function distanceToBorder(b: { x: number; y: number; width: number; height: number }, p: Vec2): number {
  const inside = p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
  if (inside) {
    // Distance to nearest inner edge
    return Math.min(p.x - b.x, b.x + b.width - p.x, p.y - b.y, b.y + b.height - p.y);
  }
  // Distance from point to nearest point on the border rectangle
  const cx = Math.max(b.x, Math.min(b.x + b.width, p.x));
  const cy = Math.max(b.y, Math.min(b.y + b.height, p.y));
  return Math.sqrt((cx - p.x) ** 2 + (cy - p.y) ** 2);
}

/** Find the closest point on an element's border to a given world point (used only by SelectTool update-bindings). */
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

/**
 * Find the best element to bind to near a world point.
 * Uses true border-distance so that only elements whose border is within
 * tolerance are considered — drawing INSIDE a large shape won't accidentally
 * bind unless the cursor is near its edge.
 */
function findBindTarget(ctx: ToolContext, world: Vec2, excludeId: string | null, tolerance: number): BoardierElement | null {
  const elements = ctx.scene.getElements();
  let best: BoardierElement | null = null;
  let bestDist = tolerance;
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.id === excludeId) continue;
    if (el.type === 'line' || el.type === 'arrow' || el.type === 'freehand' || el.type === 'comment') continue;
    const b = getElementBounds(el);
    const dist = distanceToBorder(b, world);
    if (dist <= bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best;
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
    const tolerance = BIND_TOLERANCE / (ctx.getViewState().zoom || 1);

    // Check if starting on / near an element → record start binding
    const startTarget = findBindTarget(ctx, world, null, tolerance);
    this.startBindingId = startTarget?.id ?? null;

    // Always start from cursor position — no forced border snap
    this.originPos = world;
    this.drawing = true;
    this.hoverBindTargetId = null;

    const defaults = ctx.theme.elementDefaults;
    const el = this.isArrow
      ? createArrow({
          x: world.x, y: world.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          controlPoint: null,
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
          startBindingId: this.startBindingId,
        })
      : createLine({
          x: world.x, y: world.y, width: 0, height: 0,
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
    const tolerance = BIND_TOLERANCE / (ctx.getViewState().zoom || 1);

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

    // While drawing, check for end target (for hover glow only)
    const endTarget = findBindTarget(ctx, world, this.activeId, tolerance);
    const newHover = endTarget?.id ?? null;
    if (newHover !== this.hoverBindTargetId) {
      this.hoverBindTargetId = newHover;
    }

    // Line follows cursor exactly — no border snap during draw
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

  onPointerUp(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    if (!el || (el.type !== 'line' && el.type !== 'arrow')) {
      this.drawing = false;
      this.activeId = null;
      this.hoverBindTargetId = null;
      return;
    }

    const tolerance = BIND_TOLERANCE / (ctx.getViewState().zoom || 1);
    const endTarget = findBindTarget(ctx, world, this.activeId, tolerance);
    const endBindingId = endTarget?.id ?? null;

    const pts = (el as any).points as Vec2[];
    const dx = pts[1].x;
    const dy = pts[1].y;

    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      ctx.scene.removeElement(this.activeId);
    } else {
      // Endpoint is already at cursor position (set by onPointerMove).
      // Just record whether or not it connects to an element.
      ctx.scene.updateElement(this.activeId, { endBindingId });
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
