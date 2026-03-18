import type { DiamondElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { roughDiamond, mulberry32, roughLineTo } from '../utils/roughDraw';

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
    if (el.fillStyle === 'solid' && el.backgroundColor !== 'transparent') {
      const rng = mulberry32(el.seed + 1);
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      roughLineTo(ctx, 0, -hh, hw, 0, rng, el.roughness * 0.5);
      roughLineTo(ctx, hw, 0, 0, hh, rng, el.roughness * 0.5);
      roughLineTo(ctx, 0, hh, -hw, 0, rng, el.roughness * 0.5);
      roughLineTo(ctx, -hw, 0, 0, -hh, rng, el.roughness * 0.5);
      ctx.closePath();
      ctx.fillStyle = el.backgroundColor;
      ctx.fill();
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      roughDiamond(ctx, 0, 0, hw, hh, el.seed, el.roughness);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(0, hh);
    ctx.lineTo(-hw, 0);
    ctx.closePath();
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
    ctx.font = `${Math.min(el.width * 0.5, 18)}px system-ui, sans-serif`;
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
