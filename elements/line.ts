import type { LineElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline, distanceToBezier } from '../utils/math';
import { roughPolyline, roughBezier } from '../utils/roughDraw';
import { applyStrokeStyle } from '../utils/renderHelpers';

function render(ctx: CanvasRenderingContext2D, el: LineElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);

  const p0: Vec2 = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
  const p1: Vec2 = { x: el.x + el.points[1].x, y: el.y + el.points[1].y };

  if (el.controlPoint) {
    const cp: Vec2 = { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y };
    if (el.roughness > 0) {
      roughBezier(ctx, p0, cp, p1, el.seed, el.roughness);
    } else {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y);
      ctx.stroke();
    }
  } else {
    if (el.roughness > 0) {
      roughPolyline(ctx, [p0, p1], el.seed, el.roughness);
    } else {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function hitTest(el: LineElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const p0: Vec2 = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
  const p1: Vec2 = { x: el.x + el.points[1].x, y: el.y + el.points[1].y };
  const tol = el.strokeWidth / 2 + tolerance;

  if (el.controlPoint) {
    const cp: Vec2 = { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y };
    return distanceToBezier(point, p0, cp, p1) <= tol;
  }
  return distanceToPolyline(point, [p0, p1]) <= tol;
}

function getBounds(el: LineElement): Bounds {
  if (el.points.length === 0) return { x: el.x, y: el.y, width: 0, height: 0 };
  const allPts = el.points.map(p => ({ x: el.x + p.x, y: el.y + p.y }));
  if (el.controlPoint) allPts.push({ x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
}

registerElement('line', render as any, hitTest as any, getBounds as any);
