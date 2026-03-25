/**
 * @boardier-module ui/TextEditor
 * @boardier-category UI
 * @boardier-description Floating textarea overlay for editing text elements in-place. Auto-resizes to fit content. Supports multi-line editing when the element's multiLine property is true, otherwise acts as a single-line input.
 * @boardier-since 0.1.0
 * @boardier-changed 0.4.3 Respects multiLine property — Enter commits when multiLine is false, Shift+Enter always inserts newline when multiLine is true
 */
import React, { useRef, useEffect, useCallback } from 'react';
import type { TextElement, ViewState } from '../core/types';
import type { BoardierTheme } from '../themes/types';

interface TextEditorProps {
  element: TextElement;
  viewState: ViewState;
  theme: BoardierTheme;
  onCommit: (id: string, text: string) => void;
  onCancel: (id: string) => void;
  onInsertIcon?: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ element, viewState, theme, onCommit, onCancel, onInsertIcon }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    // Delay focus to avoid conflict with canvas pointer events
    const timer = setTimeout(() => {
      ta.focus();
      ta.value = element.text;
      if (!element.text) ta.setSelectionRange(0, 0);
      else ta.select();
    }, 50);
    return () => clearTimeout(timer);
  }, [element.id]);

  // Position the textarea at the element's screen position
  const screenX = element.x * viewState.zoom + viewState.scrollX;
  const screenY = element.y * viewState.zoom + viewState.scrollY;
  const scaledFontSize = element.fontSize * viewState.zoom;

  const handleBlur = useCallback(() => {
    const text = ref.current?.value ?? '';
    if (text.trim()) {
      onCommit(element.id, text);
    } else {
      onCancel(element.id);
    }
  }, [element.id, onCommit, onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel(element.id);
    }
    // When multiLine is true: Shift+Enter = commit, Enter = newline
    // When multiLine is false: Enter = commit (no newlines allowed)
    const isMultiLine = element.multiLine !== false;
    if (isMultiLine) {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBlur();
      }
    }
    e.stopPropagation(); // Don't let tool shortcuts fire
  }, [element.id, element.multiLine, onCancel, handleBlur]);

  return (
    <div style={{ position: 'absolute', left: screenX, top: screenY, zIndex: 20 }}>
      <textarea
        ref={ref}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          display: 'block',
          minWidth: Math.max(60, element.width * viewState.zoom),
          minHeight: Math.max(scaledFontSize * element.lineHeight, 24),
          font: `${scaledFontSize}px ${element.fontFamily}`,
          lineHeight: `${element.lineHeight}`,
          color: element.strokeColor,
          background: 'transparent',
          border: `${theme.uiStyle.inputBorderWidth}px dashed ${theme.selectionColor}`,
          borderRadius: theme.uiStyle.inputBorderRadius,
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          padding: '0 2px',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxSizing: 'border-box',
          fontFamily: element.fontFamily,
        }}
        // Auto-grow
        onInput={e => {
          const ta = e.target as HTMLTextAreaElement;
          ta.style.height = 'auto';
          ta.style.height = ta.scrollHeight + 'px';
          ta.style.width = 'auto';
          ta.style.width = Math.max(60, ta.scrollWidth + 4) + 'px';
        }}
      />
      {onInsertIcon && (
        <button
          title="Insert icon"
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onInsertIcon(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, marginTop: 3,
            border: `${theme.uiStyle.buttonBorderWidth}px solid ${theme.panelBorder}`,
            borderRadius: theme.uiStyle.buttonBorderRadius,
            background: theme.panelBackground,
            cursor: 'pointer',
            color: theme.panelTextSecondary,
            padding: 0,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>
        </button>
      )}
    </div>
  );
};
