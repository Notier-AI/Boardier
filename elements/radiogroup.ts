/**
 * @boardier-module elements/radiogroup
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for interactive radio-button groups. Supports vertical/horizontal layouts with configurable option labels and selection index.
 * @boardier-since 0.1.0
 */
import type { RadioGroupElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { HANDWRITTEN_FONT } from '../utils/colors';

function render(ctx: CanvasRenderingContext2D, el: RadioGroupElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  if (el.shadow) {
    const parts = el.shadow.split(' ');
    if (parts.length >= 4) {
      ctx.shadowOffsetX = parseFloat(parts[0]) || 0;
      ctx.shadowOffsetY = parseFloat(parts[1]) || 0;
      ctx.shadowBlur = parseFloat(parts[2]) || 0;
      ctx.shadowColor = parts.slice(3).join(' ');
    }
  }

  const hw = el.width / 2;
  const hh = el.height / 2;
  const r = el.radioSize / 2;
  const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
  const fontSize = Math.max(12, el.radioSize * 0.75);
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const count = el.options.length;
  const isVert = el.direction === 'vertical';

  for (let i = 0; i < count; i++) {
    let ox: number, oy: number;
    if (isVert) {
      const spacing = count > 1 ? (el.height - el.radioSize) / (count - 1) : 0;
      ox = -hw + r;
      oy = -hh + r + i * spacing;
    } else {
      const spacing = count > 1 ? (el.width - el.radioSize) / (count - 1) : 0;
      ox = -hw + r + i * spacing;
      oy = 0;
    }

    // Outer circle
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    if (el.fillStyle === 'solid' && el.backgroundColor !== 'transparent') {
      ctx.fillStyle = el.backgroundColor;
      ctx.fill();
    }
    ctx.stroke();

    // Inner dot for selected
    if (el.selectedIndex === i) {
      ctx.fillStyle = el.strokeColor;
      ctx.beginPath();
      ctx.arc(ox, oy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    if (el.options[i]) {
      ctx.fillStyle = el.strokeColor;
      if (isVert) {
        ctx.fillText(el.options[i], ox + r + 6, oy);
      } else {
        ctx.fillText(el.options[i], ox + r + 4, oy);
      }
    }
  }

  ctx.restore();
}

function hitTest(el: RadioGroupElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = tolerance + 4;
  return (
    local.x >= el.x - pad && local.x <= el.x + el.width + pad &&
    local.y >= el.y - pad && local.y <= el.y + el.height + pad
  );
}

function getBounds(el: RadioGroupElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('radiogroup', render as any, hitTest as any, getBounds as any);
