/**
 * @boardier-module core/types
 * @boardier-category Core
 * @boardier-description All type definitions for the Boardier whiteboard engine. This module contains zero runtime code — it is purely TypeScript type declarations used across every other module. Import only what you need for tree-shaking.
 * @boardier-since 0.1.0
 * @boardier-changed 0.2.0 Added zigzag and zigzag-line to the FillStyle union type
 * @boardier-changed 0.3.0 Added AIChatProvider, AIChatMessage, and AIChatConfig types for the AI chat popup component
 * @boardier-changed 0.3.2 Added showDarkModeToggle option to BoardierConfig
 */

// ─── Boardier Core Types ─────────────────────────────────────────────
// All type definitions for the Boardier whiteboard engine.
// No runtime dependencies — pure type declarations.

/**
 * @boardier-type Vec2
 * @boardier-description 2D vector / point used for positions, offsets, and control points throughout the engine.
 * @boardier-usage `const pos: Vec2 = { x: 100, y: 200 };`
 */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * @boardier-type Bounds
 * @boardier-description Axis-aligned bounding box used for hit-testing, viewport culling, and layout calculations.
 * @boardier-usage `const b: Bounds = { x: 0, y: 0, width: 100, height: 50 };`
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Element Types ───────────────────────────────────────────────────

/**
 * @boardier-type BoardierElementType
 * @boardier-description Union of all element type string identifiers. Used as the discriminant in the `BoardierElement` union and as keys in the element registry.
 */
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
  | 'image'
  | 'embed'
  | 'table'
  | 'comment';

/**
 * @boardier-type FillStyle
 * @boardier-description Available fill patterns for shape elements. `hachure`, `cross-hatch`, `zigzag`, and `zigzag-line` use the rough.js hand-drawn rendering engine.
 */
export type FillStyle = 'none' | 'solid' | 'hachure' | 'cross-hatch' | 'dots' | 'zigzag' | 'zigzag-line';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

/**
 * @boardier-type BoardierElementBase
 * @boardier-description Fields shared by every element on the canvas. All concrete element interfaces extend this base. When creating elements, prefer using the factory functions in `elements/base.ts` which supply sensible defaults.
 * @boardier-see createElement
 */
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
  /** Stroke dash style */
  strokeStyle?: StrokeStyle;
  /** Optional shadow: CSS-style "offsetX offsetY blur color" */
  shadow?: string;
}

export interface RectangleElement extends BoardierElementBase {
  type: 'rectangle';
  borderRadius: number;
  /** Per-corner radii: [topLeft, topRight, bottomRight, bottomLeft]. If set, overrides borderRadius. */
  borderRadii?: [number, number, number, number];
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
  /** ID of element bound to start point */
  startBindingId?: string | null;
  /** ID of element bound to end point */
  endBindingId?: string | null;
}

export interface ArrowElement extends BoardierElementBase {
  type: 'arrow';
  points: Vec2[];
  controlPoint: Vec2 | null;
  arrowheadStart: boolean;
  arrowheadEnd: boolean;
  /** ID of element bound to start point */
  startBindingId?: string | null;
  /** ID of element bound to end point */
  endBindingId?: string | null;
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

/**
 * @boardier-type BoardierElement
 * @boardier-description Discriminated union of all element shapes. Narrow by checking `element.type` to access shape-specific fields. This is the primary type passed around the engine.
 * @boardier-usage `if (el.type === 'rectangle') { console.log(el.borderRadius); }`
 */
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
  | 'image'
  | 'embed'
  | 'table'
  | 'comment'
  | 'pan'
  | 'eraser';

// ─── View State ──────────────────────────────────────────────────────

/**
 * @boardier-type ViewState
 * @boardier-description Camera state for the canvas viewport. `scrollX`/`scrollY` are in world-space pixels; `zoom` is a multiplier (1 = 100%).
 * @boardier-usage `engine.setViewState({ scrollX: 0, scrollY: 0, zoom: 1.5 });`
 */
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

/**
 * @boardier-type BoardierSceneData
 * @boardier-description Serialisation format for persisting an entire whiteboard scene. Can be stored in a database, exported as JSON, or loaded back in.
 * @boardier-usage `const json = engine.getSceneData(); localStorage.setItem('scene', JSON.stringify(json));`
 */
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

/**
 * @boardier-type BoardierConfig
 * @boardier-description Configuration object passed to `BoardierCanvas` or `BoardierEngine`. All fields are optional — defaults are applied internally.
 * @boardier-usage `<BoardierCanvas config={{ readOnly: true, showGrid: false }} />`
 */
export interface BoardierConfig {
  readOnly?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Show a light/dark mode toggle button on the canvas. Defaults to true. */
  showDarkModeToggle?: boolean;
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

/**
 * @boardier-type BoardierAIConfig
 * @boardier-description Configuration for AI-assisted features (Phase 3). Boardier never ships API keys — the developer provides their own.
 * @boardier-usage `const aiConfig: BoardierAIConfig = { apiKey: process.env.OPENAI_KEY!, model: 'gpt-4' };`
 */
export interface BoardierAIConfig {
  /** The developer provides their own key; Boardier never ships one. */
  apiKey: string;
  model?: string;
  endpoint?: string;
}

// ─── AI Chat Types ───────────────────────────────────────────────────

/**
 * @boardier-type AIChatProvider
 * @boardier-description Supported AI providers for the floating AI chat component.
 * @boardier-since 0.3.0
 */
export type AIChatProvider = 'openai' | 'anthropic' | 'gemini';

/**
 * @boardier-type AIChatMessage
 * @boardier-description A single message in the AI chat conversation history.
 * @boardier-since 0.3.0
 */
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Optional metadata about elements created/modified by this message */
  elementIds?: string[];
}

/**
 * @boardier-type AIChatConfig
 * @boardier-description Configuration for the floating AI chat popup component.
 * @boardier-since 0.3.0
 * @boardier-usage `<AIChatPopup config={{ defaultProvider: 'openai', allowHTMLMode: true }} />`
 */
export interface AIChatConfig {
  /** Whether the AI chat is enabled. Default: true. Set to false to completely disable. */
  enabled?: boolean;
  /** Default AI provider. User can switch in the UI. */
  defaultProvider?: AIChatProvider;
  /** Custom models per provider. If not set, uses sensible defaults. */
  models?: Partial<Record<AIChatProvider, string>>;
  /** Whether to allow HTML generation mode (smart editing). Default: true. */
  allowHTMLMode?: boolean;
  /** Whether to persist API keys in localStorage. Default: true. */
  persistKeys?: boolean;
  /** Custom system prompt prefix. */
  systemPromptPrefix?: string;
  /** Maximum conversation history to send to the AI. Default: 20 messages. */
  maxHistory?: number;
  /** Temperature for AI responses. Default: 0.7. */
  temperature?: number;
  /** Maximum tokens in response. Default: 4096. */
  maxTokens?: number;
  /** Position of the chat popup. Default: 'bottom-right'. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom placeholder text for the input. */
  placeholder?: string;
  /** Whether to show the provider selector. Default: true. */
  showProviderSelector?: boolean;
  /** Pre-filled API keys (if the developer wants to provide them). Keys are per-provider. */
  apiKeys?: Partial<Record<AIChatProvider, string>>;
  /** Callback when elements are created/modified by AI */
  onElementsGenerated?: (elements: BoardierElement[]) => void;
}

// ─── Event handler signatures ────────────────────────────────────────

export type SceneChangeHandler = (elements: BoardierElement[]) => void;
export type SelectionChangeHandler = (selectedIds: string[]) => void;
export type ViewChangeHandler = (viewState: ViewState) => void;
