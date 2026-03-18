import type { StickyNoteElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { HANDWRITTEN_FONT } from '../utils/colors';

function render(ctx: CanvasRenderingContext2D, el: StickyNoteElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const r = 6;
  const x = el.x, y = el.y, w = el.width, h = el.height;

  // Shadow for sticky note effect
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  // Background
  ctx.fillStyle = el.noteColor;
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

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Fold corner
  const fold = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.beginPath();
  ctx.moveTo(x + w - fold, y + h);
  ctx.lineTo(x + w, y + h - fold);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Text
  if (el.text) {
    const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : (el.fontFamily || 'system-ui, sans-serif');
    const fontSize = el.fontSize || 14;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padding = 10;
    const maxW = w - padding * 2;
    const words = el.text.split(' ');
    let line = '';
    let ly = y + padding;
    const lineHeight = fontSize * 1.3;

    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x + padding, ly);
        ly += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x + padding, ly);
  }

  ctx.restore();
}

function hitTest(el: StickyNoteElement, point: Vec2, _tolerance: number): boolean {
  return point.x >= el.x && point.x <= el.x + el.width &&
         point.y >= el.y && point.y <= el.y + el.height;
}

function getBounds(el: StickyNoteElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('stickynote', render as any, hitTest as any, getBounds as any);
