/**
 * @boardier-module elements/ellipse
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for the ellipse element. Uses roughEllipse for hand-drawn rendering, supports labels, fill patterns, and point-in-ellipse hit-testing.
 * @boardier-since 0.1.0
 */
import type { EllipseElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { roughEllipse, mulberry32 } from '../utils/roughDraw';
import { HANDWRITTEN_FONT } from '../utils/colors';
import { applyStrokeStyle, drawPatternFill, renderLabelWithIcons } from '../utils/renderHelpers';

function render(ctx: CanvasRenderingContext2D, el: EllipseElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  const rx = el.width / 2;
  const ry = el.height / 2;

  if (el.roughness > 0) {
    if (el.fillStyle !== 'none' && el.backgroundColor !== 'transparent') {
      const rng = mulberry32(el.seed + 1);
      const steps = Math.max(16, Math.ceil(Math.max(rx, ry) * 0.8));
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const px = Math.cos(angle) * rx + (rng() - 0.5) * el.roughness * 0.5;
        const py = Math.sin(angle) * ry + (rng() - 0.5) * el.roughness * 0.5;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      } else {
        drawPatternFill(ctx, el.fillStyle, el.backgroundColor, -rx, -ry, el.width, el.height, el.seed);
      }
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);
      roughEllipse(ctx, 0, 0, rx, ry, el.seed, el.roughness);
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    if (el.fillStyle !== 'none' && el.backgroundColor !== 'transparent') {
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      } else {
        drawPatternFill(ctx, el.fillStyle, el.backgroundColor, -rx, -ry, el.width, el.height, el.seed);
      }
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);

  // Render label text centered inside
  if (el.label) {
    const labelFont = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    ctx.font = `${Math.min(el.width * 0.7, 18)}px ${labelFont}`;
    ctx.fillStyle = el.strokeColor;
    renderLabelWithIcons(ctx, el.label, 0, 0, el.width * 0.7, el.strokeColor);
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
