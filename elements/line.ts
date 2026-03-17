import type { LineElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline } from '../utils/math';
import { roughPolyline } from '../utils/roughDraw';

function render(ctx: CanvasRenderingContext2D, el: LineElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));

  if (el.roughness > 0) {
    roughPolyline(ctx, abs, el.seed, el.roughness);
  } else {
    ctx.beginPath();
    ctx.moveTo(abs[0].x, abs[0].y);
    for (let i = 1; i < abs.length; i++) ctx.lineTo(abs[i].x, abs[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function hitTest(el: LineElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));
  return distanceToPolyline(point, abs) <= el.strokeWidth / 2 + tolerance;
}

function getBounds(el: LineElement): Bounds {
  if (el.points.length === 0) return { x: el.x, y: el.y, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of el.points) {
    const wx = el.x + p.x;
    const wy = el.y + p.y;
    if (wx < minX) minX = wx;
    if (wy < minY) minY = wy;
    if (wx > maxX) maxX = wx;
    if (wy > maxY) maxY = wy;
  }
  return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
}

registerElement('line', render as any, hitTest as any, getBounds as any);
