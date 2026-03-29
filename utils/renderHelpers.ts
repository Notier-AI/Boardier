/**
 * @boardier-module utils/renderHelpers
 * @boardier-category Utilities
 * @boardier-description Shared Canvas 2D rendering helpers: applyStrokeStyle() for dash patterns, drawPatternFill() for hachure/cross-hatch/dot/zigzag fill patterns, and renderLabelWithIcons() for bracket icon resolution in shape labels.
 * @boardier-since 0.1.0
 * @boardier-changed 0.2.0 Added zigzag and zigzag-line fill pattern rendering
 * @boardier-changed 0.4.5 Added renderLabelWithIcons() for resolving bracket icon names in shape labels
 */
import type { FillStyle, StrokeStyle } from '../core/types';
import { resolveIconSvg } from './iconResolver';
import { getIconImage } from '../elements/icon';

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

const BRACKET_ICON_RE = /\[([A-Z][A-Za-z0-9]*)\]/g;

/** Simple word-wrap for label text. */
function wrapLabelLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0 || !text) return [text];
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

/**
 * Render a label string that may contain bracket icon tokens like [LuUsers].
 * Icons are resolved from react-icons and drawn inline with the text.
 * Handles multi-line labels via word-wrap. Clips to the available area.
 * Assumes ctx.font and ctx.fillStyle are already set.
 * Renders centered at (cx, cy) within maxWidth.
 */
export function renderLabelWithIcons(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  cy: number,
  maxWidth: number,
  color: string,
  maxHeight?: number,
): void {
  const fontSize = parseFloat(ctx.font) || 14;
  const lineH = fontSize * 1.3;
  // Collapse whitespace in label (safety net for legacy data)
  const cleanLabel = label.replace(/\s+/g, ' ').trim();
  if (!cleanLabel) return;

  const hasIcons = BRACKET_ICON_RE.test(cleanLabel);
  BRACKET_ICON_RE.lastIndex = 0;

  if (!hasIcons) {
    // Simple text: word-wrap and render centered
    const lines = wrapLabelLine(ctx, cleanLabel, maxWidth);
    const totalH = lines.length * lineH;
    const maxH = maxHeight ?? totalH;
    const startY = cy - Math.min(totalH, maxH) / 2 + lineH / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      const ly = startY + i * lineH;
      if (maxHeight && (ly - lineH / 2 < cy - maxHeight / 2 || ly + lineH / 2 > cy + maxHeight / 2)) continue;
      ctx.fillText(lines[i], cx, ly, maxWidth);
    }
    return;
  }

  // Has bracket icons — parse segments, render single line centered
  const iconSize = fontSize;
  const segments: { type: 'text' | 'icon'; value: string }[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = BRACKET_ICON_RE.exec(cleanLabel)) !== null) {
    if (match.index > lastIdx) segments.push({ type: 'text', value: cleanLabel.slice(lastIdx, match.index) });
    segments.push({ type: 'icon', value: match[1] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < cleanLabel.length) segments.push({ type: 'text', value: cleanLabel.slice(lastIdx) });

  let totalW = 0;
  for (const seg of segments) {
    totalW += seg.type === 'text' ? ctx.measureText(seg.value).width : iconSize + 2;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let drawX = cx - totalW / 2;
  for (const seg of segments) {
    if (seg.type === 'text') {
      ctx.fillText(seg.value, drawX, cy);
      drawX += ctx.measureText(seg.value).width;
    } else {
      const svg = resolveIconSvg(seg.value);
      if (svg) {
        const img = getIconImage(svg, color);
        if (img) ctx.drawImage(img, drawX, cy - iconSize / 2, iconSize, iconSize);
      }
      drawX += iconSize + 2;
    }
  }
}
