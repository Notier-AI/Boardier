import type { BoardierElement, ViewState } from '../core/types';
import { getElementBounds, renderElement } from '../elements/base';

// Ensure all renderers are registered
import '../elements/rectangle';
import '../elements/ellipse';
import '../elements/diamond';
import '../elements/line';
import '../elements/arrow';
import '../elements/freehand';
import '../elements/text';

/** Export scene to a PNG Blob. */
export async function exportToPNG(
  elements: BoardierElement[],
  backgroundColor: string = '#ffffff',
  padding: number = 40,
  scale: number = 2,
  transparentBackground: boolean = false,
): Promise<Blob> {
  if (elements.length === 0) {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 200;
    const ctx = c.getContext('2d')!;
    if (!transparentBackground) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 200, 200);
    }
    return new Promise((resolve) => c.toBlob(b => resolve(b!), 'image/png'));
  }

  const bounds = elements.map(getElementBounds);
  const minX = Math.min(...bounds.map(b => b.x));
  const minY = Math.min(...bounds.map(b => b.y));
  const maxX = Math.max(...bounds.map(b => b.x + b.width));
  const maxY = Math.max(...bounds.map(b => b.y + b.height));

  const width = (maxX - minX + padding * 2) * scale;
  const height = (maxY - minY + padding * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (!transparentBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.scale(scale, scale);
  ctx.translate(padding - minX, padding - minY);

  for (const el of elements) renderElement(ctx, el);

  return new Promise((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
}

/** Export scene to JSON string. */
export function exportToJSON(
  elements: BoardierElement[],
  viewState: ViewState,
): string {
  return JSON.stringify({ engine: 'boardier', elements, viewState }, null, 2);
}
