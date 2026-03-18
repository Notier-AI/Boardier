import React, { useRef, useEffect, useCallback } from 'react';
import type { BoardierElement, ViewState } from '../core/types';
import type { BoardierTheme } from '../themes/types';

interface ShapeLabelEditorProps {
  element: BoardierElement;
  viewState: ViewState;
  theme: BoardierTheme;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const ShapeLabelEditor: React.FC<ShapeLabelEditorProps> = ({ element, viewState, theme, onCommit, onCancel }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    const label = (element as any).label || '';
    input.value = label;
    input.select();
  }, [element.id]);

  const screenX = (element.x + element.width / 2) * viewState.zoom + viewState.scrollX;
  const screenY = (element.y + element.height / 2) * viewState.zoom + viewState.scrollY;
  const scaledWidth = Math.max(60, element.width * viewState.zoom * 0.8);

  const handleBlur = useCallback(() => {
    onCommit(ref.current?.value ?? '');
  }, [onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [handleBlur, onCancel]);

  return (
    <input
      ref={ref}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -50%)',
        width: scaledWidth,
        textAlign: 'center',
        font: `${Math.min(element.width * 0.8, 18) * viewState.zoom}px system-ui, sans-serif`,
        color: element.strokeColor,
        background: 'transparent',
        border: `1.5px dashed ${theme.selectionColor}`,
        borderRadius: 2,
        outline: 'none',
        padding: '2px 4px',
        zIndex: 20,
        boxSizing: 'border-box',
      }}
    />
  );
};
