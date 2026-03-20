/**
 * @boardier-module elements/frame
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for frame containers. Frames group child elements with optional clipping, padding, and a labelled header.
 * @boardier-since 0.1.0
 */
import type { FrameElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { HANDWRITTEN_FONT } from '../utils/colors';

const TITLE_HEIGHT = 28;

function render(ctx: CanvasRenderingContext2D, el: FrameElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  if (el.shadow) {
    const parts = el.shadow.split(' ');
    if (parts.length >= 4) {
      ctx.shadowOffsetX = parseFloat(parts[0]) || 0;
      ctx.shadowOffsetY = parseFloat(parts[1]) || 0;
      ctx.shadowBlur = parseFloat(parts[2]) || 0;
      ctx.shadowColor = parts.slice(3).join(' ');
    }
  }

  const x = el.x;
  const y = el.y;
  const w = el.width;
  const h = el.height;
  const r = Math.min(6, w * 0.02);

  // Frame background
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (el.frameBackground !== 'transparent') {
    ctx.fillStyle = el.frameBackground;
    ctx.fill();
  }

  // Border
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();

  // Reset shadow for contents
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // Title bar
  if (el.label) {
    ctx.fillStyle = el.strokeColor + '0d'; // very subtle bg
    ctx.fillRect(x, y, w, TITLE_HEIGHT);
    // Title divider
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + TITLE_HEIGHT);
    ctx.lineTo(x + w, y + TITLE_HEIGHT);
    ctx.stroke();

    const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    ctx.font = `600 13px ${fontFamily}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.label, x + 10, y + TITLE_HEIGHT / 2, w - 20);
  }

  // Clip indicators (small arrows at edges when clipX/clipY are on)
  if (el.clipX || el.clipY) {
    ctx.strokeStyle = el.strokeColor;
    ctx.globalAlpha = el.opacity * 0.3;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    if (el.clipX) {
      // Right edge clip indicator
      const iy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(x + w - 8, iy - 6);
      ctx.lineTo(x + w - 3, iy);
      ctx.lineTo(x + w - 8, iy + 6);
      ctx.stroke();
    }
    if (el.clipY) {
      // Bottom edge clip indicator
      const ix = x + w / 2;
      ctx.beginPath();
      ctx.moveTo(ix - 6, y + h - 8);
      ctx.lineTo(ix, y + h - 3);
      ctx.lineTo(ix + 6, y + h - 8);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function hitTest(el: FrameElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = el.strokeWidth / 2 + tolerance;

  // Hit if on the border or on the title bar
  const onBorder =
    (local.x >= el.x - pad && local.x <= el.x + el.width + pad &&
     local.y >= el.y - pad && local.y <= el.y + el.height + pad) &&
    !(local.x > el.x + pad && local.x < el.x + el.width - pad &&
      local.y > el.y + TITLE_HEIGHT + pad && local.y < el.y + el.height - pad);

  return onBorder;
}

function getBounds(el: FrameElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('frame', render as any, hitTest as any, getBounds as any);
