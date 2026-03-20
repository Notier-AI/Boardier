/**
 * @boardier-module elements/marker
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for the highlighter-marker element. Draws wide, translucent strokes ideal for annotations and emphasis.
 * @boardier-since 0.1.0
 */
import type { MarkerElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';

function render(ctx: CanvasRenderingContext2D, el: MarkerElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity * 0.45; // markers are semi-transparent
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.markerWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Apply shadow if set
  if (el.shadow) {
    const parts = el.shadow.split(' ');
    if (parts.length >= 4) {
      ctx.shadowOffsetX = parseFloat(parts[0]) || 0;
      ctx.shadowOffsetY = parseFloat(parts[1]) || 0;
      ctx.shadowBlur = parseFloat(parts[2]) || 0;
      ctx.shadowColor = parts.slice(3).join(' ');
    }
  }

  ctx.beginPath();
  ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);
  for (let i = 1; i < el.points.length; i++) {
    ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function hitTest(el: MarkerElement, point: Vec2, tolerance: number): boolean {
  const pad = el.markerWidth / 2 + tolerance;
  for (let i = 1; i < el.points.length; i++) {
    const ax = el.x + el.points[i - 1].x;
    const ay = el.y + el.points[i - 1].y;
    const bx = el.x + el.points[i].x;
    const by = el.y + el.points[i].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
    if (dist <= pad) return true;
  }
  return false;
}

function getBounds(el: MarkerElement): Bounds {
  if (el.points.length === 0) return { x: el.x, y: el.y, width: el.width, height: el.height };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of el.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: el.x + minX, y: el.y + minY, width: maxX - minX, height: maxY - minY };
}

registerElement('marker', render as any, hitTest as any, getBounds as any);
