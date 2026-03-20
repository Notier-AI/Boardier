/**
 * @boardier-module elements/embed
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for embedded web content placeholders. Displays a URL title card on the canvas (actual iframe rendering happens in the UI layer).
 * @boardier-since 0.1.0
 */
import type { EmbedElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';

function render(ctx: CanvasRenderingContext2D, el: EmbedElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const x = el.x, y = el.y, w = el.width, h = el.height;
  const r = 6;

  // Background
  ctx.fillStyle = el.backgroundColor !== 'transparent' ? el.backgroundColor : '#f8f9fa';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // Border
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();

  // If no URL yet, show placeholder prompting
  if (!el.url) {
    ctx.fillStyle = el.strokeColor;
    ctx.globalAlpha = el.opacity * 0.4;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click to set URL', x + w / 2, y + h / 2);
  } else {
    // Top bar with URL
    const barH = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(x, y, w, barH);
    ctx.strokeStyle = el.strokeColor;
    ctx.globalAlpha = el.opacity * 0.2;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + barH);
    ctx.lineTo(x + w, y + barH);
    ctx.stroke();
    ctx.globalAlpha = el.opacity;

    // Globe icon
    ctx.strokeStyle = el.strokeColor;
    ctx.globalAlpha = el.opacity * 0.5;
    ctx.lineWidth = 1.5;
    const gx = x + 14, gy = y + barH / 2;
    ctx.beginPath();
    ctx.arc(gx, gy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy);
    ctx.lineTo(gx + 6, gy);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(gx, gy, 3, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // URL text
    ctx.globalAlpha = el.opacity * 0.6;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let urlDisplay = el.url;
    if (urlDisplay.length > 50) urlDisplay = urlDisplay.substring(0, 50) + '…';
    ctx.fillText(urlDisplay, x + 26, y + barH / 2, w - 36);

    // Center text saying "Web content"
    ctx.globalAlpha = el.opacity * 0.2;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.title || el.url, x + w / 2, y + barH + (h - barH) / 2, w - 20);
  }

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
