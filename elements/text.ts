import type { TextElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';

function render(ctx: CanvasRenderingContext2D, el: TextElement): void {
  if (!el.text) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  ctx.font = `${el.fontSize}px ${el.fontFamily}`;
  ctx.fillStyle = el.strokeColor;
  ctx.textBaseline = 'top';
  ctx.textAlign = el.textAlign;

  const lines = el.text.split('\n');
  const lineH = el.fontSize * el.lineHeight;
  const startY = -el.height / 2;
  const alignX = el.textAlign === 'center' ? 0 : el.textAlign === 'right' ? el.width / 2 : -el.width / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], alignX, startY + i * lineH);
  }

  ctx.restore();
}

function hitTest(el: TextElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = tolerance + 4;
  return (
    local.x >= el.x - pad &&
    local.x <= el.x + el.width + pad &&
    local.y >= el.y - pad &&
    local.y <= el.y + el.height + pad
  );
}

function getBounds(el: TextElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('text', render as any, hitTest as any, getBounds as any);

/** Measure text to compute element width/height. */
export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  const lines = text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  }
  return {
    width: Math.max(maxW + 4, 10),
    height: Math.max(lines.length * fontSize * lineHeight, fontSize * lineHeight),
  };
}
