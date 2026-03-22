/**
 * @boardier-module ai/orchestrator
 * @boardier-category AI
 * @boardier-description Provider-agnostic AI orchestrator for the Boardier whiteboard engine.
 * Accepts a pluggable AI provider function so the host app can use any LLM backend
 * (OpenAI, Gemini, Anthropic, local models, etc.). Routes requests between local
 * handlers (mermaid, simple commands) and the remote AI provider (complex generation).
 * @boardier-since 0.2.0
 */

import type { BoardierElement, BoardierElementType } from '../core/types';
import type { BoardierEngine } from '../core/Engine';
import { createElement } from '../elements/base';
import { mermaidToBoardier } from '../utils/mermaidParser';
import { generateId } from '../utils/id';
import {
  ELEMENT_SCHEMA_PROMPT,
  DIAGRAM_HINTS,
  detectDiagramType,
  resolveColor,
  resolveFillColor,
  AI_COLOR_MAP,
  isComplexLayoutRequest,
  HTML_GENERATION_PROMPT,
} from './schema';
import { htmlToBoardier } from './htmlConverter';

// ─── Types ────────────────────────────────────────────────────────

/** Result from the AI provider. Provider should return elements as JSON. */
export interface BoardierAIResult {
  elements?: Partial<BoardierElement>[];
  command?: 'clear' | 'delete_selected' | 'select_all' | 'zoom_to_fit' | 'add_elements' | 'replace_all';
  zoomToFit?: boolean;
  error?: string;
}

/**
 * A pluggable AI provider function.
 * The host application implements this to call whatever LLM backend it wants.
 *
 * @param systemPrompt - Full system prompt including element schema, scene context, and diagram hints.
 * @param userPrompt - The user's natural language request.
 * @param options - Additional options (model hint, temperature, etc.)
 * @returns A promise resolving to a BoardierAIResult.
 *
 * The provider should parse the LLM's JSON response into a BoardierAIResult.
 * If the LLM returns a JSON object with `elements` array, the provider should
 * pass it through. If parsing fails, return `{ error: "..." }`.
 */
export type BoardierAIProvider = (
  systemPrompt: string,
  userPrompt: string,
  options?: BoardierAIProviderOptions,
) => Promise<BoardierAIResult>;

export interface BoardierAIProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** JSON schema for structured output (for providers that support it). */
  responseSchema?: Record<string, unknown>;
  /** 'json' (default) or 'html' — tells the provider/edge function which generation mode to use. */
  mode?: 'json' | 'html';
}

/** Configuration for the Boardier AI orchestrator. */
export interface BoardierAIOrchestratorConfig {
  /** The AI provider function. If not set, only local commands work. */
  provider?: BoardierAIProvider;
  /** Whether to handle simple commands (clear, zoom, color) locally without calling the provider. Default: true. */
  handleLocalCommands?: boolean;
  /** Whether to handle mermaid syntax locally. Default: true. */
  handleMermaidLocally?: boolean;
  /** Custom system prompt prefix (prepended to the schema). */
  systemPromptPrefix?: string;
  /** Maximum elements to include in scene context sent to the provider. Default: 40. */
  maxSceneContextElements?: number;
}

// ─── Local command patterns ───────────────────────────────────────

interface LocalCommandPattern {
  pattern: RegExp;
  handler: (engine: BoardierEngine, match: RegExpMatchArray) => boolean;
}

