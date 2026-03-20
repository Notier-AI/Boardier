/**
 * @boardier-module elements/image
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for image elements. Supports data URLs and external URLs with object-fit modes (contain/cover/fill).
 * @boardier-since 0.1.0
 */
import type { ImageElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): HTMLImageElement | null {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) return cached;
  if (!cached) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    imageCache.set(src, img);
    return null;
  }
  return cached.complete && cached.naturalWidth > 0 ? cached : null;
}

function render(ctx: CanvasRenderingContext2D, el: ImageElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const img = loadImage(el.src);
  if (img) {
    const fit = el.objectFit || 'contain';
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    let dx = el.x, dy = el.y, dw = el.width, dh = el.height;

    if (fit === 'contain') {
      const scale = Math.min(dw / sw, dh / sh);
      const rw = sw * scale, rh = sh * scale;
      dx += (dw - rw) / 2;
      dy += (dh - rh) / 2;
      dw = rw;
      dh = rh;
    } else if (fit === 'cover') {
      const scale = Math.max(dw / sw, dh / sh);
      const rw = dw / scale, rh = dh / scale;
      sx = (sw - rw) / 2;
      sy = (sh - rh) / 2;
      sw = rw;
      sh = rh;
    }
    // 'fill': just draw directly

    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.strokeRect(el.x, el.y, el.width, el.height);
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  } else {
    // Placeholder while loading
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    ctx.setLineDash([]);

    ctx.fillStyle = el.strokeColor;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading image...', el.x + el.width / 2, el.y + el.height / 2);
  }

  ctx.restore();
}

function hitTest(el: ImageElement, point: Vec2, _tolerance: number): boolean {
  return point.x >= el.x && point.x <= el.x + el.width &&
         point.y >= el.y && point.y <= el.y + el.height;
}

function getBounds(el: ImageElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('image', render as any, hitTest as any, getBounds as any);
