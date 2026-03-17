import type { LineElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline } from '../utils/math';

function render(ctx: CanvasRenderingContext2D, el: LineElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);
  for (let i = 1; i < el.points.length; i++) {
    ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function hitTest(el: LineElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));
  return distanceToPolyline(point, abs) <= el.strokeWidth / 2 + tolerance;
}

function getBounds(el: LineElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('line', render as any, hitTest as any, getBounds as any);
