import type { EmbedElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { HANDWRITTEN_FONT } from '../utils/colors';

function render(ctx: CanvasRenderingContext2D, el: EmbedElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const x = el.x, y = el.y, w = el.width, h = el.height;
  const r = 6;

  // Card background
  ctx.fillStyle = el.backgroundColor;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Border
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();

  // Link icon (chain link)
  const iconSize = 20;
  const iconX = x + 12;
  const iconY = y + h / 2;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Simple chain link icon
  ctx.beginPath();
  ctx.arc(iconX, iconY - 2, 5, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(iconX + 8, iconY + 2, 5, Math.PI * 1.8, Math.PI * 3.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(iconX + 3, iconY - 3);
  ctx.lineTo(iconX + 5, iconY + 3);
  ctx.stroke();

  // Title
  const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
  ctx.font = `bold 13px ${fontFamily}`;
  ctx.fillStyle = el.strokeColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const title = el.title || 'Embed';
  const textX = iconX + iconSize + 8;
  const maxTextW = w - (textX - x) - 10;
  ctx.fillText(title, textX, y + h / 2 - 8, maxTextW);

  // URL
  ctx.font = `11px ${fontFamily}`;
  ctx.globalAlpha = el.opacity * 0.6;
  let urlDisplay = el.url;
  if (urlDisplay.length > 40) urlDisplay = urlDisplay.substring(0, 40) + '…';
  ctx.fillText(urlDisplay, textX, y + h / 2 + 8, maxTextW);

  ctx.restore();
}

function hitTest(el: EmbedElement, point: Vec2, _tolerance: number): boolean {
  return point.x >= el.x && point.x <= el.x + el.width &&
         point.y >= el.y && point.y <= el.y + el.height;
}

function getBounds(el: EmbedElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('embed', render as any, hitTest as any, getBounds as any);
