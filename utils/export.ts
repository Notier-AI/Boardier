/**
 * @boardier-module utils/export
 * @boardier-category Utilities
 * @boardier-description Export functions for converting scene elements to PNG, SVG, HTML, JSON, and Boardier (.boardier) format. Import functions for loading Boardier and JSON files back. Supports both full-scene and selection-only export.
 * @boardier-since 0.1.0
 * @boardier-changed 0.4.0 Added HTML export, Boardier format export/import, JSON import, clipboard helpers, selection-aware export
 * @boardier-changed 0.4.1 SVG export now renders via canvas to preserve roughjs hand-drawn style; HTML export generates actual positioned HTML divs instead of SVG wrapper
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

/** Export elements as a standalone HTML page with positioned divs. */
export function exportToHTML(
  elements: BoardierElement[],
  backgroundColor: string = '#ffffff',
  padding: number = 40,
): string {
  if (elements.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boardier Export</title></head><body style="background:${escapeHtml(backgroundColor)}"></body></html>`;
  }

  const allBounds = elements.map(getElementBounds);
  const minX = Math.min(...allBounds.map(b => b.x));
  const minY = Math.min(...allBounds.map(b => b.y));
  const maxX = Math.max(...allBounds.map(b => b.x + b.width));
  const maxY = Math.max(...allBounds.map(b => b.y + b.height));
  const totalW = maxX - minX + padding * 2;
  const totalH = maxY - minY + padding * 2;

  const divs: string[] = [];

  for (const el of elements) {
    const b = getElementBounds(el);
    const x = b.x - minX + padding;
    const y = b.y - minY + padding;

    const common = `position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(b.width)}px;height:${Math.round(b.height)}px;opacity:${el.opacity};`;

    switch (el.type) {
      case 'rectangle': {
        const re = el as any;
        const bg = re.backgroundColor === 'transparent' ? 'transparent' : re.backgroundColor;
        const hasStroke = (re.strokeWidth || 0) > 0 && re.strokeColor !== 'transparent';
        divs.push(`  <div style="${common}background:${bg};border:${hasStroke ? `${re.strokeWidth}px solid ${re.strokeColor}` : 'none'};border-radius:${re.borderRadius || 0}px;display:flex;align-items:center;justify-content:center;font-size:14px;color:${re.strokeColor};box-sizing:border-box;">${re.label ? escapeHtml(re.label) : ''}</div>`);
        break;
      }
      case 'ellipse': {
        const ee = el as any;
        const bg = ee.backgroundColor === 'transparent' ? 'transparent' : ee.backgroundColor;
        divs.push(`  <div style="${common}background:${bg};border:${ee.strokeWidth}px solid ${ee.strokeColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;color:${ee.strokeColor};box-sizing:border-box;">${ee.label ? escapeHtml(ee.label) : ''}</div>`);
        break;
      }
      case 'diamond': {
        const de = el as any;
        const bg = de.backgroundColor === 'transparent' ? 'transparent' : de.backgroundColor;
        divs.push(`  <div style="${common}display:flex;align-items:center;justify-content:center;"><div style="width:70.7%;height:70.7%;transform:rotate(45deg);background:${bg};border:${de.strokeWidth}px solid ${de.strokeColor};display:flex;align-items:center;justify-content:center;box-sizing:border-box;"><span style="transform:rotate(-45deg);font-size:14px;color:${de.strokeColor};">${de.label ? escapeHtml(de.label) : ''}</span></div></div>`);
        break;
      }
      case 'text': {
        const te = el as any;
        divs.push(`  <div style="${common}font-size:${te.fontSize || 18}px;font-family:${te.fontFamily || 'system-ui, sans-serif'};color:${te.strokeColor};text-align:${te.textAlign || 'left'};white-space:pre-wrap;word-break:break-word;line-height:${te.lineHeight || 1.4};">${escapeHtml(te.text || '')}</div>`);
        break;
      }
      case 'line': {
        const le = el as any;
        const pts = le.points || [];
        if (pts.length >= 2) {
          const svgW = b.width || 2;
          const svgH = b.height || 2;
          divs.push(`  <svg style="${common}overflow:visible;" viewBox="0 0 ${svgW} ${svgH}"><line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke="${le.strokeColor}" stroke-width="${le.strokeWidth}" ${le.strokeStyle === 'dashed' ? 'stroke-dasharray="8 4"' : ''}/></svg>`);
        }
        break;
      }
      case 'arrow': {
        const ae = el as any;
        const pts = ae.points || [];
        if (pts.length >= 2) {
          const svgW = b.width || 2;
          const svgH = b.height || 2;
          divs.push(`  <svg style="${common}overflow:visible;" viewBox="0 0 ${svgW} ${svgH}"><defs><marker id="ah-${el.id}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${ae.strokeColor}"/></marker></defs><line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke="${ae.strokeColor}" stroke-width="${ae.strokeWidth}" marker-end="url(#ah-${el.id})"/></svg>`);
        }
        break;
      }
      case 'freehand': {
        const fe = el as any;
        const pts = fe.points || [];
        if (pts.length >= 2) {
          let d = `M ${pts[0].x} ${pts[0].y}`;
          for (let j = 1; j < pts.length; j++) d += ` L ${pts[j].x} ${pts[j].y}`;
          const svgW = b.width || 2;
          const svgH = b.height || 2;
          divs.push(`  <svg style="${common}overflow:visible;" viewBox="0 0 ${svgW} ${svgH}"><path d="${d}" fill="none" stroke="${fe.strokeColor}" stroke-width="${fe.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
        }
        break;
      }
      case 'image': {
        const ie = el as any;
        divs.push(`  <div style="${common}background:#f1f3f5;display:flex;align-items:center;justify-content:center;font-size:12px;color:#868e96;border:1px solid #dee2e6;border-radius:4px;">${escapeHtml(ie.alt || '[Image]')}</div>`);
        break;
      }
      case 'table': {
        const tb = el as any;
        const cells = tb.cells || [];
        let tableHtml = `<table style="width:100%;height:100%;border-collapse:collapse;font-size:12px;color:#1e1e1e;">`;
        for (let r = 0; r < cells.length; r++) {
          tableHtml += '<tr>';
          const isHeader = r === 0 && tb.showHeader;
          const tag = isHeader ? 'th' : 'td';
          for (let c = 0; c < (cells[r]?.length || 0); c++) {
            const cellStyle = `border:1px solid ${tb.strokeColor || '#dee2e6'};padding:4px 8px;${isHeader ? 'background:#f8f9fa;font-weight:600;' : ''}`;
            tableHtml += `<${tag} style="${cellStyle}">${escapeHtml(cells[r][c] || '')}</${tag}>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</table>';
        divs.push(`  <div style="${common}overflow:hidden;">${tableHtml}</div>`);
        break;
      }
      default:
        // Fallback: bordered placeholder
        divs.push(`  <div style="${common}border:1px dashed ${el.strokeColor};display:flex;align-items:center;justify-content:center;font-size:11px;color:#868e96;">${el.type}</div>`);
        break;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Boardier Export</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${escapeHtml(backgroundColor)}; font-family: system-ui, -apple-system, sans-serif; }
  .boardier-canvas { position: relative; width: ${Math.round(totalW)}px; height: ${Math.round(totalH)}px; margin: 0 auto; }
</style>
</head>
<body>
<div class="boardier-canvas">
${divs.join('\n')}
</div>
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
