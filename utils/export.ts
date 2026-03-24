/**
 * @boardier-module utils/export
 * @boardier-category Utilities
 * @boardier-description Export functions for converting scene elements to PNG, SVG, HTML, JSON, and Boardier (.boardier) format. Import functions for loading Boardier and JSON files back. Supports both full-scene and selection-only export.
 * @boardier-since 0.1.0
 * @boardier-changed 0.4.0 Added HTML export, Boardier format export/import, JSON import, clipboard helpers, selection-aware export
 * @boardier-changed 0.4.1 SVG export now renders via canvas to preserve roughjs hand-drawn style; HTML export generates actual positioned HTML divs instead of SVG wrapper
 * @boardier-changed 0.4.2 HTML export now renders via canvas to preserve roughjs hand-drawn style, z-order, and fill patterns
 * @boardier-usage `const blob = await exportToPNG(elements, '#fff', 40, 2);`
 */
import type { BoardierElement, BoardierSceneData, ViewState } from '../core/types';
import { getElementBounds, renderElement } from '../elements/base';

// Ensure all renderers are registered
import '../elements/rectangle';
import '../elements/ellipse';
import '../elements/diamond';
import '../elements/line';
import '../elements/arrow';
import '../elements/freehand';
import '../elements/text';
import '../elements/icon';

import '../elements/image';
import '../elements/embed';
import '../elements/table';
import '../elements/comment';

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

/**
 * Export scene to SVG string.
 * Renders via Canvas (which uses roughjs for hand-drawn style) and embeds the
 * result as a high-resolution image inside an SVG wrapper. This preserves the
 * roughness/hand-drawn aesthetic exactly as it appears on canvas.
 */
export function exportToSVG(
  elements: BoardierElement[],
  backgroundColor: string = '#ffffff',
  padding: number = 40,
): string {
  if (elements.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${escapeXmlAttr(backgroundColor)}"/></svg>`;
  }

  const scale = 2;
  const allBounds = elements.map(getElementBounds);
  const minX = Math.min(...allBounds.map(b => b.x));
  const minY = Math.min(...allBounds.map(b => b.y));
  const maxX = Math.max(...allBounds.map(b => b.x + b.width));
  const maxY = Math.max(...allBounds.map(b => b.y + b.height));

  const svgW = maxX - minX + padding * 2;
  const svgH = maxY - minY + padding * 2;

  // Render at 2x for crisp output
  const canvas = document.createElement('canvas');
  canvas.width = svgW * scale;
  canvas.height = svgH * scale;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(padding - minX, padding - minY);

  for (const el of elements) renderElement(ctx, el);

  const dataUrl = canvas.toDataURL('image/png');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
    `<image width="${svgW}" height="${svgH}" xlink:href="${dataUrl}"/>`,
    `</svg>`,
  ].join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── HTML Export ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Export elements as a standalone HTML page with the canvas rendering
 * embedded as a high-res image. Preserves roughjs hand-drawn style,
 * z-order, and all fill patterns exactly as they appear on canvas.
 */
export function exportToHTML(
  elements: BoardierElement[],
  backgroundColor: string = '#ffffff',
  padding: number = 40,
): string {
  if (elements.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boardier Export</title></head><body style="background:${escapeHtml(backgroundColor)}"></body></html>`;
  }

  const scale = 2;
  const allBounds = elements.map(getElementBounds);
  const minX = Math.min(...allBounds.map(b => b.x));
  const minY = Math.min(...allBounds.map(b => b.y));
  const maxX = Math.max(...allBounds.map(b => b.x + b.width));
  const maxY = Math.max(...allBounds.map(b => b.y + b.height));
  const totalW = maxX - minX + padding * 2;
  const totalH = maxY - minY + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = totalW * scale;
  canvas.height = totalH * scale;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(padding - minX, padding - minY);

  for (const el of elements) renderElement(ctx, el);

  const dataUrl = canvas.toDataURL('image/png');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Boardier Export</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${escapeHtml(backgroundColor)}; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<img src="${dataUrl}" width="${Math.round(totalW)}" height="${Math.round(totalH)}" alt="Boardier Export" />
</body>
</html>`;
}

// ─── Boardier Format (.boardier) ──────────────────────────────────

const BOARDIER_FORMAT_VERSION = 1;

/** Export scene or selection to Boardier's native format. */
export function exportToBoardier(
  elements: BoardierElement[],
  viewState: ViewState,
): string {
  const data = {
    format: 'boardier' as const,
    version: BOARDIER_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    elements,
    viewState,
  };
  return JSON.stringify(data, null, 2);
}

/** Import from Boardier native format. Returns elements or throws. */
export function importFromBoardier(content: string): { elements: BoardierElement[]; viewState?: ViewState } {
  const data = JSON.parse(content);
  if (data.format !== 'boardier' || !Array.isArray(data.elements)) {
    throw new Error('Invalid Boardier file format');
  }
  return { elements: data.elements, viewState: data.viewState };
}

/** Import from JSON (engine scene data or raw element array). Returns elements or throws. */
export function importFromJSON(content: string): { elements: BoardierElement[]; viewState?: ViewState } {
  const data = JSON.parse(content);
  // BoardierSceneData format
  if (data.engine === 'boardier' && Array.isArray(data.elements)) {
    return { elements: data.elements, viewState: data.viewState };
  }
  // Boardier native format
  if (data.format === 'boardier' && Array.isArray(data.elements)) {
    return { elements: data.elements, viewState: data.viewState };
  }
  // Raw array of elements
  if (Array.isArray(data) && data.length > 0 && data[0].type && data[0].id) {
    return { elements: data };
  }
  // { elements: [...] } wrapper
  if (data.elements && Array.isArray(data.elements)) {
    return { elements: data.elements, viewState: data.viewState };
  }
  throw new Error('Unrecognized JSON format — expected Boardier scene data or element array');
}

// ─── Clipboard helpers ────────────────────────────────────────────

/** Copy text content to the system clipboard. */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Copy a PNG blob to the system clipboard. */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
}

/** Trigger a file download from a string. */
export function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trigger a file download from a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a file picker and read its text content. */
export function openFilePicker(accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