function buildLocalCommands(): LocalCommandPattern[] {
  return [
    // Clear canvas
    {
      pattern: /\b(clear|empty|erase|wipe|reset)\b.*\b(canvas|board|everything|all)\b/i,
      handler: (engine) => { engine.deleteAll(); return true; },
    },
    // Delete selected
    {
      pattern: /\b(delete|remove)\b.*\bselected\b/i,
      handler: (engine) => { engine.deleteSelected(); return true; },
    },
    // Select all
    {
      pattern: /\bselect\b.*\ball\b/i,
      handler: (engine) => { engine.selectAll(); return true; },
    },
    // Zoom to fit
    {
      pattern: /\b(zoom|fit)\b.*\b(fit|view|all|content)\b/i,
      handler: (engine) => { engine.zoomToFit(); return true; },
    },
    // Color change: "make all/selected red"
    {
      pattern: /\b(?:make|color|paint|change|set)\b.*?\b(all|selected|every|each)?\s*(?:elements?|shapes?|items?|objects?)?\s*\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|cyan|teal|indigo|lime|amber|brown|navy|maroon|olive|coral|salmon|magenta|violet)\b/i,
      handler: (engine, match) => {
        const scope = match[1];
        const color = AI_COLOR_MAP[match[2].toLowerCase()];
        if (!color) return false;
        if (scope?.toLowerCase() === 'selected') {
          const selected = engine.scene.getSelectedIds();
          for (const id of selected) engine.setElementColor(id, color);
        } else {
          for (const el of engine.scene.getElements()) engine.setElementColor(el.id, color);
        }
        return true;
      },
    },
    // Simple shape drawing: "draw 3 rectangles"
    {
      pattern: /\b(?:draw|add|create|make|place)\b\s+(\d+)?\s*\b(rectangle|rect|square|circle|ellipse|oval|diamond|rhombus|text|arrow)s?\b/i,
      handler: (engine, match) => {
        const count = Math.min(parseInt(match[1] || '1'), 20);
        const shapeType = match[2].toLowerCase();
        const elements = generateShapeGrid(engine, shapeType, count);
        if (elements.length > 0) {
          engine.addElements(elements);
          engine.selectElements(elements.map(e => e.id));
          setTimeout(() => engine.zoomToFit(), 100);
        }
        return true;
      },
    },
  ];
}

function mapShapeType(input: string): BoardierElementType {
  const map: Record<string, BoardierElementType> = {
    rectangle: 'rectangle', rect: 'rectangle', square: 'rectangle',
    circle: 'ellipse', ellipse: 'ellipse', oval: 'ellipse',
    diamond: 'diamond', rhombus: 'diamond',
    text: 'text', arrow: 'arrow',
  };
  return map[input] || 'rectangle';
}

function generateShapeGrid(engine: BoardierEngine, shapeType: string, count: number): BoardierElement[] {
  const vs = engine.getViewState();
  const canvas = engine.getCanvas();
  const centerX = (-vs.scrollX + canvas.clientWidth / 2) / vs.zoom;
  const centerY = (-vs.scrollY + canvas.clientHeight / 2) / vs.zoom;
  const spacing = 180;
  const elements: BoardierElement[] = [];

  for (let i = 0; i < count; i++) {
    const offsetX = (i % 5) * spacing - (Math.min(count, 5) - 1) * spacing / 2;
    const offsetY = Math.floor(i / 5) * 100;
    const x = centerX + offsetX - 60;
    const y = centerY + offsetY - 30;
    const type = mapShapeType(shapeType);

    if (type === 'arrow') {
      elements.push(createElement('arrow', {
        x, y: y + 40, width: 0, height: 0,
        points: [{ x: 0, y: 0 }, { x: 120, y: 0 }],
      } as any));
    } else if (type === 'text') {
      elements.push(createElement('text', {
        x, y, width: 100, height: 24, text: 'Text',
      } as any));
    } else {
      elements.push(createElement(type, {
        x, y,
        width: type === 'diamond' ? 120 : 120,
        height: type === 'diamond' ? 100 : 80,
      } as any));
    }
  }
  return elements;
}

// ─── Mermaid detection ────────────────────────────────────────────

function tryMermaidLocal(engine: BoardierEngine, prompt: string): boolean {
  // Fenced mermaid code block
  const fenced = prompt.match(/```(?:mermaid)?\s*\n?([\s\S]*?)```/);
  if (fenced) {
    try {
      const elements = mermaidToBoardier(fenced[1].trim());
      engine.addElements(elements);
      setTimeout(() => engine.zoomToFit(), 100);
      return true;
    } catch { /* fall through */ }
  }

  // Inline mermaid syntax
  const inline = prompt.match(/(?:^|\n)\s*((?:graph|flowchart)\s+(?:TB|BT|LR|RL|TD)\b[\s\S]*?)(?:\n\s*$|$)/im);
  if (inline) {
    try {
      const elements = mermaidToBoardier(inline[1].trim());
      engine.addElements(elements);
      setTimeout(() => engine.zoomToFit(), 100);
      return true;
    } catch { /* fall through */ }
  }

  return false;
}

// ─── Scene context builder ────────────────────────────────────────

