import type { ArrowElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline } from '../utils/math';
import { roughPolyline, mulberry32, roughLineTo } from '../utils/roughDraw';

const ARROWHEAD_LEN = 14;
const ARROWHEAD_ANGLE = Math.PI / 7;

function drawArrowhead(ctx: CanvasRenderingContext2D, tip: Vec2, angle: number, seed: number, roughness: number) {
  const la = { x: tip.x - ARROWHEAD_LEN * Math.cos(angle - ARROWHEAD_ANGLE), y: tip.y - ARROWHEAD_LEN * Math.sin(angle - ARROWHEAD_ANGLE) };
  const lb = { x: tip.x - ARROWHEAD_LEN * Math.cos(angle + ARROWHEAD_ANGLE), y: tip.y - ARROWHEAD_LEN * Math.sin(angle + ARROWHEAD_ANGLE) };

  if (roughness > 0) {
    const rng = mulberry32(seed + 99);
    ctx.beginPath();
    ctx.moveTo(la.x, la.y);
    roughLineTo(ctx, la.x, la.y, tip.x, tip.y, rng, roughness);
    roughLineTo(ctx, tip.x, tip.y, lb.x, lb.y, rng, roughness);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(la.x, la.y);
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(lb.x, lb.y);
    ctx.stroke();
  }
}

function render(ctx: CanvasRenderingContext2D, el: ArrowElement): void {
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

  if (el.arrowheadEnd && abs.length >= 2) {
    const a = abs[abs.length - 2];
    const b = abs[abs.length - 1];
    drawArrowhead(ctx, b, Math.atan2(b.y - a.y, b.x - a.x), el.seed, el.roughness);
  }
  if (el.arrowheadStart && abs.length >= 2) {
    const a = abs[1];
    const b = abs[0];
    drawArrowhead(ctx, b, Math.atan2(b.y - a.y, b.x - a.x), el.seed + 50, el.roughness);
  }

  ctx.restore();
}

function hitTest(el: ArrowElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));
  return distanceToPolyline(point, abs) <= el.strokeWidth / 2 + tolerance + 4;
}

function getBounds(el: ArrowElement): Bounds {
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
  // Extend for arrowhead
  return { x: minX - ARROWHEAD_LEN, y: minY - ARROWHEAD_LEN, width: Math.max(maxX - minX, 1) + ARROWHEAD_LEN * 2, height: Math.max(maxY - minY, 1) + ARROWHEAD_LEN * 2 };
}

registerElement('arrow', render as any, hitTest as any, getBounds as any);
