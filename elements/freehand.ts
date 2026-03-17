import type { FreehandElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline } from '../utils/math';

function render(ctx: CanvasRenderingContext2D, el: FreehandElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);

  // Smooth curve through points using quadratic bezier midpoints
  if (el.points.length === 2) {
    ctx.lineTo(el.x + el.points[1].x, el.y + el.points[1].y);
  } else {
    for (let i = 1; i < el.points.length - 1; i++) {
      const curr = el.points[i];
      const next = el.points[i + 1];
      const mx = (curr.x + next.x) / 2;
      const my = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(el.x + curr.x, el.y + curr.y, el.x + mx, el.y + my);
    }
    const last = el.points[el.points.length - 1];
    ctx.lineTo(el.x + last.x, el.y + last.y);
  }

  ctx.stroke();
  ctx.restore();
}

function hitTest(el: FreehandElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));
  return distanceToPolyline(point, abs) <= el.strokeWidth / 2 + tolerance + 2;
}

function getBounds(el: FreehandElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('freehand', render as any, hitTest as any, getBounds as any);