function buildSceneContext(engine: BoardierEngine, maxElements: number): string {
  const summary = engine.getSceneSummary();
  const stats = engine.getSceneStats();
  const elements = engine.scene.getElements().slice(0, maxElements);

  let context = `CURRENT CANVAS STATE:\n${summary}\n`;
  context += `Total: ${stats.totalElements} elements.`;
  if (stats.bounds) {
    context += ` Bounds: (${Math.round(stats.bounds.x)},${Math.round(stats.bounds.y)}) ${Math.round(stats.bounds.width)}×${Math.round(stats.bounds.height)}.`;
  }
  context += '\n';

  if (elements.length > 0) {
    context += `\nEXISTING ELEMENTS (first ${elements.length}):\n`;
    context += JSON.stringify(elements.map(el => ({
      id: el.id,
      type: el.type,
      x: Math.round(el.x),
      y: Math.round(el.y),
      width: Math.round(el.width),
      height: Math.round(el.height),
      label: (el as any).label || (el as any).text || undefined,
      strokeColor: el.strokeColor,
      backgroundColor: el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
    })), null, 0);
    context += '\n';
  }

  // Selection context
  const selectedIds = engine.scene.getSelectedIds();
  if (selectedIds.length > 0) {
    context += `\nSELECTED ELEMENT IDS: ${JSON.stringify(selectedIds)}\n`;
  }

  return context;
}

// ─── System prompt builder ────────────────────────────────────────

function buildSystemPrompt(
  engine: BoardierEngine,
  userPrompt: string,
  config: BoardierAIOrchestratorConfig,
): string {
  let prompt = '';

  if (config.systemPromptPrefix) {
    prompt += config.systemPromptPrefix + '\n\n';
  }

  prompt += `You are an AI assistant that generates whiteboard diagrams. Given a user request, produce a JSON response with elements to add to the canvas.\n\n`;
  prompt += ELEMENT_SCHEMA_PROMPT + '\n';

  // Inject diagram-specific hints
  const diagramType = detectDiagramType(userPrompt);
  if (diagramType && DIAGRAM_HINTS[diagramType]) {
    prompt += `\nDIAGRAM TYPE DETECTED: ${diagramType}\n${DIAGRAM_HINTS[diagramType]}\n`;
  }

  // Scene context
  const maxEl = config.maxSceneContextElements ?? 40;
  prompt += '\n' + buildSceneContext(engine, maxEl);

  prompt += `\nIMPORTANT INSTRUCTIONS:
- Return valid JSON: { "elements": [...], "zoomToFit": true }
- Each element must have a unique "id" field (format "ai_0", "ai_1", ...).
- Position elements thoughtfully — avoid overlapping.
- For connections, use arrow elements with points relative to their x,y.
- If the user asks to modify existing elements, return a "command" field instead: "clear", "delete_selected", "select_all", or "zoom_to_fit".
- For adding elements to existing canvas, your elements will be ADDED (not replacing existing ones).
`;

  return prompt;
}

// ─── Main orchestrator ────────────────────────────────────────────

/**
 * Process a natural language AI request against a Boardier engine.
 *
 * Routes:
 * 1. Local commands (clear, zoom, color, simple shapes) → handled immediately
 * 2. Mermaid syntax → parsed locally via mermaidToBoardier
 * 3. Complex requests → sent to the AI provider with full schema + scene context
 *
 * @param engine The BoardierEngine instance to operate on.
 * @param prompt The user's natural language prompt.
 * @param config Orchestrator configuration including the AI provider.
 * @returns A result object indicating what happened.
 */
