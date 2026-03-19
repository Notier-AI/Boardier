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
 * Re-renders elements using a Canvas-based approach, then converts
 * the canvas to a data URL embedded in an SVG foreignObject.
 * For a proper vector SVG, each element type would need its own SVG generator.
 * This implementation provides a practical SVG export with embedded raster content.
 */
export function exportToSVG(
  elements: BoardierElement[],
  backgroundColor: string = '#ffffff',
  padding: number = 40,
): string {
  if (elements.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${escapeXmlAttr(backgroundColor)}"/></svg>`;
  }

  const allBounds = elements.map(getElementBounds);
  const minX = Math.min(...allBounds.map(b => b.x));
  const minY = Math.min(...allBounds.map(b => b.y));
  const maxX = Math.max(...allBounds.map(b => b.x + b.width));
  const maxY = Math.max(...allBounds.map(b => b.y + b.height));

  const svgW = maxX - minX + padding * 2;
  const svgH = maxY - minY + padding * 2;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`);
  svgParts.push(`<rect width="${svgW}" height="${svgH}" fill="${escapeXmlAttr(backgroundColor)}"/>`);

  for (const el of elements) {
    const b = getElementBounds(el);
    const x = b.x + offsetX;
    const y = b.y + offsetY;

    // Generate basic SVG for common element types
    switch (el.type) {
      case 'rectangle': {
        const re = el as any;
        svgParts.push(`<rect x="${x}" y="${y}" width="${b.width}" height="${b.height}" rx="${re.borderRadius || 0}" fill="${escapeXmlAttr(re.backgroundColor === 'transparent' ? 'none' : re.backgroundColor)}" stroke="${escapeXmlAttr(re.strokeColor)}" stroke-width="${re.strokeWidth}" opacity="${re.opacity}"/>`);
        if (re.label) {
          svgParts.push(`<text x="${x + b.width / 2}" y="${y + b.height / 2}" text-anchor="middle" dominant-baseline="central" fill="${escapeXmlAttr(re.strokeColor)}" font-size="14" opacity="${re.opacity}">${escapeXml(re.label)}</text>`);
        }
        break;
      }
      case 'ellipse': {
        const ee = el as any;
        svgParts.push(`<ellipse cx="${x + b.width / 2}" cy="${y + b.height / 2}" rx="${b.width / 2}" ry="${b.height / 2}" fill="${escapeXmlAttr(ee.backgroundColor === 'transparent' ? 'none' : ee.backgroundColor)}" stroke="${escapeXmlAttr(ee.strokeColor)}" stroke-width="${ee.strokeWidth}" opacity="${ee.opacity}"/>`);
        if (ee.label) {
          svgParts.push(`<text x="${x + b.width / 2}" y="${y + b.height / 2}" text-anchor="middle" dominant-baseline="central" fill="${escapeXmlAttr(ee.strokeColor)}" font-size="14" opacity="${ee.opacity}">${escapeXml(ee.label)}</text>`);
        }
        break;
      }
      case 'diamond': {
        const de = el as any;
        const cx = x + b.width / 2, cy = y + b.height / 2;
        svgParts.push(`<polygon points="${x + b.width / 2},${y} ${x + b.width},${cy} ${cx},${y + b.height} ${x},${cy}" fill="${escapeXmlAttr(de.backgroundColor === 'transparent' ? 'none' : de.backgroundColor)}" stroke="${escapeXmlAttr(de.strokeColor)}" stroke-width="${de.strokeWidth}" opacity="${de.opacity}"/>`);
        break;
      }
      case 'text': {
        const te = el as any;
        svgParts.push(`<text x="${x}" y="${y + (te.fontSize || 18)}" fill="${escapeXmlAttr(te.strokeColor)}" font-size="${te.fontSize || 18}" font-family="${te.fontFamily || 'sans-serif'}" opacity="${te.opacity}">${escapeXml(te.text)}</text>`);
        break;
      }
      case 'line':
      case 'arrow': {
        const le = el as any;
        const pts = le.points || [];
        if (pts.length >= 2) {
          const p0x = le.x + pts[0].x + offsetX;
          const p0y = le.y + pts[0].y + offsetY;
          const p1x = le.x + pts[1].x + offsetX;
          const p1y = le.y + pts[1].y + offsetY;
          let markEnd = '';
          if (le.type === 'arrow' && le.arrowheadEnd !== false) {
            svgParts.push(`<defs><marker id="ah-${el.id}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${escapeXmlAttr(le.strokeColor)}"/></marker></defs>`);
            markEnd = ` marker-end="url(#ah-${el.id})"`;
          }
          svgParts.push(`<line x1="${p0x}" y1="${p0y}" x2="${p1x}" y2="${p1y}" stroke="${escapeXmlAttr(le.strokeColor)}" stroke-width="${le.strokeWidth}" opacity="${le.opacity}"${markEnd}/>`);
        }
        break;
      }
      case 'freehand': {
        const fe = el as any;
        const pts = fe.points || [];
        if (pts.length >= 2) {
          let d = `M ${fe.x + pts[0].x + offsetX} ${fe.y + pts[0].y + offsetY}`;
          for (let i = 1; i < pts.length; i++) {
            d += ` L ${fe.x + pts[i].x + offsetX} ${fe.y + pts[i].y + offsetY}`;
          }
          svgParts.push(`<path d="${d}" fill="none" stroke="${escapeXmlAttr(fe.strokeColor)}" stroke-width="${fe.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${fe.opacity}"/>`);
        }
        break;
      }
      default:
        // For complex types, render as a generic rect placeholder
        svgParts.push(`<rect x="${x}" y="${y}" width="${b.width}" height="${b.height}" fill="none" stroke="${escapeXmlAttr(el.strokeColor)}" stroke-width="1" stroke-dasharray="4 2" opacity="${el.opacity}"/>`);
        break;
    }
  }

  svgParts.push('</svg>');
  return svgParts.join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
