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
  }
}