export async function processAIRequest(
  engine: BoardierEngine,
  prompt: string,
  config: BoardierAIOrchestratorConfig = {},
): Promise<BoardierAIResult> {
  const handleLocal = config.handleLocalCommands !== false;
  const handleMermaid = config.handleMermaidLocally !== false;

  // 1. Try local commands
  if (handleLocal) {
    const commands = buildLocalCommands();
    for (const cmd of commands) {
      const match = prompt.match(cmd.pattern);
      if (match && cmd.handler(engine, match)) {
        return { command: 'clear' }; // Generic success for local commands
      }
    }
  }

  // 2. Try mermaid
  if (handleMermaid && tryMermaidLocal(engine, prompt)) {
    return { command: 'add_elements' };
  }

  // 3. Send to AI provider
  if (!config.provider) {
    // No provider — do simple flowchart fallback
    return handleFlowchartFallback(engine, prompt);
  }

  // Detect whether this is a complex visual layout request (HTML mode)
  const useHtmlMode = isComplexLayoutRequest(prompt);

  if (useHtmlMode) {
    // ── HTML generation mode ──
    // For complex layouts (landing pages, dashboards, wireframes etc.)
    // we ask the AI to generate HTML, then convert it to Boardier elements.
    const htmlSystemPrompt = (config.systemPromptPrefix ? config.systemPromptPrefix + '\n\n' : '') + HTML_GENERATION_PROMPT;
    try {
      const result = await config.provider(htmlSystemPrompt, prompt, {
        temperature: 0.4,
        maxTokens: 8192,
        mode: 'html',
      });

      // The provider should return { html: "..." } for HTML mode
      if (result.error) return result;

      const html = (result as any).html;
      if (html && typeof html === 'string') {
        const elements = htmlToBoardier(html);
        if (elements.length > 0) {
          engine.addElements(elements);
          setTimeout(() => engine.zoomToFit(), 100);
          return { command: 'add_elements', elements };
        }
        return { error: 'HTML conversion produced no elements' };
      }

      // Fallback: if provider returned elements instead of HTML (non-HTML-aware provider)
      if (result.elements && result.elements.length > 0) {
        const created = materializeElements(result.elements);
        engine.addElements(created);
        setTimeout(() => engine.zoomToFit(), 100);
        return { command: 'add_elements', elements: created };
      }

      return { error: 'AI returned no usable content' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'HTML generation error' };
    }
  }

  // ── JSON element generation mode ──
  const systemPrompt = buildSystemPrompt(engine, prompt, config);
  try {
    const result = await config.provider(systemPrompt, prompt, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    if (result.error) return result;

    // Handle command results
    if (result.command) {
      switch (result.command) {
        case 'clear': engine.deleteAll(); break;
        case 'delete_selected': engine.deleteSelected(); break;
        case 'select_all': engine.selectAll(); break;
        case 'zoom_to_fit': engine.zoomToFit(); break;
        case 'replace_all':
          if (result.elements) {
            const created = materializeElements(result.elements);
            engine.deleteAll();
            engine.addElements(created);
          }
          break;
        case 'add_elements':
          if (result.elements) {
            const created = materializeElements(result.elements);
            engine.addElements(created);
          }
          break;
      }
      if (result.zoomToFit) setTimeout(() => engine.zoomToFit(), 100);
      return result;
    }

    // Default: add elements
    if (result.elements && result.elements.length > 0) {
      const created = materializeElements(result.elements);
      engine.addElements(created);
      if (result.zoomToFit !== false) {
        setTimeout(() => engine.zoomToFit(), 100);
      }
      return { command: 'add_elements', elements: created };
    }

    return { error: 'AI returned no elements' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI provider error' };
  }
}

/**
 * Materialize partial element descriptions (from AI) into full BoardierElements.
 * Uses createElement factories to fill in defaults, then applies AI overrides.
 */
export function materializeElements(partials: Partial<BoardierElement>[]): BoardierElement[] {
  const elements: BoardierElement[] = [];
  const idMap: Record<string, string> = {};

  // First pass: create elements and build ID mapping
  for (const partial of partials) {
    const type = (partial.type || 'rectangle') as BoardierElementType;
    const aiId = partial.id || `ai_${elements.length}`;

    // Clean up the partial — remove fields that shouldn't override defaults badly
    const clean = { ...partial };
    delete clean.id; // We'll assign our own

    // Resolve color names to hex
    if (clean.strokeColor) {
      const resolved = resolveColor(clean.strokeColor);
      if (resolved) clean.strokeColor = resolved;
    }
    if (clean.backgroundColor) {
      const resolved = resolveFillColor(clean.backgroundColor);
      if (resolved) {
        clean.backgroundColor = resolved;
        if (!clean.fillStyle || clean.fillStyle === 'none') clean.fillStyle = 'solid';
      }
    }

    const el = createElement(type, clean as any);
    idMap[aiId] = el.id;
    elements.push(el);
  }

  // Second pass: remap binding IDs (arrows referencing other elements by AI id)
  for (const el of elements) {
    if (el.type === 'arrow' || el.type === 'line') {
      const arrow = el as any;
      if (arrow.startBindingId && idMap[arrow.startBindingId]) {
        arrow.startBindingId = idMap[arrow.startBindingId];
      }
      if (arrow.endBindingId && idMap[arrow.endBindingId]) {
        arrow.endBindingId = idMap[arrow.endBindingId];
      }
    }
    if (el.type === 'frame') {
      const frame = el as any;
      if (frame.childIds?.length) {
        frame.childIds = frame.childIds.map((cid: string) => idMap[cid] || cid);
      }
    }
    // Remap groupIds
    if (el.groupIds?.length) {
      // Group IDs are kept as-is (they're shared strings, not element IDs)
    }
  }

  return elements;
}

// ─── Flowchart fallback (no provider) ─────────────────────────────

function handleFlowchartFallback(engine: BoardierEngine, prompt: string): BoardierAIResult {
  const lower = prompt.toLowerCase();
  const flowMatch = lower.match(/\b(?:flowchart|flow|diagram|process)\b[:\s]+(.+)/);

  if (flowMatch) {
    const nodes = flowMatch[1].split(/\s*(?:->|→|-->)\s*/).map(s => s.trim()).filter(Boolean);
    if (nodes.length >= 2) {
      const elements: BoardierElement[] = [];
      const vs = engine.getViewState();
      const canvas = engine.getCanvas();
      const startX = (-vs.scrollX + 100) / vs.zoom;
      const startY = (-vs.scrollY + canvas.clientHeight / 2) / vs.zoom - 30;
      const nodeW = 140, nodeH = 60, gap = 60;

      for (let i = 0; i < nodes.length; i++) {
        const x = startX + i * (nodeW + gap);
        elements.push(createElement('rectangle', {
          x, y: startY, width: nodeW, height: nodeH,
          borderRadius: 8, label: nodes[i],
        } as any));
      }
      for (let i = 0; i < nodes.length - 1; i++) {
        const x = startX + i * (nodeW + gap) + nodeW;
        elements.push(createElement('arrow', {
          x, y: startY + nodeH / 2,
          width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: gap, y: 0 }],
        } as any));
      }

      engine.addElements(elements);
      setTimeout(() => engine.zoomToFit(), 100);
      return { command: 'add_elements' };
    }
  }

  // Final fallback: add prompt as text
  const vs = engine.getViewState();
  const canvas = engine.getCanvas();
  const cx = (-vs.scrollX + canvas.clientWidth / 2) / vs.zoom;
  const cy = (-vs.scrollY + canvas.clientHeight / 2) / vs.zoom;
  engine.addElements([createElement('text', {
    x: cx - 100, y: cy - 12, width: 200, height: 24,
    text: prompt, fontSize: 16, textAlign: 'center',
  } as any)]);

  return { command: 'add_elements' };
}

