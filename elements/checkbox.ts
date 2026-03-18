import type { CheckboxElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { HANDWRITTEN_FONT } from '../utils/colors';

function render(ctx: CanvasRenderingContext2D, el: CheckboxElement): void {
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
  const boxSize = el.checkSize;
  const boxX = -hw;
  const boxY = -boxSize / 2;

  // Box
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineJoin = 'round';
  const r = Math.min(3, boxSize * 0.15);
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxSize, boxSize, r);

  if (el.checked) {
    ctx.fillStyle = el.checkColor;
    ctx.fill();
  } else if (el.fillStyle === 'solid' && el.backgroundColor !== 'transparent') {
    ctx.fillStyle = el.backgroundColor;
    ctx.fill();
  }
  ctx.stroke();

  // Checkmark
  if (el.checked) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, boxSize * 0.15);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(boxX + boxSize * 0.22, boxY + boxSize * 0.52);
    ctx.lineTo(boxX + boxSize * 0.42, boxY + boxSize * 0.72);
    ctx.lineTo(boxX + boxSize * 0.78, boxY + boxSize * 0.3);
    ctx.stroke();
  }

  // Label
  if (el.label) {
    const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    const fontSize = Math.max(12, boxSize * 0.75);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.label, boxX + boxSize + 8, 0, el.width - boxSize - 12);
  }

  ctx.restore();
}

function hitTest(el: CheckboxElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = tolerance + 4;
  return (
    local.x >= el.x - pad && local.x <= el.x + el.width + pad &&
    local.y >= el.y - pad && local.y <= el.y + el.height + pad
  );
}

function getBounds(el: CheckboxElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('checkbox', render as any, hitTest as any, getBounds as any);
