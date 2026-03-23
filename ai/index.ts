/**
 * @boardier-module ai/index
 * @boardier-category AI
 * @boardier-description Barrel export for all Boardier AI modules.
 * @boardier-since 0.2.0
 * @boardier-changed 0.3.0 Added chatClient exports for client-side AI chat functionality
 */

// Orchestrator (main entry point for AI interaction)
export {
  processAIRequest,
  materializeElements,
  parseLLMResponse,
  type BoardierAIResult,
  type BoardierAIProvider,
  type BoardierAIProviderOptions,
  type BoardierAIOrchestratorConfig,
} from './orchestrator';

// Schema (for building LLM prompts)
export {
  ELEMENT_SCHEMA_PROMPT,
  DIAGRAM_HINTS,
  AI_COLOR_MAP,
  AI_FILL_MAP,
  detectDiagramType,
  resolveColor,
  resolveFillColor,
  isComplexLayoutRequest,
  HTML_GENERATION_PROMPT,
  HTML_MODIFY_PROMPT,
} from './schema';

// HTML converter
export {
  htmlToBoardier,
  describeElements,
} from './htmlConverter';

// Layout algorithms
export {
  layoutGrid,
  layoutTree,
  layoutFlow,
  layoutRadial,
  layoutForce,
  type LayoutOptions,
  type ForceLayoutOptions,
} from './layout';

// Style presets & transfer
export {
  STYLE_PRESETS,
  getPreset,
  listPresets,
  applyPreset,
  detectStylePreset,
  extractStyle,
  applyStyle,
  type StylePreset,
  type ElementStyle,
} from './styles';

// Chat client (client-side AI chat with multi-provider support)
export {
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
} from './chatClient';
