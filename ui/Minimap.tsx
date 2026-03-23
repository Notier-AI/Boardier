/**
 * @boardier-module ui/Minimap
 * @boardier-category UI
 * @boardier-description A small overview map of the entire scene shown in a corner, with integrated zoom controls as a footer. Renders a scaled-down view of all elements and a viewport indicator. Click-to-navigate and drag-to-pan are supported.
 * @boardier-since 0.1.0
 * @boardier-changed 0.3.1 Combined zoom controls into the minimap footer
 */
import React, { useRef, useEffect, useCallback } from 'react';
import type { BoardierElement, ViewState } from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { getElementBounds } from '../elements/base';

interface MinimapProps {
  elements: BoardierElement[];
  viewState: ViewState;
  canvasWidth: number;
  canvasHeight: number;
  theme: BoardierTheme;
  onNavigate: (scrollX: number, scrollY: number) => void;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onResetZoom?: () => void;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 100;

export const Minimap: React.FC<MinimapProps> = React.memo(({
  elements, viewState, canvasWidth, canvasHeight, theme, onNavigate,
  zoom, onZoomIn, onZoomOut, onFitView, onResetZoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasZoom = zoom !== undefined && onZoomIn && onZoomOut && onFitView && onResetZoom;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = theme.canvasBackground;
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    if (elements.length === 0) return;

    // Compute world bounds of all elements
    const allBounds = elements.map(getElementBounds);
    const minX = Math.min(...allBounds.map(b => b.x));
    const minY = Math.min(...allBounds.map(b => b.y));
    const maxX = Math.max(...allBounds.map(b => b.x + b.width));
    const maxY = Math.max(...allBounds.map(b => b.y + b.height));

    // Add visible viewport to the world extent
    const vpLeft = -viewState.scrollX / viewState.zoom;
    const vpTop = -viewState.scrollY / viewState.zoom;
    const vpRight = vpLeft + canvasWidth / viewState.zoom;
    const vpBottom = vpTop + canvasHeight / viewState.zoom;

    const worldMinX = Math.min(minX, vpLeft) - 50;
    const worldMinY = Math.min(minY, vpTop) - 50;
    const worldMaxX = Math.max(maxX, vpRight) + 50;
    const worldMaxY = Math.max(maxY, vpBottom) + 50;

    const worldW = worldMaxX - worldMinX || 1;
    const worldH = worldMaxY - worldMinY || 1;

    const scale = Math.min(MINIMAP_WIDTH / worldW, MINIMAP_HEIGHT / worldH);

    const toMiniX = (wx: number) => (wx - worldMinX) * scale;
    const toMiniY = (wy: number) => (wy - worldMinY) * scale;

    // Draw element representations (small colored rects)
    for (const b of allBounds) {
      ctx.fillStyle = theme.selectionColor + '80';
      ctx.fillRect(
        toMiniX(b.x),
        toMiniY(b.y),
        Math.max(b.width * scale, 2),
        Math.max(b.height * scale, 2),
      );
    }

    // Draw viewport rectangle
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(
      toMiniX(vpLeft),
      toMiniY(vpTop),
      (canvasWidth / viewState.zoom) * scale,
      (canvasHeight / viewState.zoom) * scale,
    );
  }, [elements, viewState, canvasWidth, canvasHeight, theme]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (elements.length === 0) return;

    const allBounds = elements.map(getElementBounds);
    const minX = Math.min(...allBounds.map(b => b.x));
    const minY = Math.min(...allBounds.map(b => b.y));
    const maxX = Math.max(...allBounds.map(b => b.x + b.width));
    const maxY = Math.max(...allBounds.map(b => b.y + b.height));

    const vpLeft = -viewState.scrollX / viewState.zoom;
    const vpTop = -viewState.scrollY / viewState.zoom;
    const vpRight = vpLeft + canvasWidth / viewState.zoom;
    const vpBottom = vpTop + canvasHeight / viewState.zoom;

    const worldMinX = Math.min(minX, vpLeft) - 50;
    const worldMinY = Math.min(minY, vpTop) - 50;
    const worldMaxX = Math.max(maxX, vpRight) + 50;
    const worldMaxY = Math.max(maxY, vpBottom) + 50;

    const worldW = worldMaxX - worldMinX || 1;
    const worldH = worldMaxY - worldMinY || 1;
    const scale = Math.min(MINIMAP_WIDTH / worldW, MINIMAP_HEIGHT / worldH);

    // Convert minimap click to world coords
    const worldX = mx / scale + worldMinX;
    const worldY = my / scale + worldMinY;

    // Center viewport on this world point
    const newScrollX = -(worldX * viewState.zoom - canvasWidth / 2);
    const newScrollY = -(worldY * viewState.zoom - canvasHeight / 2);
    onNavigate(newScrollX, newScrollY);
  }, [elements, viewState, canvasWidth, canvasHeight, onNavigate]);

  const zoomBtnStyle: React.CSSProperties = {
    width: 26,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: theme.panelText,
    borderRadius: theme.uiStyle.buttonBorderRadius,
    fontFamily: theme.uiFontFamily,
    padding: 0,
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: theme.panelBackground,
        border: `${theme.uiStyle.panelBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
        borderRadius: theme.uiStyle.panelBorderRadius,
        boxShadow: theme.uiStyle.panelShadow,
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      <div style={{ cursor: 'pointer' }} onClick={handleClick}>
        <canvas
          ref={canvasRef}
          style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT, display: 'block' }}
        />
      </div>
      {hasZoom && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '3px 4px',
            borderTop: `1px solid ${theme.panelBorder}`,
            fontFamily: theme.uiFontFamily,
          }}
        >
          <button style={zoomBtnStyle} onClick={onZoomOut} title="Zoom out">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <button
            style={{ ...zoomBtnStyle, width: 'auto', fontSize: 10, fontWeight: 600, padding: '0 2px' }}
            onClick={onResetZoom}
            title="Reset zoom"
          >
            {Math.round(zoom! * 100)}%
          </button>
          <button style={zoomBtnStyle} onClick={onZoomIn} title="Zoom in">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <div style={{ width: 1, height: 14, background: theme.panelBorder, margin: '0 1px' }} />
          <button style={zoomBtnStyle} onClick={onFitView} title="Fit to content">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </button>
        </div>
      )}
    </div>
  );
});

Minimap.displayName = 'Minimap';
