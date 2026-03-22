/**
 * @boardier-module ai/htmlConverter
 * @boardier-category AI
 * @boardier-description Converts HTML to Boardier elements using the browser's layout engine.
 * The AI generates semantic HTML with inline styles; we render it offscreen, measure
 * positions via getBoundingClientRect(), and convert each visible element into
 * BoardierElements at the computed coordinates.
 * @boardier-since 0.2.0
 */

import type { BoardierElement } from '../core/types';
import {
  createRectangle,
  createEllipse,
  createText,
  createArrow,
  createFrame,
  createImage,
  createElement,
} from '../elements/base';

// ─── Configuration ────────────────────────────────────────────────

const CONTAINER_WIDTH = 1200;
const MIN_SIZE = 4; // Skip elements smaller than this

// Tags that are definitely containers
const CONTAINER_TAGS = new Set(['div', 'section', 'nav', 'header', 'footer', 'aside', 'main', 'article', 'form', 'fieldset', 'ul', 'ol', 'table', 'thead', 'tbody', 'tr']);

// Tags that are inline and should not create separate elements
const INLINE_TAGS = new Set(['span', 'strong', 'em', 'b', 'i', 'u', 'small', 'code', 'mark', 'sub', 'sup', 'br', 'wbr']);

// Tags to skip entirely
const SKIP_TAGS = new Set(['style', 'script', 'link', 'meta', 'head', 'title', 'noscript']);

// ─── Main converter ───────────────────────────────────────────────

/**
 * Convert an HTML string into positioned Boardier elements.
 * Uses the browser's layout engine for positioning by rendering the HTML offscreen.
 *
 * @param html The HTML string (body content only, no <html>/<body> wrappers needed)
 * @param containerWidth The width of the virtual container. Default: 1200px.
 * @returns Array of BoardierElements with computed positions.
 */
