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
const HANDLE_HALF = HANDLE_SIZE / 2;

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

  // ─── Coordinate transforms ────────────────────────────────────────

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

  // ─── Resize (call when container changes size) ─────────────────────

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  // ─── Main render ──────────────────────────────────────────────────

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
    // Reset & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // HiDPI scale
    ctx.scale(this.dpr, this.dpr);

    // Background
    ctx.fillStyle = theme.canvasBackground;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid
    if (options?.showGrid) {
      this.drawGrid(ctx, viewState, theme, options.gridSize ?? 20);
    }

    // Viewport transform: screen = world * zoom + scroll
    ctx.translate(scrollX, scrollY);
    ctx.scale(zoom, zoom);

    // Compute visible area in world coords for culling
    const visibleWorld: Bounds = {
      x: -scrollX / zoom,
      y: -scrollY / zoom,
      width: this.width / zoom,
      height: this.height / zoom,
    };

    // Draw elements (bottom → top)
    for (const el of elements) {
      const b = getElementBounds(el);
      // Cull elements outside viewport (generous padding for strokes)
      if (!boundsIntersect(b, {
        x: visibleWorld.x - 50,
        y: visibleWorld.y - 50,
        width: visibleWorld.width + 100,
        height: visibleWorld.height + 100,
      })) continue;
      renderElement(ctx, el);
    }

    // Selection overlays
    const selected = elements.filter(e => selectedIds.has(e.id));
    if (selected.length > 0) {
      this.drawSelectionOverlay(ctx, selected, theme, zoom);
    }

    // Box-selection rectangle
    if (options?.boxSelect) {
      this.drawBoxSelect(ctx, options.boxSelect, theme);
    }

    ctx.restore();
  }

  // ─── Grid ─────────────────────────────────────────────────────────

  private drawGrid(ctx: CanvasRenderingContext2D, vs: ViewState, theme: BoardierTheme, gridSize: number): void {
    const { zoom, scrollX, scrollY } = vs;
    ctx.fillStyle = theme.gridColor;

    const step = gridSize * zoom;
    if (step < 6) return; // too dense — skip

    const startX = scrollX % step;
    const startY = scrollY % step;

    for (let x = startX; x < this.width; x += step) {
      for (let y = startY; y < this.height; y += step) {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
  }

  // ─── Selection overlay ────────────────────────────────────────────

  private drawSelectionOverlay(ctx: CanvasRenderingContext2D, elements: BoardierElement[], theme: BoardierTheme, zoom: number): void {
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);

    // Per-element selection box
    for (const el of elements) {
      const b = getElementBounds(el);
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    }

    ctx.setLineDash([]);

    // If multiple selected, draw a combined bounding box
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

    // Resize handles (corners of single selection)
    if (elements.length === 1) {
      const b = getElementBounds(elements[0]);
      this.drawHandles(ctx, b, theme, zoom);
    }
  }

  private drawHandles(ctx: CanvasRenderingContext2D, b: Bounds, theme: BoardierTheme, zoom: number): void {
    const hs = HANDLE_SIZE / zoom;
    const hh = hs / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5 / zoom;

    const positions = [
      { x: b.x, y: b.y },                               // top-left
      { x: b.x + b.width, y: b.y },                     // top-right
      { x: b.x + b.width, y: b.y + b.height },          // bottom-right
      { x: b.x, y: b.y + b.height },                    // bottom-left
    ];

    for (const p of positions) {
      ctx.fillRect(p.x - hh, p.y - hh, hs, hs);
      ctx.strokeRect(p.x - hh, p.y - hh, hs, hs);
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
