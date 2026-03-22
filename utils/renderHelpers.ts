/**
 * @boardier-module utils/renderHelpers
 * @boardier-category Utilities
 * @boardier-description Shared Canvas 2D rendering helpers: applyStrokeStyle() for dash patterns and drawPatternFill() for hachure/cross-hatch/dot/zigzag fill patterns used by shape renderers.
 * @boardier-since 0.1.0
 * @boardier-changed 0.2.0 Added zigzag and zigzag-line fill pattern rendering
 */
import type { FillStyle, StrokeStyle } from '../core/types';

/**
 * Apply stroke dash pattern based on StrokeStyle.
 */
export function applyStrokeStyle(ctx: CanvasRenderingContext2D, style: StrokeStyle | undefined, lineWidth: number): void {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([lineWidth * 4, lineWidth * 3]);
      break;
    case 'dotted':
      ctx.setLineDash([lineWidth, lineWidth * 2]);
      ctx.lineCap = 'round';
      break;
    default: // 'solid'
      ctx.setLineDash([]);
      break;
  }
}

/**
 * Draw a patterned fill inside the current path.
 * Call this AFTER ctx.beginPath() + defining the shape path.
 */
export function drawPatternFill(
  ctx: CanvasRenderingContext2D,
  fillStyle: FillStyle,
  color: string,
  x: number, y: number, w: number, h: number,
  seed: number,
): void {
  if (fillStyle === 'none' || color === 'transparent') return;

  if (fillStyle === 'solid') {
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.clip();

  if (fillStyle === 'hachure') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha *= 0.65;
    const gap = 8;
    for (let i = -h; i < w + h; i += gap) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i - h, y + h);
      ctx.stroke();
    }
  } else if (fillStyle === 'cross-hatch') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.5;
    const gap = 8;
    for (let i = -h; i < w + h; i += gap) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i - h, y + h);
      ctx.stroke();
    }
    for (let i = -h; i < w + h; i += gap) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
  } else if (fillStyle === 'dots') {
    ctx.fillStyle = color;
    ctx.globalAlpha *= 0.5;
    const gap = 8;
    const r = 1.5;
    let rng = seed;
    for (let dy = gap / 2; dy < h; dy += gap) {
      for (let dx = gap / 2; dx < w; dx += gap) {
        rng = (rng * 16807) % 2147483647;
        const jx = ((rng / 2147483647) - 0.5) * 2;
        rng = (rng * 16807) % 2147483647;
        const jy = ((rng / 2147483647) - 0.5) * 2;
        ctx.beginPath();
        ctx.arc(x + dx + jx, y + dy + jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (fillStyle === 'zigzag') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha *= 0.6;
    const gap = 10;
    const amp = 4;
    for (let row = 0; row < h; row += gap) {
      ctx.beginPath();
      ctx.moveTo(x, y + row);
      for (let dx = 0; dx < w; dx += amp * 2) {
        ctx.lineTo(x + dx + amp, y + row + amp);
        ctx.lineTo(x + dx + amp * 2, y + row);
      }
      ctx.stroke();
    }
  } else if (fillStyle === 'zigzag-line') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.55;
    const gap = 8;
    const amp = 3;
    // Diagonal zigzag lines
    for (let i = -h; i < w + h; i += gap) {
      ctx.beginPath();
      const steps = Math.ceil(h / (amp * 2));
      for (let s = 0; s <= steps; s++) {
        const py = y + s * amp * 2;
        const px = x + i - (py - y) + (s % 2 === 0 ? 0 : amp);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}
