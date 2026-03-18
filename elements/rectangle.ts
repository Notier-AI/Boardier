import type { RectangleElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { roughRect, roughFillRect } from '../utils/roughDraw';
import { HANDWRITTEN_FONT } from '../utils/colors';

function render(ctx: CanvasRenderingContext2D, el: RectangleElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  const hw = el.width / 2;
  const hh = el.height / 2;

  if (el.roughness > 0 && el.borderRadius === 0) {
    // Hand-drawn style
    if (el.fillStyle === 'solid' && el.backgroundColor !== 'transparent') {
      ctx.fillStyle = el.backgroundColor;
      roughFillRect(ctx, -hw, -hh, el.width, el.height, el.seed, el.roughness);
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      roughRect(ctx, -hw, -hh, el.width, el.height, el.seed, el.roughness);
    }
  } else {
    // Clean style
    ctx.beginPath();
    if (el.borderRadius > 0) {
      ctx.roundRect(-hw, -hh, el.width, el.height, el.borderRadius);
    } else {
      ctx.rect(-hw, -hh, el.width, el.height);
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
  }

  // Render label text centered inside
  if (el.label) {
    const labelFont = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    ctx.font = `${Math.min(el.width * 0.8, 18)}px ${labelFont}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.label, 0, 0, el.width * 0.9);
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
