/**
 * @boardier-module ai/htmlConverter
 * @boardier-category AI
 * @boardier-description Converts HTML to Boardier elements using the browser's layout engine.
 * The AI generates semantic HTML with inline styles and data-boardier-* attributes;
 * we render it offscreen, measure positions via getBoundingClientRect(), and convert
 * each visible element into BoardierElements at the computed coordinates.
 * Supports all element types via data-boardier-type attributes.
 * @boardier-since 0.2.0
 * @boardier-changed 0.3.3 Rewrote converter to fix overlapping, support all element types via data attributes, remove emoji icons
 * @boardier-changed 0.4.3 Added style preset awareness — reads data-boardier-style from root container, defaults to rough hand-drawn style
 * @boardier-changed 0.4.4 Flex containers with inline children (navs, headers) now create separate positioned text elements instead of merging into one
 * @boardier-changed 0.4.5 Removed forced applyPreset — AI-generated CSS colors now pass through directly
 * @boardier-changed 0.4.6 Fixed overlapping text — flex branch no longer matches containers with deeply nested div children, and children with block content are routed to the full walker instead of extracting merged text
 * @boardier-changed 0.4.7 Collapse HTML whitespace in text extraction; set labelColor on shapes from CSS color
 */

import type { BoardierElement } from '../core/types';
import {
  createRectangle,
  createEllipse,
  createDiamond,
  createText,
  createArrow,
  createLine,
  createFrame,
  createImage,
  createTable,
  createCheckbox,
  createElement,
} from '../elements/base';

// ─── Configuration ────────────────────────────────────────────────

const CONTAINER_WIDTH = 1200;
const MIN_SIZE = 4;

const CONTAINER_TAGS = new Set(['div', 'section', 'nav', 'header', 'footer', 'aside', 'main', 'article', 'form', 'fieldset', 'ul', 'ol', 'table', 'thead', 'tbody', 'tr']);
const INLINE_TAGS = new Set(['span', 'strong', 'em', 'b', 'i', 'u', 'small', 'code', 'mark', 'sub', 'sup', 'br', 'wbr']);
const SKIP_TAGS = new Set(['style', 'script', 'link', 'meta', 'head', 'title', 'noscript']);

// ─── Main converter ───────────────────────────────────────────────

