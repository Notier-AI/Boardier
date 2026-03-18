import type { TextElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { getIconImage } from './icon';

const ICON_MARKER_RE = /\{\{([^}]+)\}\}/g;

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
  ctx.textAlign = 'left'; // Always left-align for segment rendering

  const lines = el.text.split('\n');
  const lineH = el.fontSize * el.lineHeight;
  const startY = -el.height / 2;
  const iconSize = el.fontSize;
  const hasInline = el.inlineIcons && Object.keys(el.inlineIcons).length > 0;

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineH;

    if (hasInline && ICON_MARKER_RE.test(lines[i])) {
      // Render line with inline icons
      ICON_MARKER_RE.lastIndex = 0;
      const segments: { type: 'text' | 'icon'; value: string }[] = [];
      let lastIdx = 0;
      let match: RegExpExecArray | null;
      while ((match = ICON_MARKER_RE.exec(lines[i])) !== null) {
        if (match.index > lastIdx) segments.push({ type: 'text', value: lines[i].slice(lastIdx, match.index) });
        segments.push({ type: 'icon', value: match[1] });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < lines[i].length) segments.push({ type: 'text', value: lines[i].slice(lastIdx) });

      // Calculate total width for alignment
      let totalW = 0;
      for (const seg of segments) {
        if (seg.type === 'text') { totalW += ctx.measureText(seg.value).width; }
        else { totalW += iconSize; }
      }

      let drawX: number;
      if (el.textAlign === 'center') drawX = -totalW / 2;
      else if (el.textAlign === 'right') drawX = el.width / 2 - totalW;
      else drawX = -el.width / 2;

      for (const seg of segments) {
        if (seg.type === 'text') {
          ctx.fillText(seg.value, drawX, lineY);
          drawX += ctx.measureText(seg.value).width;
        } else {
          const svg = el.inlineIcons?.[seg.value];
          if (svg) {
            const img = getIconImage(svg, el.strokeColor);
            if (img) ctx.drawImage(img, drawX, lineY, iconSize, iconSize);
          }
          drawX += iconSize;
        }
      }
    } else {
      // Normal text line — use textAlign directly
      ctx.textAlign = el.textAlign;
      const alignX = el.textAlign === 'center' ? 0 : el.textAlign === 'right' ? el.width / 2 : -el.width / 2;
      ctx.fillText(lines[i], alignX, lineY);
      ctx.textAlign = 'left'; // reset for next line
    }
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