// ─── Convenience: parse raw JSON response from any LLM ────────────

/**
 * Helper to parse a raw LLM text response into a BoardierAIResult.
 * Useful for implementing simple AI providers — just pass the raw completion text.
 *
 * Handles:
 * - Clean JSON: `{ "elements": [...] }`
 * - JSON in markdown code blocks: ```json ... ```
 * - Extracts elements from the first JSON object found
 */
export function parseLLMResponse(text: string): BoardierAIResult {
  // Try to extract JSON from markdown code blocks
  const codeBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const jsonStr = codeBlock ? codeBlock[1].trim() : text.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.elements && Array.isArray(parsed.elements)) {
      return {
        elements: parsed.elements,
        command: parsed.command || 'add_elements',
        zoomToFit: parsed.zoomToFit ?? true,
      };
    }
    // Maybe it's a direct array
    if (Array.isArray(parsed)) {
      return { elements: parsed, command: 'add_elements', zoomToFit: true };
    }
    return { error: 'Response does not contain elements array' };
  } catch {
    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*"elements"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          elements: parsed.elements,
          command: parsed.command || 'add_elements',
          zoomToFit: parsed.zoomToFit ?? true,
        };
      } catch { /* fall through */ }
    }
    return { error: 'Failed to parse AI response as JSON' };
  }
}