export function htmlToBoardier(html: string, containerWidth = CONTAINER_WIDTH): BoardierElement[] {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${containerWidth}px;overflow:hidden;opacity:0;pointer-events:none;`;

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

  try {
    walkNode(host, elements, ox, oy, 0);
  } finally {
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

    // ── data-boardier-type overrides ──────────────────
    const boardierType = child.getAttribute('data-boardier-type');

    if (boardierType === 'ellipse') {
      elements.push(createEllipse({
        x, y, width: w, height: h,
        label: getDirectTextContent(child) || '',
        backgroundColor: parseColor(style.backgroundColor) || 'transparent',
        fillStyle: parseColor(style.backgroundColor) ? 'solid' : 'none',
        strokeColor: parseBorderColor(style) || '#1e1e1e',
        borderRadius: 0,
      } as any));
      continue;
    }

    if (boardierType === 'diamond') {
      elements.push(createDiamond({
        x, y, width: w, height: h,
        label: getDirectTextContent(child) || '',
        backgroundColor: parseColor(style.backgroundColor) || 'transparent',
        fillStyle: parseColor(style.backgroundColor) ? 'solid' : 'none',
        strokeColor: parseBorderColor(style) || '#1e1e1e',
      } as any));
      continue;
    }

    if (boardierType === 'checkbox') {
      elements.push(createCheckbox({
        x, y, width: w, height: h,
        label: getDirectTextContent(child) || '',
        checked: child.getAttribute('data-checked') === 'true',
        checkColor: parseColor(style.color) || '#2f9e44',
      } as any));
      continue;
    }

    if (boardierType === 'table') {
      const tableEl = parseTableFromDom(child, x, y, w, h, style);
      if (tableEl) { elements.push(tableEl); continue; }
    }

    if (boardierType === 'frame') {
      elements.push(createFrame({
        x, y, width: w, height: h,
        label: child.getAttribute('data-label') || getDirectTextContent(child) || 'Frame',
        frameBackground: parseColor(style.backgroundColor) || '#f8f9fa',
        strokeColor: parseBorderColor(style) || '#dee2e6',
      } as any));
      // Frames: recurse into children — they render inside the frame
      walkNode(child, elements, ox, oy, depth + 1);
      continue;
    }

    if (boardierType === 'arrow' || boardierType === 'line') {
      const pts = [{ x: 0, y: 0 }, { x: w, y: 0 }];
      if (boardierType === 'arrow') {
        elements.push(createArrow({
          x, y: y + h / 2, width: w, height: 0,
          points: pts,
          strokeColor: parseBorderColor(style) || '#1e1e1e',
          arrowheadEnd: true,
          arrowheadStart: false,
        } as any));
      } else {
        elements.push(createLine({
          x, y: y + h / 2, width: w, height: 0,
          points: pts,
          strokeColor: parseBorderColor(style) || '#dee2e6',
        } as any));
      }
      continue;
    }

    // ── Standard tag-based conversion ─────────────────

    if (tag === 'img') {
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: '#f1f3f5',
        fillStyle: 'solid',
        strokeColor: '#dee2e6',
        label: child.getAttribute('alt') || '[Image]',
        borderRadius: parseRadius(style),
        roughness: 0,
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
        roughness: 0,
      }));
      continue;
    }

    if (tag === 'hr') {
      elements.push(createLine({
        x, y: y + h / 2, width: w, height: 0,
        points: [{ x: 0, y: 0 }, { x: w, y: 0 }],
        strokeColor: parseBorderColor(style) || '#dee2e6',
      } as any));
      continue;
    }

    // ── Leaf detection ────────────────────────────────
    // Handle flex/grid containers with inline children (e.g. nav with <span> items)
    // Each inline child gets its own text element at its measured position
    const isFlex = style.display === 'flex' || style.display === 'inline-flex' || style.display === 'grid';
    if (isFlex && hasInlineTextChildren(child)) {
      // Create background/border for the container itself if needed
      const bgColor = parseColor(style.backgroundColor);
      const hasBg = bgColor !== null;
      const borderWidth = parseFloat(style.borderTopWidth) || 0;
      const hasBorder = borderWidth > 0;
      if (hasBg || hasBorder) {
        elements.push(createRectangle({
          x, y, width: w, height: h,
          backgroundColor: bgColor || 'transparent',
          fillStyle: hasBg ? 'solid' : 'none',
          strokeColor: hasBorder ? (parseBorderColor(style) || '#1e1e1e') : 'transparent',
          strokeWidth: hasBorder ? Math.min(borderWidth, 4) : 0,
          borderRadius: Math.min(parseRadius(style), 50),
          opacity: parseFloat(style.opacity) || 1,
          roughness: 0,
        }));
      }
      // Now walk ALL children (including inline ones) as separate positioned elements
      for (let j = 0; j < child.children.length; j++) {
        const inlineChild = child.children[j] as HTMLElement;
        const inlineRect = inlineChild.getBoundingClientRect();
        if (inlineRect.width < MIN_SIZE || inlineRect.height < MIN_SIZE) continue;
        const inlineStyle = getComputedStyle(inlineChild);
        const ix = inlineRect.x - ox;
        const iy = inlineRect.y - oy;
        const iw = inlineRect.width;
        const ih = inlineRect.height;

        // Children with nested block content should be handled by the full
        // walker — extracting .textContent would merge all descendant text
        // into one blob that overlaps with the individually-walked children.
        if (hasBlockLevelChildren(inlineChild)) {
          const childBg = parseColor(inlineStyle.backgroundColor);
          const childBorderW = parseFloat(inlineStyle.borderTopWidth) || 0;
          if (childBg || childBorderW > 0) {
            elements.push(createRectangle({
              x: ix, y: iy, width: iw, height: ih,
              backgroundColor: childBg || 'transparent',
              fillStyle: childBg ? 'solid' : 'none',
              strokeColor: childBorderW > 0 ? (parseBorderColor(inlineStyle) || '#1e1e1e') : 'transparent',
              strokeWidth: childBorderW > 0 ? Math.min(childBorderW, 4) : 0,
              borderRadius: Math.min(parseRadius(inlineStyle), 50),
              label: '',
              opacity: parseFloat(inlineStyle.opacity) || 1,
              roughness: 0,
            }));
          }
          walkNode(inlineChild, elements, ox, oy, depth + 1);
          continue;
        }

        const inlineText = (inlineChild.textContent || '').replace(/\s+/g, ' ').trim();
        const inlineBg = parseColor(inlineStyle.backgroundColor);
        const inlineBorderW = parseFloat(inlineStyle.borderTopWidth) || 0;
        if (isButtonLike(inlineChild, inlineChild.tagName.toLowerCase(), inlineStyle)) {
          const inlineTextColor = parseColor(inlineStyle.color) || '#ffffff';
          elements.push(createRectangle({
            x: ix, y: iy, width: iw, height: ih,
            backgroundColor: inlineBg || '#1971c2',
            fillStyle: 'solid',
            strokeColor: inlineBorderW > 0 ? (parseBorderColor(inlineStyle) || '#1e1e1e') : 'transparent',
            strokeWidth: inlineBorderW > 0 ? Math.min(inlineBorderW, 4) : 0,
            borderRadius: Math.min(parseRadius(inlineStyle), 50),
            label: inlineText || '',
            labelColor: inlineTextColor,
            roughness: 0,
          }));
        } else if (inlineBg || inlineBorderW > 0) {
          const inlineTextColor = parseColor(inlineStyle.color) || '#1e1e1e';
          elements.push(createRectangle({
            x: ix, y: iy, width: iw, height: ih,
            backgroundColor: inlineBg || 'transparent',
            fillStyle: inlineBg ? 'solid' : 'none',
            strokeColor: inlineBorderW > 0 ? (parseBorderColor(inlineStyle) || '#1e1e1e') : 'transparent',
            strokeWidth: inlineBorderW > 0 ? Math.min(inlineBorderW, 4) : 0,
            borderRadius: Math.min(parseRadius(inlineStyle), 50),
            label: inlineText || '',
            labelColor: inlineTextColor,
            roughness: 0,
          }));
        } else if (inlineText) {
          elements.push(createText({
            x: ix, y: iy, width: iw, height: ih,
            text: inlineText,
            fontSize: parseFontSize(inlineStyle, inlineChild.tagName.toLowerCase()),
            fontFamily: parseFontFamily(inlineStyle),
            textAlign: parseTextAlign(inlineStyle.textAlign),
            strokeColor: parseColor(inlineStyle.color) || '#1e1e1e',
          } as any));
        }
      }
      continue;
    }

    const textContent = getDirectTextContent(child);
    const hasBlockChildren = hasBlockLevelChildren(child);
    const isLeaf = !hasBlockChildren || child.children.length === 0;

    const bgColor = parseColor(style.backgroundColor);
    const hasBg = bgColor !== null;
    const borderWidth = parseFloat(style.borderTopWidth) || 0;
    const hasBorder = borderWidth > 0;
    const radius = parseRadius(style);
    const hasVisualPresence = hasBg || hasBorder;

    // ── Pure text elements (headings, paragraphs, list items) ──
    if (isTextTag(tag) && !hasVisualPresence) {
      if (textContent) {
        elements.push(createText({
          x, y, width: w, height: h,
          text: textContent,
          fontSize: parseFontSize(style, tag),
          fontFamily: parseFontFamily(style),
          textAlign: parseTextAlign(style.textAlign),
          strokeColor: parseColor(style.color) || '#1e1e1e',
        } as any));
      }
      continue;
    }

    // ── Button-like elements → rectangle with label ──
    if (isButtonLike(child, tag, style)) {
      const textColor = parseColor(style.color) || '#ffffff';
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: bgColor || '#1971c2',
        fillStyle: 'solid',
        strokeColor: hasBorder ? (parseBorderColor(style) || '#1e1e1e') : 'transparent',
        strokeWidth: hasBorder ? Math.min(borderWidth, 4) : 0,
        borderRadius: Math.min(radius, 50),
        label: textContent || '',
        labelColor: textColor,
        roughness: 0,
      }));
      continue;
    }

    // ── Leaf element with text + visual presence → rectangle with label ──
    if (isLeaf && textContent && hasVisualPresence) {
      const textColor = parseColor(style.color) || '#1e1e1e';
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: bgColor || 'transparent',
        fillStyle: hasBg ? 'solid' : 'none',
        strokeColor: hasBorder ? (parseBorderColor(style) || '#1e1e1e') : 'transparent',
        strokeWidth: hasBorder ? Math.min(borderWidth, 4) : 0,
        borderRadius: Math.min(radius, 50),
        label: textContent,
        labelColor: textColor,
        opacity: parseFloat(style.opacity) || 1,
        roughness: 0,
      }));
      continue;
    }

    // ── Leaf text without visual presence ──
    if (isLeaf && textContent && !hasVisualPresence) {
      elements.push(createText({
        x, y, width: w, height: h,
        text: textContent,
        fontSize: parseFontSize(style, tag),
        fontFamily: parseFontFamily(style),
        textAlign: parseTextAlign(style.textAlign),
        strokeColor: parseColor(style.color) || '#1e1e1e',
      } as any));
      continue;
    }

    // ── Container with visual presence → rectangle + recurse into children ──
    if (hasVisualPresence) {
      elements.push(createRectangle({
        x, y, width: w, height: h,
        backgroundColor: bgColor || 'transparent',
        fillStyle: hasBg ? 'solid' : 'none',
        strokeColor: hasBorder ? (parseBorderColor(style) || '#1e1e1e') : 'transparent',
        strokeWidth: hasBorder ? Math.min(borderWidth, 4) : 0,
        borderRadius: Math.min(radius, 50),
        opacity: parseFloat(style.opacity) || 1,
        roughness: 0,
      }));
      walkNode(child, elements, ox, oy, depth + 1);
      continue;
    }

    // ── Pure container (no visual) → recurse ──
    if (child.children.length > 0) {
      walkNode(child, elements, ox, oy, depth + 1);
    }
  }
}

// ─── Table parser ─────────────────────────────────────────────────

function parseTableFromDom(el: HTMLElement, x: number, y: number, w: number, h: number, style: CSSStyleDeclaration): BoardierElement | null {
  const rows: string[][] = [];
  const rowEls = el.querySelectorAll('tr, [data-boardier-row]');
  if (rowEls.length === 0) {
    // Try parsing divs with data-boardier-row
    const rowDivs = el.querySelectorAll('[data-boardier-row]');
    rowDivs.forEach(row => {
      const cells: string[] = [];
      row.querySelectorAll('[data-boardier-cell]').forEach(cell => {
        cells.push((cell.textContent || '').trim());
      });
      if (cells.length > 0) rows.push(cells);
    });
  } else {
    rowEls.forEach(row => {
      const cells: string[] = [];
      row.querySelectorAll('td, th, [data-boardier-cell]').forEach(cell => {
        cells.push((cell.textContent || '').trim());
      });
      if (cells.length > 0) rows.push(cells);
    });
  }

  if (rows.length === 0) return null;
  const cols = Math.max(...rows.map(r => r.length));
  // Pad rows to equal column count
  const cells = rows.map(r => {
    while (r.length < cols) r.push('');
    return r;
  });

  return createTable({
    x, y, width: w, height: h,
    cols,
    rows: rows.length,
    cells,
    colWidths: Array(cols).fill(1),
    rowHeights: Array(rows.length).fill(1),
    showHeader: el.querySelector('thead, th') !== null || el.getAttribute('data-header') === 'true',
    strokeColor: parseBorderColor(style) || '#dee2e6',
  } as any);
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseColor(cssColor: string | null): string | null {
  if (!cssColor) return null;
  if (cssColor === 'rgba(0, 0, 0, 0)' || cssColor === 'transparent') return null;
  const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const alphaMatch = cssColor.match(/,\s*([\d.]+)\)/);
    if (alphaMatch && parseFloat(alphaMatch[1]) < 0.05) return null;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  if (cssColor.startsWith('#')) return cssColor;
  return null;
}

function parseBorderColor(style: CSSStyleDeclaration): string | null {
  return parseColor(style.borderTopColor) || parseColor(style.borderLeftColor) || null;
}

function parseRadius(style: CSSStyleDeclaration): number {
  const r = parseFloat(style.borderRadius);
  return isNaN(r) ? 0 : Math.min(r, 50);
}

function parseFontSize(style: CSSStyleDeclaration, tag: string): number {
  const px = parseFloat(style.fontSize);
  if (!isNaN(px) && px > 0) return Math.max(10, Math.min(px, 64));
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
  if (el.getAttribute('data-boardier-type') === 'button') return true;
  return false;
}

function hasBlockLevelChildren(el: Element): boolean {
  for (let i = 0; i < el.children.length; i++) {
    const tag = el.children[i].tagName.toLowerCase();
    if (!INLINE_TAGS.has(tag)) return true;
  }
  return false;
}

/** Check if a container has multiple inline/text children that should each be a separate element. */
function hasInlineTextChildren(el: Element): boolean {
  let textChildCount = 0;
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;
    const tag = child.tagName.toLowerCase();
    const text = (child.textContent || '').trim();
    if (!text) continue;
    // Truly inline tags, links, and buttons always count
    if (INLINE_TAGS.has(tag) || tag === 'a' || tag === 'button') {
      textChildCount++;
    }
    // div children count only if they are leaf-like (no deeply nested blocks)
    else if (tag === 'div' && !hasBlockLevelChildren(child)) {
      textChildCount++;
    }
  }
  return textChildCount >= 2;
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
  // Collapse HTML whitespace (newlines + indentation) into single spaces
  return text.replace(/\s+/g, ' ').trim().substring(0, 200);
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
