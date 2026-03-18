// Boardier — A themeable, extensible whiteboard engine
// Public API

// Main component
export { BoardierCanvas } from './ui/BoardierCanvas';
export type { BoardierCanvasProps, BoardierCanvasRef } from './ui/BoardierCanvas';

// Core types
export type {
  BoardierElement,
  BoardierElementType,
  BoardierConfig,
  BoardierLayoutConfig,
  BoardierPanelId,
  BoardierSceneData,
  BoardierAIConfig,
  ViewState,
  Vec2,
  Bounds,
  BoardierToolType,
  FillStyle,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  LineElement,
  ArrowElement,
  FreehandElement,
  TextElement,
  IconElement,
  SceneChangeHandler,
  SelectionChangeHandler,
  ViewChangeHandler,
} from './core/types';

// Theme types & presets
export type { BoardierTheme } from './themes/types';
export { defaultTheme, defaultDarkTheme } from './themes/defaultTheme';
export { createNotierTheme } from './themes/notierTheme';

// Engine (for advanced usage)
export { BoardierEngine } from './core/Engine';

// Element factories
export {
  createElement,
  createRectangle,
  createEllipse,
  createDiamond,
  createLine,
  createArrow,
  createFreehand,
  createText,
  createIcon,
} from './elements/base';

// Utils
export { exportToPNG, exportToJSON } from './utils/export';
export { generateId } from './utils/id';
export { STROKE_COLORS, FILL_COLORS, CANVAS_BACKGROUNDS, STROKE_WIDTHS, FONT_SIZES, FONT_FAMILIES, HANDWRITTEN_FONT } from './utils/colors';

// Hand-drawn rendering utilities
export { roughRect, roughEllipse, roughDiamond, roughPolyline, roughLineTo, roughBezier } from './utils/roughDraw';

// Mermaid conversion
export { mermaidToBoardier, parseMermaid } from './utils/mermaidParser';
