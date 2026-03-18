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
  | 'text'
  | 'icon'
  | 'marker'
  | 'checkbox'
  | 'radiogroup'
  | 'frame'
  | 'connector'
  | 'stickynote'
  | 'image'
  | 'embed'
  | 'table'
  | 'comment';

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
  /** Optional shadow: CSS-style "offsetX offsetY blur color" */
  shadow?: string;
}

export interface RectangleElement extends BoardierElementBase {
  type: 'rectangle';
  borderRadius: number;
  label: string;
}

export interface EllipseElement extends BoardierElementBase {
  type: 'ellipse';
  label: string;
}

export interface DiamondElement extends BoardierElementBase {
  type: 'diamond';
  label: string;
}

/**
 * Line & Arrow share a `points` array.
 * Points are relative to (x, y).
 * width/height = extent of those points.
 * controlPoint (optional, relative) bends the line into a quadratic bezier.
 */
export interface LineElement extends BoardierElementBase {
  type: 'line';
  points: Vec2[];
  controlPoint: Vec2 | null;
}

export interface ArrowElement extends BoardierElementBase {
  type: 'arrow';
  points: Vec2[];
  controlPoint: Vec2 | null;
  arrowheadStart: boolean;
  arrowheadEnd: boolean;
}

export interface FreehandElement extends BoardierElementBase {
  type: 'freehand';
  points: Vec2[];
  /** Per-point pressure values from stylus (0–1). If present, strokeWidth varies. */
  pressures?: number[];
}

export interface TextElement extends BoardierElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  /** Map of icon placeholder key → SVG markup for inline icons. e.g. { "FiSearch": "<svg...>" } */
  inlineIcons?: Record<string, string>;
}

export interface IconElement extends BoardierElementBase {
  type: 'icon';
  /** react-icons identifier, e.g. "FiSearch" */
  iconName: string;
  /** Icon set prefix, e.g. "fi", "md", "fa" */
  iconSet: string;
  /** Pre-rendered SVG markup for canvas rendering */
  svgMarkup: string;
}

/** Marker / highlighter stroke. Like freehand but with wide, translucent strokes. */
export interface MarkerElement extends BoardierElementBase {
  type: 'marker';
  points: Vec2[];
  /** Marker tip width in pixels */
  markerWidth: number;
}

/** Interactive checkbox element. */
export interface CheckboxElement extends BoardierElementBase {
  type: 'checkbox';
  checked: boolean;
  label: string;
  /** Checkbox box size in pixels */
  checkSize: number;
  /** Color of the checkmark / checked fill */
  checkColor: string;
}

/** Interactive radio-button group. */
export interface RadioGroupElement extends BoardierElementBase {
  type: 'radiogroup';
  options: string[];
  /** Index of the selected option (-1 = none) */
  selectedIndex: number;
  /** Radio circle size in pixels */
  radioSize: number;
  /** Layout direction */
  direction: 'vertical' | 'horizontal';
}

/** Frame container that groups child elements and optionally scrolls. */
export interface FrameElement extends BoardierElementBase {
  type: 'frame';
  label: string;
  /** IDs of elements visually grouped inside this frame */
  childIds: string[];
  /** Whether X-axis content clips / scrolls */
  clipX: boolean;
  /** Whether Y-axis content clips / scrolls */
  clipY: boolean;
  /** Frame padding in pixels */
  padding: number;
  /** Background color of the frame body */
  frameBackground: string;
}

/** Smart connector that links two elements with auto-routing. */
export interface ConnectorElement extends BoardierElementBase {
  type: 'connector';
  /** Source element ID */
  startId: string;
  /** Target element ID */
  endId: string;
  /** Anchor port on source: 'top' | 'right' | 'bottom' | 'left' | 'auto' */
  startPort: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  /** Anchor port on target */
  endPort: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  /** Computed path points (world coords, relative to x,y) */
  pathPoints: Vec2[];
  /** Arrowhead at end */
  arrowheadEnd: boolean;
  /** Arrowhead at start */
  arrowheadStart: boolean;
  /** Line style: straight, elbow, or curved */
  lineStyle: 'straight' | 'elbow' | 'curved';
  /** Label on the connector */
  label: string;
}

