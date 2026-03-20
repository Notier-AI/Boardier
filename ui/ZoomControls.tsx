/**
 * @boardier-module ui/ZoomControls
 * @boardier-category UI
 * @boardier-description Zoom-in, zoom-out, and fit-to-content buttons displayed in a compact panel. Shows the current zoom percentage.
 * @boardier-since 0.1.0
 */
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

const MinusIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
);
const PlusIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
const FitIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
);

export const ZoomControls: React.FC<ZoomControlsProps> = React.memo(({ zoom, onZoomIn, onZoomOut, onFitView, onResetZoom, theme }) => {
  const btnStyle: React.CSSProperties = {
    width: 30,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: theme.panelText,
    borderRadius: 4,
    fontFamily: theme.uiFontFamily,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 6px',
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadow,
        fontFamily: theme.uiFontFamily,
      }}
    >
      <button style={btnStyle} onClick={onZoomOut} title="Zoom out (Ctrl+-)"><MinusIcon /></button>
      <button
        style={{ ...btnStyle, width: 'auto', fontSize: 11, fontWeight: 600, padding: '0 4px' }}
        onClick={onResetZoom}
        title="Reset zoom (Ctrl+0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button style={btnStyle} onClick={onZoomIn} title="Zoom in (Ctrl+=)"><PlusIcon /></button>
      <div style={{ width: 1, height: 18, background: theme.panelBorder, margin: '0 2px' }} />
      <button style={btnStyle} onClick={onFitView} title="Fit to content (Ctrl+Shift+F)"><FitIcon /></button>
    </div>
  );
});

ZoomControls.displayName = 'ZoomControls';
