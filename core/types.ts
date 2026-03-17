// ─── Boardier Core Types ─────────────────────────────────────────────
// All type definitions for the Boardier whiteboard engine.
// No runtime dependencies — pure type declarations.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Element Types ───────────────────────────────────────────────────

export type BoardierElementType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text';

export type FillStyle = 'none' | 'solid';

/** Fields shared by every element on the canvas. */
export interface BoardierElementBase {
  id: string;
  type: BoardierElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;          // radians (Phase 1: always 0)
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  opacity: number;           // 0–1
  roughness: number;         // 0 = clean, 1 = hand-drawn, 2 = sketchy
  seed: number;              // stable random seed for hand-drawn consistency
  locked: boolean;
  groupIds: string[];
}

export interface RectangleElement extends BoardierElementBase {
  type: 'rectangle';
  borderRadius: number;
}

export interface EllipseElement extends BoardierElementBase {
  type: 'ellipse';
}

export interface DiamondElement extends BoardierElementBase {
  type: 'diamond';
}

/**
 * Line & Arrow share a `points` array.
 * Points are relative to (x, y).
 * width/height = extent of those points.
 */
export interface LineElement extends BoardierElementBase {
  type: 'line';
  points: Vec2[];
}

export interface ArrowElement extends BoardierElementBase {
  type: 'arrow';
  points: Vec2[];
  arrowheadStart: boolean;
  arrowheadEnd: boolean;
}

export interface FreehandElement extends BoardierElementBase {
  type: 'freehand';
  points: Vec2[];
}

export interface TextElement extends BoardierElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

/** Discriminated union of all element shapes. */
export type BoardierElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LineElement
  | ArrowElement
  | FreehandElement
  | TextElement;

// ─── Tool Types ──────────────────────────────────────────────────────

export type BoardierToolType =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text'
  | 'pan'
  | 'eraser';

// ─── View State ──────────────────────────────────────────────────────

export interface ViewState {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

// ─── Scene Data (serialisation format stored in DB) ──────────────────

export interface BoardierSceneData {
  engine: 'boardier';
  elements: BoardierElement[];
  viewState: ViewState;
}

// ─── Config ──────────────────────────────────────────────────────────

export interface BoardierConfig {
  readOnly?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

// ─── AI Config (Phase 3 — placeholder) ───────────────────────────────

export interface BoardierAIConfig {
  /** The developer provides their own key; Boardier never ships one. */
  apiKey: string;
  model?: string;
  endpoint?: string;
}

// ─── Event handler signatures ────────────────────────────────────────

export type SceneChangeHandler = (elements: BoardierElement[]) => void;
export type SelectionChangeHandler = (selectedIds: string[]) => void;
export type ViewChangeHandler = (viewState: ViewState) => void;
