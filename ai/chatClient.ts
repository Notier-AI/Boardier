/**
 * @boardier-module ai/chatClient
 * @boardier-category AI
 * @boardier-description Client-side AI chat utilities for calling OpenAI, Anthropic, and Gemini APIs.
 * Provides a unified interface for sending chat requests to multiple LLM providers directly
 * from the browser. API keys are provided by the user at runtime.
 * @boardier-since 0.3.0
 * @boardier-changed 0.3.1 Auto-increase maxTokens for HTML mode, improved response parsing
 */

import type { AIChatProvider, AIChatMessage, BoardierElement } from '../core/types';
import {
  ELEMENT_SCHEMA_PROMPT,
  DIAGRAM_HINTS,
  detectDiagramType,
  isComplexLayoutRequest,
  HTML_GENERATION_PROMPT,
} from './schema';
import { describeElements } from './htmlConverter';

// ─── Types ────────────────────────────────────────────────────────────

export interface ChatClientConfig {
  provider: AIChatProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptPrefix?: string;
}

export interface ChatRequest {
  userMessage: string;
  conversationHistory?: AIChatMessage[];
  sceneContext?: BoardierElement[];
  selectedElementIds?: string[];
  mode?: 'json' | 'html' | 'auto';
}

export interface ChatResponse {
  content: string;
  elements?: Partial<BoardierElement>[];
  command?: 'clear' | 'delete_selected' | 'select_all' | 'zoom_to_fit' | 'add_elements' | 'replace_all';
  zoomToFit?: boolean;
  error?: string;
  rawHtml?: string;
}

// ─── Default Models ───────────────────────────────────────────────────

export const DEFAULT_MODELS: Record<AIChatProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-3-flash-preview',
};

// ─── Provider Endpoints ───────────────────────────────────────────────

const ENDPOINTS: Record<AIChatProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
};

// ─── Main Chat Function ───────────────────────────────────────────────

/**
 * Send a chat request to the specified AI provider.
 * Handles all provider-specific formatting and response parsing.
 */
