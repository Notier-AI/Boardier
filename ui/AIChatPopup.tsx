/**
 * @boardier-module ui/AIChatPopup
 * @boardier-category UI
 * @boardier-description Floating AI chat popup component for conversational whiteboard editing.
 * Supports OpenAI, Anthropic (Claude), and Google Gemini providers. Users provide their own API keys.
 * Integrates with Boardier's AI capabilities including element generation and HTML-based smart layouts.
 * @boardier-since 0.3.0
 * @boardier-changed 0.3.1 Restyled toggle button to match theme uiStyle; added markdown rendering for AI responses
 * @boardier-changed 0.4.4 Dark mode support for panel and button; moved button higher; panel right-aligns so close button matches toggle position
 * @boardier-usage `<AIChatPopup engine={engine} config={{ defaultProvider: 'openai' }} theme={theme} />`
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { BoardierTheme } from '../themes/types';
import type { BoardierEngine } from '../core/Engine';
import type { AIChatConfig, AIChatProvider, AIChatMessage, BoardierElement } from '../core/types';
import {
  sendChatRequest,
  getProviderDisplayName,
  getStoredApiKey,
  setStoredApiKey,
  validateApiKeyFormat,
  DEFAULT_MODELS,
} from '../ai/chatClient';
import { htmlToBoardier } from '../ai/htmlConverter';
import { materializeElements } from '../ai/orchestrator';
import { generateId } from '../utils/id';

// ─── Markdown renderer ────────────────────────────────────────────────

/** Renders a subset of Markdown as React elements (code blocks, inline code, bold, italic, links, lists, headings). */
function renderMarkdown(text: string, colors: { fg: string; accent: string; codeBg: string; border: string }): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const inlineStyle = (line: string): React.ReactNode => {
    // Process inline markdown: bold, italic, inline code, links
    const parts: React.ReactNode[] = [];
    // Regex matches: `code`, **bold**, *italic*, [text](url)
    const rx = /(`[^`]+`)|\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let ik = 0;
    while ((m = rx.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1]) {
        // inline code
        parts.push(
          <code key={ik++} style={{ background: colors.codeBg, padding: '1px 4px', borderRadius: 3, fontSize: '0.9em', fontFamily: 'monospace' }}>
            {m[1].slice(1, -1)}
          </code>
        );
      } else if (m[2]) {
        parts.push(<strong key={ik++}>{m[2]}</strong>);
      } else if (m[3]) {
        parts.push(<em key={ik++}>{m[3]}</em>);
      } else if (m[4] && m[5]) {
        parts.push(
          <a key={ik++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent, textDecoration: 'underline' }}>
            {m[4]}
          </a>
        );
      }
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} style={{ background: colors.codeBg, padding: '8px 10px', borderRadius: 6, overflow: 'auto', fontSize: '0.85em', fontFamily: 'monospace', margin: '6px 0', border: `1px solid ${colors.border}` }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const fontSize = level === 1 ? '1.15em' : level === 2 ? '1.05em' : '0.95em';
      elements.push(
        <div key={key++} style={{ fontWeight: 700, fontSize, margin: '8px 0 2px' }}>
          {inlineStyle(headingMatch[2])}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      const indent = Math.floor((ulMatch[1] || '').length / 2);
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 6, marginLeft: indent * 14, margin: '1px 0' }}>
          <span style={{ flexShrink: 0 }}>•</span>
          <span>{inlineStyle(ulMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (olMatch) {
      const indent = Math.floor((olMatch[1] || '').length / 2);
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 6, marginLeft: indent * 14, margin: '1px 0' }}>
          <span style={{ flexShrink: 0 }}>{olMatch[2]}.</span>
          <span>{inlineStyle(olMatch[3])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<div key={key++} style={{ margin: '2px 0' }}>{inlineStyle(line)}</div>);
    i++;
  }

  return <>{elements}</>;
}

// ─── Props ────────────────────────────────────────────────────────────

export interface AIChatPopupProps {
  /** The Boardier engine instance for canvas interaction */
  engine: BoardierEngine | null;
  /** Configuration options */
  config?: AIChatConfig;
  /** Theme for styling */
  theme: BoardierTheme;
  /** Callback when chat is opened or closed */
  onOpenChange?: (isOpen: boolean) => void;
}

// ─── Icons ────────────────────────────────────────────────────────────

const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconSparkles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────

export const AIChatPopup: React.FC<AIChatPopupProps> = ({
  engine,
  config = {},
  theme,
  onOpenChange,
}) => {
  const {
    enabled = true,
    defaultProvider = 'openai',
    models = {},
    allowHTMLMode = true,
    persistKeys = true,
    systemPromptPrefix = '',
    maxHistory = 20,
    temperature = 0.7,
    maxTokens = 4096,
    position = 'bottom-right',
    placeholder = 'Ask AI to create diagrams, edit elements...',
    showProviderSelector = true,
    apiKeys: prefilledKeys = {},
    onElementsGenerated,
  } = config;

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<AIChatProvider>(defaultProvider);
  const [apiKeys, setApiKeys] = useState<Partial<Record<AIChatProvider, string>>>({ ...prefilledKeys });
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load stored API keys on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
    if (persistKeys) {
      const stored: Partial<Record<AIChatProvider, string>> = {};
      // Copy prefilled keys
      if (prefilledKeys) {
        Object.assign(stored, prefilledKeys);
      }
      (['openai', 'anthropic', 'gemini'] as AIChatProvider[]).forEach(p => {
        const key = getStoredApiKey(p);
        if (key && !stored[p]) stored[p] = key;
      });
      setApiKeys(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKeys]); // Only run on mount and when persistKeys changes

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showSettings]);

  // Notify parent of open/close
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Don't render until mounted (prevents SSR hydration mismatch)
  if (!mounted) return null;

  // Don't render if disabled
  if (!enabled) return null;

  const currentApiKey = apiKeys[provider] || '';
  const hasValidKey = validateApiKeyFormat(provider, currentApiKey);

  // Position styles - placed above minimap and zoom controls
  const positionStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    ...(position === 'bottom-right' && { bottom: 160, right: 20 }),
    ...(position === 'bottom-left' && { bottom: 160, left: 20, alignItems: 'flex-start' }),
    ...(position === 'top-right' && { top: 20, right: 20 }),
    ...(position === 'top-left' && { top: 20, left: 20, alignItems: 'flex-start' }),
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setShowSettings(false);
  };

  const handleApiKeyChange = (p: AIChatProvider, key: string) => {
    setApiKeys(prev => ({ ...prev, [p]: key }));
    if (persistKeys) {
      setStoredApiKey(p, key);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !hasValidKey || isLoading) return;

    const userMessage: AIChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get scene context from engine
      const sceneContext = engine?.scene.getElements() || [];
      const selectedIds = engine?.scene.getSelectedIds() || [];

      const response = await sendChatRequest(
        {
          provider,
          apiKey: currentApiKey,
          model: models[provider],
          temperature,
          // Increase max tokens for HTML mode to avoid truncation
          maxTokens: (htmlMode && allowHTMLMode) ? Math.max(maxTokens, 16384) : maxTokens,
          systemPromptPrefix,
        },
        {
          userMessage: userMessage.content,
          conversationHistory: messages.slice(-maxHistory),
          sceneContext,
          selectedElementIds: selectedIds,
          mode: htmlMode && allowHTMLMode ? 'html' : 'auto',
        },
      );

      if (response.error) {
        const errorMsg: AIChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `Error: ${response.error}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        // Handle element creation
        let elementIds: string[] | undefined;
        
        if (response.elements && response.elements.length > 0 && engine) {
          const materialized = materializeElements(response.elements);
          engine.addElements(materialized);
          elementIds = materialized.map(el => el.id);
          
          if (response.zoomToFit) {
            setTimeout(() => engine.zoomToFit(), 100);
          }
          
          onElementsGenerated?.(materialized);
        }

        if (response.rawHtml && engine) {
          try {
            const converted = htmlToBoardier(response.rawHtml);
            if (converted.length > 0) {
              engine.addElements(converted);
              elementIds = converted.map(el => el.id);
              setTimeout(() => engine.zoomToFit(), 100);
              onElementsGenerated?.(converted);
            } else {
              // Fallback: use materializeElements with a simple summary
              console.warn('[AIChatPopup] htmlToBoardier returned 0 elements, raw HTML length:', response.rawHtml.length);
            }
          } catch (htmlErr) {
            console.error('[AIChatPopup] htmlToBoardier failed:', htmlErr);
          }
        }

        if (response.command && engine) {
          switch (response.command) {
            case 'clear':
              engine.deleteAll();
              break;
            case 'delete_selected':
              engine.deleteSelected();
              break;
            case 'select_all':
              engine.selectAll();
              break;
            case 'zoom_to_fit':
              engine.zoomToFit();
              break;
          }
        }

        const assistantMsg: AIChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.content || (response.elements ? `Created ${response.elements.length} elements.` : 'Done.'),
          timestamp: Date.now(),
          elementIds,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg: AIChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  // Theme colors
  const bg = theme.canvasBackground;
  const fg = theme.panelText;
  const accent = theme.selectionColor; // Use selection blue for better visibility
  const border = theme.panelBorder;
  const panelBg = theme.panelBackground;
  const textMuted = theme.panelTextSecondary;
  const hoverBg = theme.panelHover;

  return (
    <div style={positionStyles}>
      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            width: 380,
            height: 520,
            backgroundColor: panelBg,
            border: `1px solid ${border}`,
            borderRadius: theme.borderRadius,
            boxShadow: `0 8px 32px ${theme.panelText}22`,
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: panelBg,
            }}
          >
            <IconSparkles />
            <span style={{ fontWeight: 600, fontSize: 14, color: fg, flex: 1 }}>AI Assistant</span>
            
            {showProviderSelector && !showSettings && (
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as AIChatProvider)}
                style={{
                  padding: '6px 24px 6px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: `1px solid ${border}`,
                  backgroundColor: panelBg,
                  color: fg,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(textMuted)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                  outline: 'none',
                }}
              >
                <option value="openai">GPT</option>
                <option value="anthropic">Claude</option>
                <option value="gemini">Gemini</option>
              </select>
            )}
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: showSettings ? accent : textMuted,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconSettings />
            </button>
            
            <button
              onClick={handleToggle}
              title="Close"
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: fg,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <IconClose />
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings ? (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: fg, marginBottom: 8 }}>API Keys</div>
                <p style={{ fontSize: 11, color: textMuted, marginBottom: 12 }}>
                  Enter your API keys. They are stored locally in your browser.
                </p>
                
                {(['openai', 'anthropic', 'gemini'] as AIChatProvider[]).map(p => (
                  <div key={p} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: textMuted, display: 'block', marginBottom: 4 }}>
                      {getProviderDisplayName(p)}
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="password"
                        value={apiKeys[p] || ''}
                        onChange={e => handleApiKeyChange(p, e.target.value)}
                        placeholder={`Enter ${p} API key...`}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          fontSize: 12,
                          border: `1px solid ${border}`,
                          borderRadius: 6,
                          backgroundColor: hoverBg,
                          color: fg,
                          outline: 'none',
                        }}
                      />
                      {validateApiKeyFormat(p, apiKeys[p] || '') && (
                        <span style={{ color: '#2f9e44' }}><IconCheck /></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {allowHTMLMode && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: fg, marginBottom: 8 }}>Generation Mode</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={htmlMode}
                      onChange={e => setHtmlMode(e.target.checked)}
                      style={{ accentColor: accent }}
                    />
                    <span style={{ fontSize: 12, color: fg }}>
                      HTML Smart Layouts
                    </span>
                  </label>
                  <p style={{ fontSize: 11, color: textMuted, marginTop: 4, marginLeft: 24 }}>
                    Use HTML generation for complex layouts like landing pages and dashboards.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={clearHistory}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    backgroundColor: 'transparent',
                    color: textMuted,
                    cursor: 'pointer',
                  }}
                >
                  Clear History
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 6,
                    backgroundColor: accent,
                    color: '#fff',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  padding: 12,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: textMuted, fontSize: 13, marginTop: 40 }}>
                    <div style={{ marginBottom: 8 }}><IconSparkles /></div>
                    <p>Ask me to create diagrams, flowcharts,</p>
                    <p>wireframes, or edit your canvas!</p>
                    {!hasValidKey && (
                      <p style={{ marginTop: 16, color: '#e03131', fontSize: 12 }}>
                        Add your API key in settings to get started.
                      </p>
                    )}
                  </div>
                )}
                
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: 13,
                        lineHeight: 1.5,
                        backgroundColor: msg.role === 'user' ? accent : hoverBg,
                        color: msg.role === 'user' ? '#fff' : fg,
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.role === 'user' ? msg.content : renderMarkdown(msg.content, { fg, accent, codeBg: `${border}44`, border })}
                      {msg.elementIds && msg.elementIds.length > 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: `1px solid ${msg.role === 'user' ? 'rgba(255,255,255,0.2)' : border}`,
                            fontSize: 11,
                            color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : textMuted,
                          }}
                        >
                          ✓ Created {msg.elementIds.length} element{msg.elementIds.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: 13,
                        backgroundColor: hoverBg,
                        color: textMuted,
                      }}
                    >
                      <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  padding: 12,
                  borderTop: `1px solid ${border}`,
                  backgroundColor: panelBg,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasValidKey ? placeholder : 'Add API key in settings...'}
                    disabled={!hasValidKey || isLoading}
                    rows={1}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: 13,
                      border: `1px solid ${border}`,
                      borderRadius: 8,
                      backgroundColor: panelBg,
                      color: fg,
                      resize: 'none',
                      minHeight: 40,
                      maxHeight: 120,
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || !hasValidKey || isLoading}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: hasValidKey && inputValue.trim() ? accent : border,
                      color: hasValidKey && inputValue.trim() ? '#fff' : textMuted,
                      cursor: hasValidKey && inputValue.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <IconSend />
                  </button>
                </div>
                
                {htmlMode && allowHTMLMode && (
                  <div style={{ marginTop: 6, fontSize: 10, color: textMuted }}>
                    HTML Smart Layout mode enabled
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle Button — hidden when panel is open (panel has its own close button in the header) */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          title="Open AI Chat"
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.uiStyle.buttonBorderRadius,
            border: `${theme.uiStyle.buttonBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
            backgroundColor: theme.panelBackground,
            color: theme.panelText,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.uiStyle.buttonShadow,
            transition: 'transform 0.15s, box-shadow 0.15s',
            fontFamily: theme.uiFontFamily,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = theme.uiStyle.buttonHoverShadow;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = theme.uiStyle.buttonShadow;
          }}
        >
          <IconChat />
        </button>
      )}

      {/* Inline styles for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AIChatPopup;