export function htmlToBoardier(html: string, containerWidth = CONTAINER_WIDTH): BoardierElement[] {
  // 1. Create offscreen container
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${containerWidth}px;overflow:hidden;visibility:hidden;pointer-events:none;`;

  // Apply CSS reset so layouts are predictable
  const resetCSS = `<style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;}
    img{display:block;max-width:100%;}
    a{text-decoration:none;color:inherit;}
    ul,ol{list-style:none;}
    button{cursor:pointer;border:none;background:none;font:inherit;}
  </style>`;

  host.innerHTML = resetCSS + html;
  document.body.appendChild(host);

  const elements: BoardierElement[] = [];
  const hostRect = host.getBoundingClientRect();
  const ox = hostRect.x;
  const oy = hostRect.y;

  // 2. Walk the DOM and convert elements
  try {
    walkNode(host, elements, ox, oy, 0);
  } finally {
    // 3. Clean up
    document.body.removeChild(host);
  }

  return elements;
}

// ─── DOM walker ───────────────────────────────────────────────────

function walkNode(
  node: Element,
  elements: BoardierElement[],
  ox: number,
  oy: number,
  depth: number,
): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i] as HTMLElement;
    const tag = child.tagName.toLowerCase();

    // Skip invisible and non-content tags
    if (SKIP_TAGS.has(tag)) continue;
    if (INLINE_TAGS.has(tag)) continue;

    const rect = child.getBoundingClientRect();
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) continue;

    const style = getComputedStyle(child);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const x = rect.x - ox;
    const y = rect.y - oy;
    const w = rect.width;
    const h = rect.height;

    // Determine what kind of Boardier element to create
    if (tag === 'img') {
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: '#f1f3f5',
        fillStyle: 'solid',
        strokeColor: '#dee2e6',
        label: child.getAttribute('alt') || '[Image]',
        borderRadius: parseRadius(style),
      }));
      continue;
    }

    if (tag === 'svg' || tag === 'canvas' || tag === 'video') {
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: '#e9ecef',
        fillStyle: 'solid',
        strokeColor: '#ced4da',
        label: `[${tag.toUpperCase()}]`,
        borderRadius: parseRadius(style),
      }));
      continue;
    }

    if (tag === 'hr') {
      elements.push(createElement('line', {
        x, y: y + h / 2, width: 0, height: 0,
        points: [{ x: 0, y: 0 }, { x: w, y: 0 }],
        strokeColor: parseColor(style.borderTopColor) || '#dee2e6',
      } as any));
      continue;
    }

    // Check if this is a leaf text element
    const textContent = getDirectTextContent(child);
    const hasBlockChildren = hasBlockLevelChildren(child);
    const isLeaf = !hasBlockChildren || child.children.length === 0;

    // Extract visual properties
    const bgColor = parseColor(style.backgroundColor);
    const hasBg = bgColor !== null && bgColor !== 'transparent';
    const borderWidth = parseFloat(style.borderTopWidth) || 0;
    const hasBorder = borderWidth > 0;
    const radius = parseRadius(style);
    const hasVisualPresence = hasBg || hasBorder;

    // Heading / text elements
    if (isTextTag(tag) || (isLeaf && textContent && !hasVisualPresence)) {
      const fontSize = parseFontSize(style, tag);
      const textEl = createText({
        x, y, width: w, height: h,
        text: textContent || '',
        fontSize,
        fontFamily: parseFontFamily(style),
        textAlign: parseTextAlign(style.textAlign),
        strokeColor: parseColor(style.color) || '#1e1e1e',
      } as any);
      elements.push(textEl);
      continue;
    }

    // Button-like elements
    if (isButtonLike(child, tag, style)) {
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: bgColor || '#1971c2',
        fillStyle: 'solid',
        strokeColor: hasBorder ? (parseColor(style.borderTopColor) || '#1e1e1e') : (bgColor || '#1971c2'),
        strokeWidth: hasBorder ? Math.min(borderWidth, 4) : 1,
        borderRadius: Math.min(radius, 50),
        label: textContent || '',
      }));
      continue;
    }

    // Container with visual presence → rectangle + recurse
    if (hasVisualPresence) {
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: bgColor || 'transparent',
        fillStyle: hasBg ? 'solid' : 'none',
        strokeColor: hasBorder ? (parseColor(style.borderTopColor) || '#1e1e1e') : '#1e1e1e',
        strokeWidth: hasBorder ? Math.min(borderWidth, 4) : (hasBg ? 0 : 0),
        borderRadius: Math.min(radius, 50),
        opacity: parseFloat(style.opacity) || 1,
        roughness: 0,
      }));
    }

    // Leaf container with text but no block children → text on top of rect
    if (isLeaf && textContent && hasVisualPresence) {
      const fontSize = parseFontSize(style, tag);
      elements.push(createText({
        x: x + 4, y: y + 4, width: w - 8, height: h - 8,
        text: textContent,
        fontSize,
        fontFamily: parseFontFamily(style),
        textAlign: parseTextAlign(style.textAlign),
        strokeColor: parseColor(style.color) || '#1e1e1e',
      } as any));
      continue; // Don't recurse into leaf
    }

    // Recurse into children
    if (hasBlockChildren || child.children.length > 0) {
      walkNode(child, elements, ox, oy, depth + 1);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseColor(cssColor: string | null): string | null {
  if (!cssColor) return null;
  if (cssColor === 'rgba(0, 0, 0, 0)' || cssColor === 'transparent') return null;
  // Convert rgb/rgba to hex
  const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    // Check if it's near-transparent
    const alphaMatch = cssColor.match(/,\s*([\d.]+)\)/);
    if (alphaMatch && parseFloat(alphaMatch[1]) < 0.05) return null;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  if (cssColor.startsWith('#')) return cssColor;
  return null;
}

function parseRadius(style: CSSStyleDeclaration): number {
  const r = parseFloat(style.borderRadius);
  return isNaN(r) ? 0 : Math.min(r, 50);
}

function parseFontSize(style: CSSStyleDeclaration, tag: string): number {
  const px = parseFloat(style.fontSize);
  if (!isNaN(px) && px > 0) return Math.max(10, Math.min(px, 64));
  // Defaults by tag
  const defaults: Record<string, number> = { h1: 36, h2: 28, h3: 22, h4: 18, h5: 16, h6: 14 };
  return defaults[tag] || 16;
}

function parseFontFamily(style: CSSStyleDeclaration): string {
  const family = style.fontFamily || '';
  if (family.includes('monospace') || family.includes('Courier')) return 'Courier New';
  if (family.includes('serif') && !family.includes('sans')) return 'Georgia';
  return 'system-ui, sans-serif';
}

function parseTextAlign(align: string): 'left' | 'center' | 'right' {
  if (align === 'center') return 'center';
  if (align === 'right' || align === 'end') return 'right';
  return 'left';
}

function isTextTag(tag: string): boolean {
  return /^(h[1-6]|p|label|figcaption|dt|dd|blockquote|pre|code|li|td|th|caption)$/.test(tag);
}

function isButtonLike(el: HTMLElement, tag: string, style: CSSStyleDeclaration): boolean {
  if (tag === 'button' || tag === 'input') return true;
  if (tag === 'a' && (parseColor(style.backgroundColor) !== null || parseFloat(style.borderWidth) > 0)) return true;
  if (el.getAttribute('role') === 'button') return true;
  return false;
}

function hasBlockLevelChildren(el: Element): boolean {
  for (let i = 0; i < el.children.length; i++) {
    const tag = el.children[i].tagName.toLowerCase();
    if (!INLINE_TAGS.has(tag)) return true;
  }
  return false;
}

function getDirectTextContent(el: Element): string {
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childTag = (node as Element).tagName.toLowerCase();
      if (INLINE_TAGS.has(childTag)) {
        text += (node as Element).textContent || '';
      }
    }
  }
  return text.trim().substring(0, 200);
}

// ─── Element-to-description serializer ────────────────────────────

/**
 * Serialize Boardier elements into a human-readable description for AI context.
 * Used when sending selected elements to the AI chat.
 */
export function describeElements(elements: BoardierElement[]): string {
  if (elements.length === 0) return 'No elements selected.';

  const lines: string[] = [`${elements.length} element(s) selected:\n`];

  for (const el of elements.slice(0, 30)) {
    const label = (el as any).label || (el as any).text || '';
    const pos = `at (${Math.round(el.x)}, ${Math.round(el.y)})`;
    const size = `${Math.round(el.width)}×${Math.round(el.height)}`;
    const colors: string[] = [];
    if (el.backgroundColor && el.backgroundColor !== 'transparent') colors.push(`fill: ${el.backgroundColor}`);
    if (el.strokeColor) colors.push(`stroke: ${el.strokeColor}`);
    const colorStr = colors.length > 0 ? ` [${colors.join(', ')}]` : '';

    let desc = `- ${el.type} ${pos} ${size}`;
    if (label) desc += ` "${label}"`;
    desc += colorStr;

    // Type-specific info
    if (el.type === 'arrow') {
      const arrow = el as any;
      if (arrow.startBindingId || arrow.endBindingId) {
        desc += ` connects ${arrow.startBindingId || '?'} → ${arrow.endBindingId || '?'}`;
      }
    }
    if (el.type === 'frame') {
      const frame = el as any;
      if (frame.childIds?.length) desc += ` (${frame.childIds.length} children)`;
    }

    lines.push(desc);
  }

  if (elements.length > 30) {
    lines.push(`... and ${elements.length - 30} more elements`);
  }

  return lines.join('\n');
}
