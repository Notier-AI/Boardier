import React from 'react';
import type { BoardierTheme } from '../themes/types';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetZoom: () => void;
  theme: BoardierTheme;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut, onFitView, onResetZoom, theme }) => {
  const btnStyle: React.CSSProperties = {
    width: 30,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    color: theme.panelText,
    borderRadius: 4,
    fontFamily: theme.uiFontFamily,
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 6px',
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadow,
        zIndex: 10,
        fontFamily: theme.uiFontFamily,
      }}
    >
      <button style={btnStyle} onClick={onZoomOut} title="Zoom out (Ctrl+-)">−</button>
      <button
        style={{ ...btnStyle, width: 'auto', fontSize: 11, fontWeight: 600, padding: '0 4px' }}
        onClick={onResetZoom}
        title="Reset zoom (Ctrl+0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button style={btnStyle} onClick={onZoomIn} title="Zoom in (Ctrl+=)">+</button>
      <div style={{ width: 1, height: 18, background: theme.panelBorder, margin: '0 2px' }} />
      <button style={btnStyle} onClick={onFitView} title="Fit to content (Ctrl+Shift+F)">⤢</button>
    </div>
  );
};
