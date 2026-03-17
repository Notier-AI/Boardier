import type { ArrowElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline } from '../utils/math';

const ARROWHEAD_LEN = 14;
const ARROWHEAD_ANGLE = Math.PI / 7;

function drawArrowhead(ctx: CanvasRenderingContext2D, tip: Vec2, angle: number) {
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(
    tip.x - ARROWHEAD_LEN * Math.cos(angle - ARROWHEAD_ANGLE),
    tip.y - ARROWHEAD_LEN * Math.sin(angle - ARROWHEAD_ANGLE),
  );
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(
    tip.x - ARROWHEAD_LEN * Math.cos(angle + ARROWHEAD_ANGLE),
    tip.y - ARROWHEAD_LEN * Math.sin(angle + ARROWHEAD_ANGLE),
  );
  ctx.stroke();
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

  ctx.beginPath();
  ctx.moveTo(abs[0].x, abs[0].y);
  for (let i = 1; i < abs.length; i++) ctx.lineTo(abs[i].x, abs[i].y);
  ctx.stroke();

  // Arrowheads
  if (el.arrowheadEnd && abs.length >= 2) {
    const a = abs[abs.length - 2];
    const b = abs[abs.length - 1];
    drawArrowhead(ctx, b, Math.atan2(b.y - a.y, b.x - a.x));
  }
  if (el.arrowheadStart && abs.length >= 2) {
    const a = abs[1];
    const b = abs[0];
    drawArrowhead(ctx, b, Math.atan2(b.y - a.y, b.x - a.x));
  }

  ctx.restore();
}

function hitTest(el: ArrowElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));
  return distanceToPolyline(point, abs) <= el.strokeWidth / 2 + tolerance + 4;
}

function getBounds(el: ArrowElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('arrow', render as any, hitTest as any, getBounds as any);
