import React, { useRef, useEffect, useCallback } from 'react';
import type { TextElement, ViewState } from '../core/types';
import type { BoardierTheme } from '../themes/types';

interface TextEditorProps {
  element: TextElement;
  viewState: ViewState;
  theme: BoardierTheme;
  onCommit: (id: string, text: string) => void;
  onCancel: (id: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ element, viewState, theme, onCommit, onCancel }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    ta.value = element.text;
    // Select all if new (empty text)
    if (!element.text) ta.setSelectionRange(0, 0);
    else ta.select();
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
    // Shift+Enter = newline; Enter alone = commit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    e.stopPropagation(); // Don't let tool shortcuts fire
  }, [element.id, onCancel, handleBlur]);

  return (
    <textarea
      ref={ref}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        minWidth: Math.max(60, element.width * viewState.zoom),
        minHeight: Math.max(scaledFontSize * element.lineHeight, 24),
        font: `${scaledFontSize}px ${element.fontFamily}`,
        lineHeight: `${element.lineHeight}`,
        color: element.strokeColor,
        background: 'transparent',
        border: `1.5px dashed ${theme.selectionColor}`,
        borderRadius: 2,
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        padding: '0 2px',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        zIndex: 20,
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
  );
};
