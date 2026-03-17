import type { BoardierElement, Vec2, ViewState, Bounds } from './types';
import type { BoardierTheme } from '../themes/types';
import { renderElement, getElementBounds } from '../elements/base';
import { boundsIntersect } from '../utils/math';

// Ensure all element renderers are registered
import '../elements/rectangle';
import '../elements/ellipse';
import '../elements/diamond';
import '../elements/line';
import '../elements/arrow';
import '../elements/freehand';
import '../elements/text';

const HANDLE_SIZE = 8;

/**
 * Adapt element stroke/fill colors for the current theme.
 * Dark colors on dark backgrounds become light and vice versa.
 */
function adaptColor(color: string, theme: BoardierTheme): string {
  if (color === 'transparent') return color;
  // Parse hex color to luminance
  const hex = color.replace('#', '');
  if (hex.length < 6) return color;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Check if background is dark
  const bgHex = theme.canvasBackground.replace('#', '');
  if (bgHex.length < 6) return color;
  const bgR = parseInt(bgHex.substring(0, 2), 16);
  const bgG = parseInt(bgHex.substring(2, 4), 16);
  const bgB = parseInt(bgHex.substring(4, 6), 16);
  const bgLum = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255;

  // If foreground and background are both dark → make foreground light
  if (lum < 0.25 && bgLum < 0.35) return theme.elementDefaults.strokeColor;
  // If foreground and background are both light → make foreground dark
  if (lum > 0.75 && bgLum > 0.65) return theme.elementDefaults.strokeColor;
  return color;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
  }

  screenToWorld(screen: Vec2, vs: ViewState): Vec2 {
    return {
      x: (screen.x - vs.scrollX) / vs.zoom,
      y: (screen.y - vs.scrollY) / vs.zoom,
    };
  }

  worldToScreen(world: Vec2, vs: ViewState): Vec2 {
    return {
      x: world.x * vs.zoom + vs.scrollX,
      y: world.y * vs.zoom + vs.scrollY,
    };
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  render(
    elements: BoardierElement[],
    viewState: ViewState,
    selectedIds: Set<string>,
    theme: BoardierTheme,
    options?: { showGrid?: boolean; gridSize?: number; boxSelect?: Bounds | null },
  ): void {
    const ctx = this.ctx;
    const { zoom, scrollX, scrollY } = viewState;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = theme.canvasBackground;
    ctx.fillRect(0, 0, this.width, this.height);

    if (options?.showGrid) {
      this.drawGrid(ctx, viewState, theme, options.gridSize ?? 20);
    }

    ctx.translate(scrollX, scrollY);
    ctx.scale(zoom, zoom);

    const visibleWorld: Bounds = {
      x: -scrollX / zoom,
      y: -scrollY / zoom,
      width: this.width / zoom,
      height: this.height / zoom,
    };

    // Draw elements with color adaptation
    for (const el of elements) {
      const b = getElementBounds(el);
      if (!boundsIntersect(b, {
        x: visibleWorld.x - 50,
        y: visibleWorld.y - 50,
        width: visibleWorld.width + 100,
        height: visibleWorld.height + 100,
      })) continue;

      // Apply color adaptation for dark/light theme
      const adaptedStroke = adaptColor(el.strokeColor, theme);
      const needsAdapt = adaptedStroke !== el.strokeColor;
      if (needsAdapt) {
        const adapted = { ...el, strokeColor: adaptedStroke } as BoardierElement;
        renderElement(ctx, adapted);
      } else {
        renderElement(ctx, el);
      }
    }

    // Selection overlays
    const selected = elements.filter(e => selectedIds.has(e.id));
    if (selected.length > 0) {
      this.drawSelectionOverlay(ctx, selected, theme, zoom);
    }

    if (options?.boxSelect) {
      this.drawBoxSelect(ctx, options.boxSelect, theme);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, vs: ViewState, theme: BoardierTheme, gridSize: number): void {
    const { zoom, scrollX, scrollY } = vs;
    ctx.fillStyle = theme.gridColor;

    const step = gridSize * zoom;
    if (step < 6) return;

    const startX = scrollX % step;
    const startY = scrollY % step;

    for (let x = startX; x < this.width; x += step) {
      for (let y = startY; y < this.height; y += step) {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
  }

  private drawSelectionOverlay(ctx: CanvasRenderingContext2D, elements: BoardierElement[], theme: BoardierTheme, zoom: number): void {
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);

    for (const el of elements) {
      const b = getElementBounds(el);
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    }

    ctx.setLineDash([]);

    if (elements.length > 1) {
      const all = elements.map(getElementBounds);
      const minX = Math.min(...all.map(b => b.x));
      const minY = Math.min(...all.map(b => b.y));
      const maxX = Math.max(...all.map(b => b.x + b.width));
      const maxY = Math.max(...all.map(b => b.y + b.height));
      ctx.strokeStyle = theme.selectionColor;
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    }

    if (elements.length === 1) {
      const el = elements[0];
      if (el.type === 'line' || el.type === 'arrow') {
        this.drawLinePointHandles(ctx, el as any, theme, zoom);
      } else {
        const b = getElementBounds(el);
        this.drawHandles(ctx, b, theme, zoom);
      }
    }
  }

  private drawHandles(ctx: CanvasRenderingContext2D, b: Bounds, theme: BoardierTheme, zoom: number): void {
    const hs = HANDLE_SIZE / zoom;
    const hh = hs / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5 / zoom;

    const positions = [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
      { x: b.x, y: b.y + b.height },
    ];

    for (const p of positions) {
      ctx.fillRect(p.x - hh, p.y - hh, hs, hs);
      ctx.strokeRect(p.x - hh, p.y - hh, hs, hs);
    }
  }

  /** Draw circle handles at each point of a line/arrow. */
  private drawLinePointHandles(ctx: CanvasRenderingContext2D, el: { x: number; y: number; points: Vec2[] }, theme: BoardierTheme, zoom: number): void {
    const radius = 4 / zoom;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5 / zoom;

    for (const p of el.points) {
      const ax = el.x + p.x;
      const ay = el.y + p.y;
      ctx.beginPath();
      ctx.arc(ax, ay, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // ─── Box-select ───────────────────────────────────────────────────

  private drawBoxSelect(ctx: CanvasRenderingContext2D, b: Bounds, theme: BoardierTheme): void {
    ctx.fillStyle = theme.selectionFill;
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.strokeRect(b.x, b.y, b.width, b.height);
    ctx.setLineDash([]);
  }

  // ─── Handle hit-test (in world coords) ────────────────────────────

  getHandleAtPoint(point: Vec2, elementBounds: Bounds, zoom: number): number {
    const hs = (HANDLE_SIZE + 4) / zoom;
    const hh = hs / 2;
    const b = elementBounds;

    const handles = [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
      { x: b.x, y: b.y + b.height },
    ];

    for (let i = 0; i < handles.length; i++) {
      if (
        point.x >= handles[i].x - hh && point.x <= handles[i].x + hh &&
        point.y >= handles[i].y - hh && point.y <= handles[i].y + hh
      ) return i;
    }
    return -1;
  }
}
