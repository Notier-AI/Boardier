/**
 * @boardier-module elements/base
 * @boardier-category Elements
 * @boardier-description Element registry and factory system. Each element type module (rectangle.ts, ellipse.ts, etc.) calls `registerElement()` to provide a renderer, hit-tester, and bounds getter. The factory functions (`createRectangle`, `createEllipse`, …) produce elements with sensible defaults. Use `createElement(type)` as a generic dispatcher.
 * @boardier-since 0.1.0
 * @boardier-see core/types for the element type definitions
 */
import type {
  BoardierElement,
  BoardierElementType,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  LineElement,
  ArrowElement,
  FreehandElement,
  TextElement,
  IconElement,
  MarkerElement,
  CheckboxElement,
  RadioGroupElement,
  FrameElement,
  ImageElement,
  EmbedElement,
  TableElement,
  CommentElement,
  Bounds,
  Vec2,
} from '../core/types';
import { generateId } from '../utils/id';

// ─── Element rendering registry ──────────────────────────────────────
// Populated by each element module's register() call.

export type ElementRenderer = (ctx: CanvasRenderingContext2D, el: BoardierElement) => void;
export type ElementHitTester = (el: BoardierElement, point: Vec2, tolerance: number) => boolean;
export type ElementBoundsGetter = (el: BoardierElement) => Bounds;

const renderers: Record<string, ElementRenderer> = {};
const hitTesters: Record<string, ElementHitTester> = {};
const boundsGetters: Record<string, ElementBoundsGetter> = {};

/**
 * @boardier-function registerElement
 * @boardier-description Register a renderer, hit-tester, and bounds-getter for a specific element type. Called once per element module at import time.
 * @boardier-param type The `BoardierElementType` string identifier.
 * @boardier-param renderer Draws the element onto a `CanvasRenderingContext2D`.
 * @boardier-param hitTester Returns true if a world-space point is within `tolerance` of the element.
 * @boardier-param boundsGetter Returns the axis-aligned bounding box of the element.
 */
export function registerElement(
  type: string,
  renderer: ElementRenderer,
  hitTester: ElementHitTester,
  boundsGetter: ElementBoundsGetter,
) {
  renderers[type] = renderer;
  hitTesters[type] = hitTester;
  boundsGetters[type] = boundsGetter;
}

export function renderElement(ctx: CanvasRenderingContext2D, el: BoardierElement): void {
  renderers[el.type]?.(ctx, el);
}

export function hitTestElement(el: BoardierElement, point: Vec2, tolerance: number): boolean {
  return hitTesters[el.type]?.(el, point, tolerance) ?? false;
}

export function getElementBounds(el: BoardierElement): Bounds {
  return boundsGetters[el.type]?.(el) ?? { x: el.x, y: el.y, width: el.width, height: el.height };
}

// ─── Shared default values ───────────────────────────────────────────

const BASE_DEFAULTS = {
  rotation: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'none' as const,
  strokeWidth: 2,
  opacity: 1,
  roughness: 1,
  seed: Math.floor(Math.random() * 2_000_000_000),
  locked: false,
  groupIds: [] as string[],
};

// ─── Factories ───────────────────────────────────────────────────────

function newSeed() { return Math.floor(Math.random() * 2_000_000_000); }

export function createRectangle(o: Partial<RectangleElement> = {}): RectangleElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'rectangle', x: 0, y: 0, width: 100, height: 100, borderRadius: 0, label: '', ...o };
}

export function createEllipse(o: Partial<EllipseElement> = {}): EllipseElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'ellipse', x: 0, y: 0, width: 100, height: 100, label: '', ...o };
}

export function createDiamond(o: Partial<DiamondElement> = {}): DiamondElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'diamond', x: 0, y: 0, width: 100, height: 100, label: '', ...o };
}

export function createLine(o: Partial<LineElement> = {}): LineElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'line', x: 0, y: 0, width: 0, height: 0, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], controlPoint: null, ...o };
}