/** Sticky note element — colored square with editable text. */
export interface StickyNoteElement extends BoardierElementBase {
  type: 'stickynote';
  text: string;
  fontSize: number;
  fontFamily: string;
  /** Note color presets */
  noteColor: string;
}

/** Image element rendered on the canvas. */
export interface ImageElement extends BoardierElementBase {
  type: 'image';
  /** Data URL or external URL of the image */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Object-fit style */
  objectFit: 'contain' | 'cover' | 'fill';
}

/** Embedded web content element (rendered as a placeholder on canvas). */
export interface EmbedElement extends BoardierElementBase {
  type: 'embed';
  /** URL to embed */
  url: string;
  /** Display title */
  title: string;
}

/** Grid / table element with rows and columns. */
export interface TableElement extends BoardierElementBase {
  type: 'table';
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
  /** 2D array of cell text values [row][col] */
  cells: string[][];
  /** Column widths (proportional) */
  colWidths: number[];
  /** Row heights (proportional) */
  rowHeights: number[];
  /** Whether to show header row with distinct styling */
  showHeader: boolean;
  /** Header background color */
  headerBackground: string;
}

/** Comment / annotation pinned to a location. */
export interface CommentElement extends BoardierElementBase {
  type: 'comment';
  /** Comment text content */
  text: string;
  /** Author name / identifier */
  author: string;
  /** ISO timestamp */
  timestamp: string;
  /** Whether the comment is resolved */
  resolved: boolean;
  /** Comment marker color */
  markerColor: string;
}

/** Discriminated union of all element shapes. */
export type BoardierElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LineElement
  | ArrowElement
  | FreehandElement
  | TextElement
  | IconElement
  | MarkerElement
  | CheckboxElement
  | RadioGroupElement
  | FrameElement
  | ConnectorElement
  | StickyNoteElement
  | ImageElement
  | EmbedElement
  | TableElement
  | CommentElement;

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
  | 'icon'
  | 'marker'
  | 'checkbox'
  | 'radiogroup'
  | 'frame'
  | 'connector'
  | 'stickynote'
  | 'image'
  | 'embed'
  | 'table'
  | 'comment'
  | 'pan'
  | 'eraser';

// ─── View State ──────────────────────────────────────────────────────

export interface ViewState {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

// ─── Scene Data (serialisation format stored in DB) ──────────────────

/** A single page/slide within the scene. */
export interface BoardierPage {
  id: string;
  name: string;
  elements: BoardierElement[];
}

export interface BoardierSceneData {
  engine: 'boardier';
  elements: BoardierElement[];  // default page elements (backwards compat)
  viewState: ViewState;
  /** Multi-page data. If absent, single-page mode. */
  pages?: BoardierPage[];
  /** Active page ID for multi-page mode. */
  activePageId?: string;
}

// ─── Config ──────────────────────────────────────────────────────────

export interface BoardierConfig {
  readOnly?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Layout configuration for UI panels (toolbar, zoom, export) */
  layout?: BoardierLayoutConfig;
}

/** Configuration for the draggable layout system */
export interface BoardierLayoutConfig {
  /** When true, panels cannot be dragged by the user */
  locked?: boolean;
  /** Panel IDs to hide completely */
  hidden?: BoardierPanelId[];
  /** Rectangular zones where panels cannot be dropped (in % of container: 0-100) */
  noDropZones?: Array<{ x: number; y: number; width: number; height: number }>;
  /** Override default positions for panels */
  positions?: Partial<Record<BoardierPanelId, { top?: number; left?: number; right?: number; bottom?: number }>>;
}

export type BoardierPanelId = 'toolbar' | 'zoom' | 'export' | 'backToContent';

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
