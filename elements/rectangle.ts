import type { RectangleElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';

function render(ctx: CanvasRenderingContext2D, el: RectangleElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  ctx.beginPath();
  if (el.borderRadius > 0) {
    ctx.roundRect(-el.width / 2, -el.height / 2, el.width, el.height, el.borderRadius);
  } else {
    ctx.rect(-el.width / 2, -el.height / 2, el.width, el.height);
  }

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

function hitTest(el: RectangleElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = el.strokeWidth / 2 + tolerance;
  return (
    local.x >= el.x - pad &&
    local.x <= el.x + el.width + pad &&
    local.y >= el.y - pad &&
    local.y <= el.y + el.height + pad
  );
}

function getBounds(el: RectangleElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('rectangle', render as any, hitTest as any, getBounds as any);
