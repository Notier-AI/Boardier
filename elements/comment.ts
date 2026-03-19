import type { CommentElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';

function render(ctx: CanvasRenderingContext2D, el: CommentElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const x = el.x, y = el.y;
  const pinSize = 24;
  const color = el.resolved ? '#22c55e' : (el.markerColor || '#f59e0b');

  // Pin marker (teardrop shape)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + pinSize / 2, y + pinSize / 2, pinSize / 2, Math.PI, 0);
  ctx.lineTo(x + pinSize / 2, y + pinSize + 4);
  ctx.closePath();
  ctx.fill();

  // Inner dot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + pinSize / 2, y + pinSize / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Resolved checkmark
  if (el.resolved) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 7, y + pinSize / 2);
    ctx.lineTo(x + pinSize / 2 - 1, y + pinSize / 2 + 5);
    ctx.lineTo(x + pinSize - 5, y + pinSize / 2 - 4);
    ctx.stroke();
  }

  // Tooltip bubble (only when element is wide enough, meaning "expanded" state)
  if (el.width > pinSize + 20 && el.text) {
    const bx = x + pinSize + 4;
    const by = y;
    const bw = el.width - pinSize - 4;
    const bh = el.height;
    const r = 6;

    // Bubble background
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Author
    if (el.author) {
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(el.author, bx + 8, by + 6, bw - 16);
    }

    // Comment text
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const textY = el.author ? by + 22 : by + 8;
    const maxW = bw - 16;
    const words = el.text.split(' ');
    let line = '';
    let ly = textY;
    const lineHeight = 15;

    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, bx + 8, ly);
        ly += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, bx + 8, ly);
  }

  ctx.restore();
}

function hitTest(el: CommentElement, point: Vec2, tolerance: number): boolean {
  // Hit test on the pin marker
  const pinCx = el.x + 12;
  const pinCy = el.y + 12;
  const dist = Math.sqrt((point.x - pinCx) ** 2 + (point.y - pinCy) ** 2);
  if (dist <= 14 + tolerance) return true;
  // Also check the bubble area
  return point.x >= el.x && point.x <= el.x + el.width &&
         point.y >= el.y && point.y <= el.y + el.height;
}

function getBounds(el: CommentElement): Bounds {
  return { x: el.x, y: el.y, width: Math.max(el.width, 24), height: Math.max(el.height, 28) };
}

registerElement('comment', render as any, hitTest as any, getBounds as any);
