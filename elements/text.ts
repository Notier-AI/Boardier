/**
 * @boardier-module elements/text
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, bounds-getter, and measureText() utility for multi-line text elements. Supports font family/size selection, text alignment, line-height, optional inline icon placeholders, multiLine toggle, word-wrap within element bounds, and scrollbar rendering when content overflows.
 * @boardier-since 0.1.0
 * @boardier-changed 0.4.3 Added multiLine support with scrollbar rendering when content overflows the element bounds
 * @boardier-changed 0.4.4 Text now word-wraps within element width so it never exceeds its hitbox; bracket icon labels like [Check] render as styled inline labels
 */
import type { TextElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { getIconImage } from './icon';

const ICON_MARKER_RE = /\{\{([^}]+)\}\}/g;
const BRACKET_LABEL_RE = /\[([A-Z][A-Za-z]*)\]/g;

/** Word-wrap a single line of text to fit within maxWidth. */
function wrapLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  if (maxWidth <= 0 || !line) return [line];
  const measured = ctx.measureText(line).width;
  if (measured <= maxWidth) return [line];
  const words = line.split(/(\s+)/);
  const wrapped: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current + word;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      wrapped.push(current);
      current = word.trimStart();
    } else {
      current = test;
    }
  }
  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped : [line];
}

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
  ctx.textAlign = 'left';

  const rawLines = el.multiLine !== false ? el.text.split('\n') : [el.text.replace(/\n/g, ' ')];
  const lineH = el.fontSize * el.lineHeight;
  const iconSize = el.fontSize;
  const hasInline = el.inlineIcons && Object.keys(el.inlineIcons).length > 0;

  // Word-wrap lines to fit within element width
  const lines: string[] = [];
  for (const raw of rawLines) {
    const wrapped = wrapLine(ctx, raw, el.width);
    lines.push(...wrapped);
  }

  const totalContentH = lines.length * lineH;
  const startY = -el.height / 2;

  // Always clip to element bounds
  ctx.save();
  ctx.beginPath();
  ctx.rect(-el.width / 2, -el.height / 2, el.width, el.height);
  ctx.clip();

  const overflows = totalContentH > el.height;

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineH;

    if (lineY + lineH < -el.height / 2) continue;
    if (lineY > el.height / 2) break;

    if (hasInline && ICON_MARKER_RE.test(lines[i])) {
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
    } else if (BRACKET_LABEL_RE.test(lines[i])) {
      // Render [Icon]-style bracket labels as styled inline labels
      BRACKET_LABEL_RE.lastIndex = 0;
      const segments: { type: 'text' | 'label'; value: string }[] = [];
      let lastIdx = 0;
      let match: RegExpExecArray | null;
      while ((match = BRACKET_LABEL_RE.exec(lines[i])) !== null) {
        if (match.index > lastIdx) segments.push({ type: 'text', value: lines[i].slice(lastIdx, match.index) });
        segments.push({ type: 'label', value: match[1] });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < lines[i].length) segments.push({ type: 'text', value: lines[i].slice(lastIdx) });

      const labelFontSize = Math.round(el.fontSize * 0.75);
      const labelPadX = 4;
      const labelH = labelFontSize + 4;

      let totalW = 0;
      for (const seg of segments) {
        if (seg.type === 'text') { totalW += ctx.measureText(seg.value).width; }
        else {
          ctx.save();
          ctx.font = `${labelFontSize}px ${el.fontFamily}`;
          totalW += ctx.measureText(seg.value).width + labelPadX * 2 + 4;
          ctx.restore();
        }
      }

      let drawX: number;
      if (el.textAlign === 'center') drawX = -totalW / 2;
      else if (el.textAlign === 'right') drawX = el.width / 2 - totalW;
      else drawX = -el.width / 2;

      for (const seg of segments) {
        if (seg.type === 'text') {
          ctx.font = `${el.fontSize}px ${el.fontFamily}`;
          ctx.fillStyle = el.strokeColor;
          ctx.fillText(seg.value, drawX, lineY);
          drawX += ctx.measureText(seg.value).width;
        } else {
          ctx.save();
          ctx.font = `bold ${labelFontSize}px ${el.fontFamily}`;
          const tw = ctx.measureText(seg.value).width;
          const boxW = tw + labelPadX * 2;
          const boxY = lineY + (lineH - labelH) / 2;
          // Draw label background
          ctx.fillStyle = el.strokeColor + '18';
          roundRect(ctx, drawX, boxY, boxW, labelH, 3);
          ctx.fill();
          // Draw label border
          ctx.strokeStyle = el.strokeColor + '40';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Draw label text
          ctx.fillStyle = el.strokeColor;
          ctx.textBaseline = 'top';
          ctx.fillText(seg.value, drawX + labelPadX, boxY + 2);
          ctx.restore();
          ctx.font = `${el.fontSize}px ${el.fontFamily}`;
          ctx.fillStyle = el.strokeColor;
          ctx.textBaseline = 'top';
          drawX += boxW + 4;
        }
      }
    } else {
      ctx.textAlign = el.textAlign;
      const alignX = el.textAlign === 'center' ? 0 : el.textAlign === 'right' ? el.width / 2 : -el.width / 2;
      ctx.fillText(lines[i], alignX, lineY);
      ctx.textAlign = 'left';
    }
  }

  ctx.restore(); // remove clip

  // Draw scrollbar when content overflows
  if (overflows && el.scrollbar !== false) {
    const sbSize = el.scrollbarSize ?? 6;
    const sbRadius = el.scrollbarRadius ?? 3;
    const sbColor = el.scrollbarColor || '#adb5bd';
    const sbTrackColor = el.scrollbarTrackColor || 'transparent';
    const trackX = el.width / 2 - sbSize - 2;
    const trackY = -el.height / 2 + 2;
    const trackH = el.height - 4;
    const thumbRatio = Math.min(el.height / totalContentH, 1);
    const thumbH = Math.max(trackH * thumbRatio, sbSize * 2);

    // Track
    if (sbTrackColor !== 'transparent') {
      ctx.fillStyle = sbTrackColor;
      roundRect(ctx, trackX, trackY, sbSize, trackH, sbRadius);
      ctx.fill();
    }

    // Thumb
    ctx.fillStyle = sbColor;
    roundRect(ctx, trackX, trackY, sbSize, thumbH, sbRadius);
    ctx.fill();
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

/** Draw a rounded rectangle path (without filling/stroking). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
}

/** Measure text to compute element width/height. If maxWidth is provided, text wraps within it. */
export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  maxWidth?: number,
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  const rawLines = text.split('\n');
  let allLines: string[] = [];
  for (const line of rawLines) {
    if (maxWidth && maxWidth > 0) {
      allLines.push(...wrapLine(ctx, line, maxWidth));
    } else {
      allLines.push(line);
    }
  }
  let maxW = 0;
  for (const line of allLines) {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  }
  return {
    width: maxWidth ? Math.min(Math.max(maxW + 4, 10), maxWidth) : Math.max(maxW + 4, 10),
    height: Math.max(allLines.length * fontSize * lineHeight, fontSize * lineHeight),
  };
}
