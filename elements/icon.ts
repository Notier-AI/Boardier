import type { IconElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';

const imageCache = new Map<string, HTMLImageElement>();

function getImage(svgMarkup: string, color: string): HTMLImageElement | null {
  const key = svgMarkup + '|' + color;
  const cached = imageCache.get(key);
  if (cached) return cached.complete ? cached : null;

  // Inject color into the SVG markup
  const coloredSvg = svgMarkup.replace(/currentColor/g, color);
  const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); };
  img.src = url;
  imageCache.set(key, img);
  return img.complete ? img : null;
}

function render(ctx: CanvasRenderingContext2D, el: IconElement): void {
  if (!el.svgMarkup) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  const img = getImage(el.svgMarkup, el.strokeColor);
  if (img) {
    ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
  }
  ctx.restore();
}

function hitTest(el: IconElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = tolerance + 2;
  return (
    local.x >= el.x - pad &&
    local.x <= el.x + el.width + pad &&
    local.y >= el.y - pad &&
    local.y <= el.y + el.height + pad
  );
}

function getBounds(el: IconElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('icon', render as any, hitTest as any, getBounds as any);