export async function sendChatRequest(
  config: ChatClientConfig,
  request: ChatRequest,
): Promise<ChatResponse> {
  const { provider, apiKey, model, temperature = 0.7, maxTokens = 4096, systemPromptPrefix = '' } = config;
  const { userMessage, conversationHistory = [], sceneContext = [], selectedElementIds = [], mode = 'auto' } = request;

  if (!apiKey) {
    return { content: '', error: 'API key is required. Please enter your API key in settings.' };
  }

  // Determine generation mode
  const effectiveMode = mode === 'auto' 
    ? (isComplexLayoutRequest(userMessage) ? 'html' : 'json')
    : mode;

  // Auto-increase max tokens for HTML mode (layouts need more output)
  const effectiveMaxTokens = effectiveMode === 'html' ? Math.max(maxTokens, 16384) : maxTokens;

  // Build system prompt
  const systemPrompt = buildSystemPrompt(systemPromptPrefix, sceneContext, selectedElementIds, effectiveMode, userMessage);

  // Build conversation messages
  const messages = buildMessages(systemPrompt, conversationHistory, userMessage);

  try {
    const actualModel = model || DEFAULT_MODELS[provider];
    
    switch (provider) {
      case 'openai':
        return await callOpenAI(apiKey, actualModel, messages, temperature, effectiveMaxTokens, effectiveMode);
      case 'anthropic':
        return await callAnthropic(apiKey, actualModel, messages, temperature, effectiveMaxTokens, effectiveMode);
      case 'gemini':
        return await callGemini(apiKey, actualModel, messages, temperature, effectiveMaxTokens, effectiveMode);
      default:
        return { content: '', error: `Unknown provider: ${provider}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { content: '', error: `AI request failed: ${message}` };
  }
}

// ─── System Prompt Builder ────────────────────────────────────────────

function buildSystemPrompt(
  prefix: string,
  sceneContext: BoardierElement[],
  selectedIds: string[],
  mode: 'json' | 'html',
  userMessage: string,
): string {
  const parts: string[] = [];

  if (prefix) {
    parts.push(prefix);
  }

  parts.push('You are an AI assistant for Boardier, a whiteboard/diagramming tool.');
  parts.push('You can create diagrams, charts, wireframes, and visual layouts.');
  parts.push('');

  if (mode === 'html') {
    parts.push(HTML_GENERATION_PROMPT);
  } else {
    parts.push(ELEMENT_SCHEMA_PROMPT);
    
    // Detect and add diagram hints
    const diagramType = detectDiagramType(userMessage);
    if (diagramType && DIAGRAM_HINTS[diagramType]) {
      parts.push('');
      parts.push('DIAGRAM-SPECIFIC GUIDANCE:');
      parts.push(DIAGRAM_HINTS[diagramType]);
    }
  }

  // Add scene context
  if (sceneContext.length > 0) {
    parts.push('');
    parts.push('CURRENT CANVAS STATE:');
    const contextDesc = describeElements(sceneContext.slice(0, 40));
    parts.push(contextDesc);
    
    if (selectedIds.length > 0) {
      const selected = sceneContext.filter(el => selectedIds.includes(el.id));
      parts.push('');
      parts.push('SELECTED ELEMENTS:');
      parts.push(describeElements(selected));
    }
  }

  parts.push('');
  parts.push('When responding conversationally (questions, explanations), respond in plain text.');
  parts.push('When creating or modifying elements, return a JSON object: { "elements": [...], "zoomToFit": true }');
  parts.push('For commands like "clear canvas", return: { "command": "clear" }');

  return parts.join('\n');
}

function buildMessages(
  systemPrompt: string,
  history: AIChatMessage[],
  userMessage: string,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (skip system messages)
  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

// ─── OpenAI API ───────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number,
  maxTokens: number,
  mode: 'json' | 'html',
): Promise<ChatResponse> {
  const response = await fetch(ENDPOINTS.openai, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: mode === 'json' ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  return parseAIResponse(content, mode);
}

// ─── Anthropic API ────────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number,
  maxTokens: number,
  mode: 'json' | 'html',
): Promise<ChatResponse> {
  // Anthropic uses a different format: system is separate
  const systemContent = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const response = await fetch(ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemContent,
      messages: chatMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  
  return parseAIResponse(content, mode);
}

// ─── Gemini API ───────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number,
  maxTokens: number,
  mode: 'json' | 'html',
): Promise<ChatResponse> {
  const endpoint = `${ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;

  // Convert messages to Gemini format
  // System prompt goes into context, then alternate user/model turns
  const systemContent = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemContent }] },
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return parseAIResponse(content, mode);
}

// ─── Response Parser ──────────────────────────────────────────────────

function parseAIResponse(content: string, mode: 'json' | 'html'): ChatResponse {
  const trimmed = content.trim();

  // Check for HTML code block first (regardless of mode)
  const htmlBlockMatch = trimmed.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
  if (htmlBlockMatch) {
    const html = htmlBlockMatch[1].trim();
    if (html.includes('<div') || html.includes('<section') || html.includes('<nav')) {
      return { content: 'Generated layout successfully.', rawHtml: html };
    }
  }

  // Check for raw HTML response (no code block)
  if (mode === 'html' && (trimmed.startsWith('<div') || trimmed.startsWith('<section') || trimmed.startsWith('<nav') || trimmed.startsWith('<header'))) {
    return { content: 'Generated layout successfully.', rawHtml: trimmed };
  }

  // Try to parse as JSON
  try {
    // Handle markdown code blocks
    let jsonStr = trimmed;
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      jsonStr = trimmed;
    } else {
      // Plain text response (conversational)
      return { content: trimmed };
    }

    const parsed = JSON.parse(jsonStr);
    
    if (parsed.elements && Array.isArray(parsed.elements)) {
      return {
        content: 'Generated elements successfully.',
        elements: parsed.elements,
        zoomToFit: parsed.zoomToFit ?? true,
      };
    }
    
    if (parsed.command) {
      return {
        content: `Executing command: ${parsed.command}`,
        command: parsed.command,
      };
    }

    // Some other JSON response
    return { content: trimmed };
  } catch {
    // Not JSON — plain text response
    return { content: trimmed };
  }
}

// ─── Utilities ────────────────────────────────────────────────────────

/**
 * Validate that an API key looks plausibly correct for a provider.
 * Does not verify the key is actually valid — just basic format checks.
 */
export function validateApiKeyFormat(provider: AIChatProvider, key: string): boolean {
  if (!key || key.length < 10) return false;
  
  switch (provider) {
    case 'openai':
      return key.startsWith('sk-');
    case 'anthropic':
      return key.startsWith('sk-ant-');
    case 'gemini':
      return key.length > 20; // Gemini keys don't have a consistent prefix
    default:
      return true;
  }
}

/**
 * Get display name for a provider.
 */
export function getProviderDisplayName(provider: AIChatProvider): string {
  switch (provider) {
    case 'openai': return 'OpenAI (GPT)';
    case 'anthropic': return 'Anthropic (Claude)';
    case 'gemini': return 'Google (Gemini)';
  }
}

/**
 * Storage keys for persisting API keys in localStorage.
 */
export const API_KEY_STORAGE_PREFIX = 'boardier_ai_key_';

export function getStoredApiKey(provider: AIChatProvider): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${API_KEY_STORAGE_PREFIX}${provider}`);
}

export function setStoredApiKey(provider: AIChatProvider, key: string): void {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem(`${API_KEY_STORAGE_PREFIX}${provider}`, key);
  } else {
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}${provider}`);
  }
}
