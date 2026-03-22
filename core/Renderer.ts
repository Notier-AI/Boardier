/**
 * @boardier-module core/Renderer
 * @boardier-category Core
 * @boardier-description Canvas 2D renderer responsible for drawing all elements, the grid, selection overlays, smart guides, and lasso outlines. Performs viewport culling, coordinate transforms (screen ↔ world), and theme-aware color adaptation for dark backgrounds.
 * @boardier-since 0.1.0
 * @boardier-see BoardierEngine, Scene
 */
import type { BoardierElement, Vec2, ViewState, Bounds } from './types';
import type { BoardierTheme } from '../themes/types';
import type { SmartGuide } from '../tools/SelectTool';
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
import '../elements/icon';
import '../elements/marker';
import '../elements/checkbox';
import '../elements/radiogroup';
import '../elements/frame';
import '../elements/image';
import '../elements/embed';
import '../elements/table';
import '../elements/comment';

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
    options?: { showGrid?: boolean; gridSize?: number; boxSelect?: Bounds | null; lassoPath?: Vec2[] | null; smartGuides?: SmartGuide[]; bindHighlightIds?: string[] },
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

      // Apply element shadow
      if (el.shadow) {
        const parts = el.shadow.split(' ');
        if (parts.length >= 4) {
          ctx.shadowOffsetX = (parseFloat(parts[0]) || 0);
          ctx.shadowOffsetY = (parseFloat(parts[1]) || 0);
          ctx.shadowBlur = (parseFloat(parts[2]) || 0);
          ctx.shadowColor = parts.slice(3).join(' ');
        }
      }

      // Apply rotation transform
      const hasRotation = el.rotation && el.rotation !== 0;
      if (hasRotation) {
        const elB = getElementBounds(el);
        const cx = elB.x + elB.width / 2;
        const cy = elB.y + elB.height / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(el.rotation);
        ctx.translate(-cx, -cy);
      }

      // Apply color adaptation for dark/light theme
      const adaptedStroke = adaptColor(el.strokeColor, theme);
      const needsAdapt = adaptedStroke !== el.strokeColor;
      if (needsAdapt) {
        const adapted = { ...el, strokeColor: adaptedStroke } as BoardierElement;
        renderElement(ctx, adapted);
      } else {
        renderElement(ctx, el);
      }

      if (hasRotation) {
        ctx.restore();
      }

      // Reset shadow
      if (el.shadow) {
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
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

    if (options?.lassoPath && options.lassoPath.length > 2) {
      this.drawLassoSelect(ctx, options.lassoPath, theme);
    }

    if (options?.smartGuides && options.smartGuides.length > 0) {
      this.drawSmartGuides(ctx, options.smartGuides, theme);
    }

    // Soft glow on elements targeted for line/arrow binding
    if (options?.bindHighlightIds && options.bindHighlightIds.length > 0) {
      const highlightSet = new Set(options.bindHighlightIds);
      for (const el of elements) {
        if (!highlightSet.has(el.id)) continue;
        const b = getElementBounds(el);
        ctx.save();
        ctx.setLineDash([]);
        const pad = 5 / zoom;
        // Three passes: outer glow → mid → crisp inner ring
        ctx.lineWidth = 10 / zoom;
        ctx.strokeStyle = theme.selectionColor;
        ctx.globalAlpha = 0.08;
        ctx.strokeRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
        ctx.lineWidth = 5 / zoom;
        ctx.globalAlpha = 0.18;
        ctx.strokeRect(b.x - pad * 0.4, b.y - pad * 0.4, b.width + pad * 0.8, b.height + pad * 0.8);
        ctx.lineWidth = 2 / zoom;
        ctx.globalAlpha = 0.65;
        ctx.strokeRect(b.x - 1 / zoom, b.y - 1 / zoom, b.width + 2 / zoom, b.height + 2 / zoom);
        ctx.restore();
      }
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
      { x: b.x + b.width / 2, y: b.y }, // Top
      { x: b.x + b.width, y: b.y + b.height / 2 }, // Right
      { x: b.x + b.width / 2, y: b.y + b.height }, // Bottom
      { x: b.x, y: b.y + b.height / 2 }, // Left
    ];

    for (const p of positions) {
      ctx.fillRect(p.x - hh, p.y - hh, hs, hs);
      ctx.strokeRect(p.x - hh, p.y - hh, hs, hs);
    }

    // Rotation handle (circle above top-center)
    const rotX = b.x + b.width / 2;
    const rotY = b.y - 30 / zoom;
    const rotR = 5 / zoom;

    // Stem line from top-center to rotation handle
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(b.x + b.width / 2, b.y);
    ctx.lineTo(rotX, rotY);
    ctx.stroke();

    // Rotation circle
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    ctx.arc(rotX, rotY, rotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small rotation icon (curved arrow inside)
    ctx.strokeStyle = theme.selectionColor;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.arc(rotX, rotY, rotR * 0.6, -Math.PI * 0.6, Math.PI * 0.3);
    ctx.stroke();
  }

  /** Draw circle handles at start, control, and end points of a line/arrow. */
  private drawLinePointHandles(ctx: CanvasRenderingContext2D, el: { x: number; y: number; points: Vec2[]; controlPoint?: Vec2 | null }, theme: BoardierTheme, zoom: number): void {
    if (el.points.length < 2) return;
    const radius = 4 / zoom;
    const cpRadius = 5 / zoom;
    ctx.lineWidth = 1.5 / zoom;

    const p0 = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
    const p1 = { x: el.x + el.points[1].x, y: el.y + el.points[1].y };
    const cp = el.controlPoint
      ? { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y }
      : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

    // Draw dashed guidelines from control to endpoints
    ctx.strokeStyle = theme.selectionColor;
    ctx.setLineDash([3 / zoom, 3 / zoom]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(cp.x, cp.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start and end point handles
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.selectionColor;
    for (const p of [p0, p1]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Control point handle (diamond-shaped for distinction)
    ctx.fillStyle = el.controlPoint ? theme.selectionColor : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y - cpRadius);
    ctx.lineTo(cp.x + cpRadius, cp.y);
    ctx.lineTo(cp.x, cp.y + cpRadius);
    ctx.lineTo(cp.x - cpRadius, cp.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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

  // ─── Lasso-select ─────────────────────────────────────────────────

  private drawLassoSelect(ctx: CanvasRenderingContext2D, path: Vec2[], theme: BoardierTheme): void {
    ctx.fillStyle = theme.lassoFill;
    ctx.strokeStyle = theme.lassoColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ─── Smart Guides ────────────────────────────────────────────────

  private drawSmartGuides(ctx: CanvasRenderingContext2D, guides: SmartGuide[], theme: BoardierTheme): void {
    ctx.strokeStyle = theme.guideColor;
    ctx.lineWidth = 1;
    ctx.setLineDash(theme.guideDash);

    for (const g of guides) {
      ctx.beginPath();
      if (g.axis === 'x') {
        // Vertical guide
        ctx.moveTo(g.position, g.from);
        ctx.lineTo(g.position, g.to);
      } else {
        // Horizontal guide
        ctx.moveTo(g.from, g.position);
        ctx.lineTo(g.to, g.position);
      }
      ctx.stroke();
    }

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
      { x: b.x + b.width / 2, y: b.y }, // Top
      { x: b.x + b.width, y: b.y + b.height / 2 }, // Right
      { x: b.x + b.width / 2, y: b.y + b.height }, // Bottom
      { x: b.x, y: b.y + b.height / 2 }, // Left
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
