import type { EllipseElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';

function render(ctx: CanvasRenderingContext2D, el: EllipseElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  ctx.beginPath();
  ctx.ellipse(0, 0, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);

  if (el.fillStyle === 'solid' && el.backgroundColor !== 'transparent') {
    ctx.fillStyle = el.backgroundColor;
    ctx.fill();
  }
  if (el.strokeWidth > 0) {
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function hitTest(el: EllipseElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const rx = el.width / 2 + el.strokeWidth / 2 + tolerance;
  const ry = el.height / 2 + el.strokeWidth / 2 + tolerance;
  const dx = local.x - cx;
  const dy = local.y - cy;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

function getBounds(el: EllipseElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('ellipse', render as any, hitTest as any, getBounds as any);
