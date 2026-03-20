/**
 * @boardier-module elements/diamond
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for the diamond (rhombus) element. Uses roughDiamond for hand-drawn rendering and point-in-polygon for hit-testing.
 * @boardier-since 0.1.0
 */
import type { DiamondElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { roughDiamond, mulberry32, roughLineTo } from '../utils/roughDraw';
import { HANDWRITTEN_FONT } from '../utils/colors';
import { applyStrokeStyle, drawPatternFill } from '../utils/renderHelpers';

function render(ctx: CanvasRenderingContext2D, el: DiamondElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  const hw = el.width / 2;
  const hh = el.height / 2;

  if (el.roughness > 0) {
    if (el.fillStyle !== 'none' && el.backgroundColor !== 'transparent') {
      const rng = mulberry32(el.seed + 1);
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      roughLineTo(ctx, 0, -hh, hw, 0, rng, el.roughness * 0.5);
      roughLineTo(ctx, hw, 0, 0, hh, rng, el.roughness * 0.5);
      roughLineTo(ctx, 0, hh, -hw, 0, rng, el.roughness * 0.5);
      roughLineTo(ctx, -hw, 0, 0, -hh, rng, el.roughness * 0.5);
      ctx.closePath();
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      } else {
        drawPatternFill(ctx, el.fillStyle, el.backgroundColor, -hw, -hh, el.width, el.height, el.seed);
      }
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);
      roughDiamond(ctx, 0, 0, hw, hh, el.seed, el.roughness);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(0, hh);
    ctx.lineTo(-hw, 0);
    ctx.closePath();
    if (el.fillStyle !== 'none' && el.backgroundColor !== 'transparent') {
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      } else {
        drawPatternFill(ctx, el.fillStyle, el.backgroundColor, -hw, -hh, el.width, el.height, el.seed);
      }
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(hw, 0);
      ctx.lineTo(0, hh);
      ctx.lineTo(-hw, 0);
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);

  // Render label text centered inside
  if (el.label) {
    const labelFont = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    ctx.font = `${Math.min(el.width * 0.5, 18)}px ${labelFont}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.label, 0, 0, el.width * 0.5);
  }
  ctx.restore();
}

function hitTest(el: DiamondElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  // A diamond is a rotated rectangle — check using Manhattan-distance-style test.
  const hw = el.width / 2 + tolerance;
  const hh = el.height / 2 + tolerance;
  const dx = Math.abs(local.x - cx);
  const dy = Math.abs(local.y - cy);
  return dx / hw + dy / hh <= 1;
}

function getBounds(el: DiamondElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('diamond', render as any, hitTest as any, getBounds as any);
