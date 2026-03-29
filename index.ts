/**
 * @boardier-module index
 * @boardier-category Public API
 * @boardier-description Main entry point for the Boardier library. Re-exports all public components, types, themes, element factories, engine, utilities, and rendering helpers. Import from this module for the cleanest consumer experience.
 * @boardier-since 0.1.0
 * @boardier-changed 0.3.0 Added AIChatPopup component and AI chat client exports for client-side multi-provider AI integration
 * @boardier-changed 0.5.0 Added CollaborationProvider, CollabOverlay, RemoteCursors, and collaboration types for real-time multiplayer
 * @boardier-usage `import { BoardierCanvas, defaultTheme, createElement } from 'boardier';`
 */

// Boardier — A themeable, extensible whiteboard engine
// Public API

// Main component
export { BoardierCanvas } from './ui/BoardierCanvas';
export type { BoardierCanvasProps, BoardierCanvasRef } from './ui/BoardierCanvas';

// AI Chat component
export { AIChatPopup } from './ui/AIChatPopup';
export type { AIChatPopupProps } from './ui/AIChatPopup';

// Tooltip component (for developer theming)
export { Tooltip } from './ui/Tooltip';

// New UI components
export { Minimap } from './ui/Minimap';
export { PageNavigator } from './ui/PageNavigator';
export { PresentationMode } from './ui/PresentationMode';

// Core types
export type {
  BoardierElement,
  BoardierElementType,
  BoardierConfig,
  BoardierLayoutConfig,
  BoardierPanelId,
  BoardierSceneData,
  BoardierAIConfig,
  AIChatProvider,
  AIChatMessage,
  AIChatConfig,
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
  MarkerElement,
  CheckboxElement,
  RadioGroupElement,
  FrameElement,
  ImageElement,
  EmbedElement,
  TableElement,
  CommentElement,
  BoardierPage,
  SceneChangeHandler,
  SelectionChangeHandler,
  ViewChangeHandler,
  CollaborationConfig,
  CollaborationUser,
  JoinRequest,
  CollabEvent,
} from './core/types';

// Theme types & presets
export type { BoardierTheme } from './themes/types';
export { defaultTheme, defaultDarkTheme } from './themes/defaultTheme';
export { createNotierTheme } from './themes/notierTheme';

// Engine (for advanced usage)
export { BoardierEngine } from './core/Engine';

// Collaboration (multiplayer)
export { CollaborationProvider } from './core/Collaboration';
export { CollabOverlay } from './ui/CollabOverlay';
export { RemoteCursors } from './ui/RemoteCursors';

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
  createMarker,
  createCheckbox,
  createRadioGroup,
  createFrame,
  createImage,
  createEmbed,
  createTable,
  createComment,
} from './elements/base';

// Utils
export { exportToPNG, exportToJSON, exportToSVG } from './utils/export';
export { generateId } from './utils/id';
export { STROKE_COLORS, FILL_COLORS, CANVAS_BACKGROUNDS, STROKE_WIDTHS, FONT_SIZES, FONT_FAMILIES, HANDWRITTEN_FONT } from './utils/colors';

// Hand-drawn rendering utilities
export { roughRect, roughEllipse, roughDiamond, roughPolyline, roughLineTo, roughBezier } from './utils/roughDraw';

// Mermaid conversion
export { mermaidToBoardier, parseMermaid } from './utils/mermaidParser';

// AI module
export {
  processAIRequest,
  materializeElements,
  parseLLMResponse,
  type BoardierAIResult,
  type BoardierAIProvider,
  type BoardierAIProviderOptions,
  type BoardierAIOrchestratorConfig,
  ELEMENT_SCHEMA_PROMPT,
  DIAGRAM_HINTS,
  AI_COLOR_MAP,
  AI_FILL_MAP,
  detectDiagramType,
  resolveColor,
  resolveFillColor,
  layoutGrid,
  layoutTree,
  layoutFlow,
  layoutRadial,
  layoutForce,
  type LayoutOptions,
  type ForceLayoutOptions,
  STYLE_PRESETS,
  getPreset,
  listPresets,
  applyPreset,
  detectStylePreset,
  extractStyle,
  applyStyle,
  type StylePreset,
  type ElementStyle,
  // Chat client (v0.3.0)
  sendChatRequest,
  validateApiKeyFormat,
  getProviderDisplayName,
  getStoredApiKey,
  setStoredApiKey,
  DEFAULT_MODELS,
  API_KEY_STORAGE_PREFIX,
  type ChatClientConfig,
  type ChatRequest,
  type ChatResponse,
} from './ai';
