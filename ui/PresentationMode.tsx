/**
 * @boardier-module ui/PresentationMode
 * @boardier-category UI
 * @boardier-description Fullscreen presentation mode that displays pages/frames as slides. Supports keyboard navigation, auto-fit zoom, and ESC to exit.
 * @boardier-since 0.1.0
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { BoardierElement, ViewState } from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { renderElement, getElementBounds } from '../elements/base';

// Ensure renderers available
import '../elements/rectangle';
import '../elements/ellipse';
import '../elements/diamond';
import '../elements/line';
import '../elements/arrow';
import '../elements/freehand';
import '../elements/text';
import '../elements/icon';

import '../elements/image';
import '../elements/embed';
import '../elements/table';
import '../elements/comment';

interface PresentationModeProps {
  elements: BoardierElement[];
  theme: BoardierTheme;
  onExit: () => void;
}

/**
 * Presentation Mode: full-screen overlay that presents frames or all elements one by one.
 * Uses frame elements as "slides" if available, otherwise auto-splits viewport by z-order groupings.
 */
export const PresentationMode: React.FC<PresentationModeProps> = ({ elements, theme, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Build slide list: each frame = 1 slide. If no frames, all elements are 1 slide.
  const slides = React.useMemo(() => {
    const frames = elements.filter(e => e.type === 'frame');
    if (frames.length > 0) {
      return frames.map(frame => {
        const childIds = new Set((frame as any).childIds || []);
        const children = elements.filter(e => childIds.has(e.id));
        return { label: (frame as any).label || 'Frame', elements: [frame, ...children] };
      });
    }
    // Single slide with everything
    return [{ label: 'All', elements }];
  }, [elements]);

  const renderSlide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = theme.canvasBackground;
    ctx.fillRect(0, 0, w, h);

    const slide = slides[currentSlide];
    if (!slide || slide.elements.length === 0) return;

    // Compute bounds of slide elements
    const allBounds = slide.elements.map(getElementBounds);
    const minX = Math.min(...allBounds.map(b => b.x));
    const minY = Math.min(...allBounds.map(b => b.y));
    const maxX = Math.max(...allBounds.map(b => b.x + b.width));
    const maxY = Math.max(...allBounds.map(b => b.y + b.height));

    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 60;
    const scale = Math.min((w - padding * 2) / contentW, (h - padding * 2) / contentH);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(minX + contentW / 2), -(minY + contentH / 2));

    for (const el of slide.elements) {
      renderElement(ctx, el);
    }

    ctx.restore();

    // Slide counter
    ctx.fillStyle = theme.panelText || '#999';
    ctx.font = `14px ${theme.uiFontFamily || 'system-ui'}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${currentSlide + 1} / ${slides.length}`, w / 2, h - 20);
  }, [currentSlide, slides, theme]);

  useEffect(() => {
    renderSlide();
  }, [renderSlide]);

  useEffect(() => {
    const handleResize = () => renderSlide();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderSlide]);

  const next = useCallback(() => setCurrentSlide(s => Math.min(s + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setCurrentSlide(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') prev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit, next, prev]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: theme.canvasBackground,
        cursor: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Navigation areas */}
      <div
        style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%', cursor: 'w-resize' }}
        onClick={prev}
      />
      <div
        style={{ position: 'absolute', right: 0, top: 0, width: '30%', height: '100%', cursor: 'e-resize' }}
        onClick={next}
      />

      {/* Exit button */}
      <button
        onClick={onExit}
        title="Exit presentation (Esc)"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          border: 'none',
          borderRadius: theme.uiStyle.buttonBorderRadius,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 18,
          opacity: 0.6,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
      >
        ✕
      </button>
    </div>
  );
};