export function createArrow(o: Partial<ArrowElement> = {}): ArrowElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'arrow', x: 0, y: 0, width: 0, height: 0, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], controlPoint: null, arrowheadStart: false, arrowheadEnd: true, ...o };
}

export function createFreehand(o: Partial<FreehandElement> = {}): FreehandElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'freehand', x: 0, y: 0, width: 0, height: 0, points: [], ...o };
}

export function createText(o: Partial<TextElement> = {}): TextElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'text', x: 0, y: 0, width: 10, height: 24, text: '', fontSize: 18, fontFamily: 'system-ui, sans-serif', textAlign: 'left', lineHeight: 1.4, ...o };
}

export function createIcon(o: Partial<IconElement> = {}): IconElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'icon', x: 0, y: 0, width: 48, height: 48, iconName: '', iconSet: '', svgMarkup: '', ...o };
}

export function createMarker(o: Partial<MarkerElement> = {}): MarkerElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'marker', x: 0, y: 0, width: 0, height: 0, points: [], markerWidth: 16, strokeColor: '#ffe066', ...o };
}

export function createCheckbox(o: Partial<CheckboxElement> = {}): CheckboxElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'checkbox', x: 0, y: 0, width: 140, height: 28, checked: false, label: 'Checkbox', checkSize: 20, checkColor: '#4f83ff', ...o };
}

export function createRadioGroup(o: Partial<RadioGroupElement> = {}): RadioGroupElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'radiogroup', x: 0, y: 0, width: 140, height: 80, options: ['Option A', 'Option B', 'Option C'], selectedIndex: 0, radioSize: 16, direction: 'vertical', ...o };
}

export function createFrame(o: Partial<FrameElement> = {}): FrameElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'frame', x: 0, y: 0, width: 300, height: 200, label: 'Frame', childIds: [], clipX: false, clipY: false, padding: 12, frameBackground: 'transparent', backgroundColor: 'transparent', ...o };
}

export function createImage(o: Partial<ImageElement> = {}): ImageElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'image', x: 0, y: 0, width: 200, height: 200, src: '', alt: '', objectFit: 'contain', ...o };
}

export function createEmbed(o: Partial<EmbedElement> = {}): EmbedElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'embed', x: 0, y: 0, width: 280, height: 60, url: '', title: 'Embed', ...o };
}

export function createTable(o: Partial<TableElement> = {}): TableElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'table', x: 0, y: 0, width: 300, height: 120, cols: 3, rows: 3, cells: [['', '', ''], ['', '', ''], ['', '', '']], colWidths: [100, 100, 100], rowHeights: [40, 40, 40], showHeader: true, headerBackground: 'rgba(0,0,0,0.06)', ...o };
}

export function createComment(o: Partial<CommentElement> = {}): CommentElement {
  return { ...BASE_DEFAULTS, seed: newSeed(), id: generateId(), type: 'comment', x: 0, y: 0, width: 24, height: 28, text: '', author: '', timestamp: new Date().toISOString(), resolved: false, markerColor: '#f59e0b', ...o };
}

/** Generic factory — dispatches to the correct creator based on type. */
export function createElement(type: BoardierElementType, overrides: Partial<BoardierElement> = {}): BoardierElement {
  switch (type) {
    case 'rectangle': return createRectangle(overrides as any);
    case 'ellipse':   return createEllipse(overrides as any);
    case 'diamond':   return createDiamond(overrides as any);
    case 'line':      return createLine(overrides as any);
    case 'arrow':     return createArrow(overrides as any);
    case 'freehand':  return createFreehand(overrides as any);
    case 'text':      return createText(overrides as any);
    case 'icon':      return createIcon(overrides as any);
    case 'marker':    return createMarker(overrides as any);
    case 'checkbox':  return createCheckbox(overrides as any);
    case 'radiogroup': return createRadioGroup(overrides as any);
    case 'frame':     return createFrame(overrides as any);
    case 'image':     return createImage(overrides as any);
    case 'embed':     return createEmbed(overrides as any);
    case 'table':     return createTable(overrides as any);
    case 'comment':   return createComment(overrides as any);
  }
}
