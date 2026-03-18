import type {
  BoardierElement,
  BoardierToolType,
  BoardierConfig,
  BoardierSceneData,
  ViewState,
  Vec2,
  Bounds,
} from './types';
import type { BoardierTheme } from '../themes/types';
import { Scene } from './Scene';
import { History } from './History';
import { Renderer } from './Renderer';
import { Clipboard } from './Clipboard';
import { BaseTool, type ToolContext } from '../tools/BaseTool';
import { SelectTool } from '../tools/SelectTool';
import { ShapeTool } from '../tools/ShapeTool';
import { LineTool } from '../tools/LineTool';
import { FreehandTool } from '../tools/FreehandTool';
import { TextTool } from '../tools/TextTool';
import { PanTool } from '../tools/PanTool';
import { EraseTool } from '../tools/EraseTool';
import { IconTool } from '../tools/IconTool';
import { clamp } from '../utils/math';
import { getElementBounds } from '../elements/base';
import { setIconImageLoadCallback } from '../elements/icon';

export class BoardierEngine {
  readonly scene = new Scene();
  readonly history = new History();
  readonly renderer: Renderer;
  readonly clipboard = new Clipboard();

  private viewState: ViewState = { scrollX: 0, scrollY: 0, zoom: 1 };
  private config: BoardierConfig;
  private theme: BoardierTheme;
  private canvas: HTMLCanvasElement;

  private tools: Map<BoardierToolType, BaseTool>;
  private activeToolType: BoardierToolType = 'select';

  // Space-bar pan override
  private spaceHeld = false;
  private panOverrideTool: PanTool;

  // RAF render batching
  private _rafId = 0;

  // Callbacks
  private _onChange?: (elements: BoardierElement[]) => void;
  private _onSelection?: (ids: string[]) => void;
  private _onView?: (vs: ViewState) => void;
  private _onTool?: (t: BoardierToolType) => void;
  private _onTextEdit?: (id: string) => void;
  private _onShapeLabelEdit?: (id: string) => void;
  private _onIconEdit?: (id: string) => void;

  constructor(canvas: HTMLCanvasElement, config: BoardierConfig, theme: BoardierTheme) {
    this.canvas = canvas;
    this.config = config;
    this.theme = theme;
    this.renderer = new Renderer(canvas);
    this.panOverrideTool = new PanTool();

    this.tools = new Map<BoardierToolType, BaseTool>([
      ['select', new SelectTool()],
      ['rectangle', new ShapeTool('rectangle')],
      ['ellipse', new ShapeTool('ellipse')],
      ['diamond', new ShapeTool('diamond')],
      ['line', new LineTool('line')],
      ['arrow', new LineTool('arrow')],
      ['freehand', new FreehandTool()],
      ['text', new TextTool()],
      ['pan', new PanTool()],
      ['eraser', new EraseTool()],
      ['icon', new IconTool()],
    ]);

    // Wire scene events → external callbacks
    this.scene.onChange(els => { this._onChange?.(els); });
    this.scene.onSelectionChange(ids => { this._onSelection?.(ids); });

    // Re-render when icon images finish loading (fixes color change causing invisible icons)
    setIconImageLoadCallback(() => this.render());
  }

  // ─── Tool context (passed to tools) ──────────────────────────────

  private get toolCtx(): ToolContext {
    return {
      scene: this.scene,
      history: this.history,
      renderer: this.renderer,
      clipboard: this.clipboard,
      theme: this.theme,
      getViewState: () => this.viewState,
      setViewState: (u) => {
        Object.assign(this.viewState, u);
        this._onView?.({ ...this.viewState });
      },
      screenToWorld: (s) => this.renderer.screenToWorld(s, this.viewState),
      requestRender: () => this.render(),
      commitHistory: () => this.history.push(this.scene.getElements()),
      setToolType: (t) => this.setTool(t),
      setCursor: (c) => { this.canvas.style.cursor = c; },
      startTextEditing: (id) => { this._onTextEdit?.(id); },
      getCanvasRect: () => this.canvas.getBoundingClientRect(),
    };
  }

  private get activeTool(): BaseTool {
    if (this.spaceHeld) return this.panOverrideTool;
    return this.tools.get(this.activeToolType) || this.tools.get('select')!;
  }

  // ─── Public API ──────────────────────────────────────────────────

  setTool(type: BoardierToolType): void {
    if (type === this.activeToolType) return;
    this.activeTool.onDeactivate(this.toolCtx);
    this.activeToolType = type;
    this.activeTool.onActivate(this.toolCtx);
    this.canvas.style.cursor = this.activeTool.getCursor();
    this._onTool?.(type);
  }

  getTool(): BoardierToolType { return this.activeToolType; }

  undo(): void {
    const snapshot = this.history.undo();
    if (snapshot) {
      this.scene.setElements(snapshot);
      this.scene.clearSelection();
      this.render();
    }
  }

  redo(): void {
    const snapshot = this.history.redo();
    if (snapshot) {
      this.scene.setElements(snapshot);
      this.scene.clearSelection();
      this.render();
    }
  }

  deleteSelected(): void {
    const ids = this.scene.getSelectedIds();
    if (!ids.length) return;
    this.history.push(this.scene.getElements());
    this.scene.removeElements(ids);
    this.history.push(this.scene.getElements());
    this.render();
  }

  selectAll(): void {
    this.scene.setSelection(this.scene.getElements().map(e => e.id));
    this.render();
  }

  bringToFront(): void {
    for (const id of this.scene.getSelectedIds()) this.scene.bringToFront(id);
    this.render();
  }

  sendToBack(): void {
    for (const id of this.scene.getSelectedIds()) this.scene.sendToBack(id);
    this.render();
  }

  updateSelectedElements(updates: Partial<BoardierElement>): void {
    this.history.push(this.scene.getElements());
    const ids = this.scene.getSelectedIds();
    this.scene.updateElements(ids.map(id => ({ id, changes: updates })));
    this.history.push(this.scene.getElements());
    this.render();
  }

  getSceneData(): BoardierSceneData {
    return this.scene.toJSON(this.viewState);
  }

  loadScene(data: BoardierSceneData | null): void {
    if (!data || data.engine !== 'boardier') {
      this.scene.setElements([]);
      this.viewState = { scrollX: 0, scrollY: 0, zoom: 1 };
    } else {
      this.viewState = this.scene.fromJSON(data);
    }
    this.history.clear();
    this.history.push(this.scene.getElements());
    this.render();
  }

  addElements(elements: BoardierElement[]): void {
    this.history.push(this.scene.getElements());
    this.scene.addElements(elements);
    this.history.push(this.scene.getElements());
    this.render();
  }

  // ─── View ────────────────────────────────────────────────────────

  getViewState(): ViewState { return { ...this.viewState }; }

  setViewState(vs: Partial<ViewState>): void {
    Object.assign(this.viewState, vs);
    this._onView?.({ ...this.viewState });
    this.render();
  }

  zoomTo(level: number): void {
    const min = this.config.minZoom ?? 0.1;
    const max = this.config.maxZoom ?? 5;
    const centerX = this.canvas.clientWidth / 2;
    const centerY = this.canvas.clientHeight / 2;
    const worldBefore = this.renderer.screenToWorld({ x: centerX, y: centerY }, this.viewState);
    this.viewState.zoom = clamp(level, min, max);
    this.viewState.scrollX = centerX - worldBefore.x * this.viewState.zoom;
    this.viewState.scrollY = centerY - worldBefore.y * this.viewState.zoom;
    this._onView?.({ ...this.viewState });
    this.render();
  }

  zoomToFit(): void {
    const elements = this.scene.getElements();
    if (elements.length === 0) {
      this.viewState = { scrollX: this.canvas.clientWidth / 2, scrollY: this.canvas.clientHeight / 2, zoom: 1 };
      this._onView?.({ ...this.viewState });
      this.render();
      return;
    }
    const allBounds = elements.map(getElementBounds);
    const minX = Math.min(...allBounds.map(b => b.x));
    const minY = Math.min(...allBounds.map(b => b.y));
    const maxX = Math.max(...allBounds.map(b => b.x + b.width));
    const maxY = Math.max(...allBounds.map(b => b.y + b.height));
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 60;
    const zoom = clamp(
      Math.min((this.canvas.clientWidth - padding * 2) / contentW, (this.canvas.clientHeight - padding * 2) / contentH),
      this.config.minZoom ?? 0.1,
      this.config.maxZoom ?? 5,
    );
    this.viewState.zoom = zoom;
    this.viewState.scrollX = (this.canvas.clientWidth / 2) - ((minX + contentW / 2) * zoom);
    this.viewState.scrollY = (this.canvas.clientHeight / 2) - ((minY + contentH / 2) * zoom);
    this._onView?.({ ...this.viewState });
    this.render();
  }

  // ─── Theme ───────────────────────────────────────────────────────

  setTheme(theme: BoardierTheme): void {
    this.theme = theme;
    this.render();
  }

  getTheme(): BoardierTheme { return this.theme; }

  // ─── Event handling (called by React component) ──────────────────

  handlePointerDown(e: PointerEvent): void {
    if (this.config.readOnly) return;
    const rect = this.canvas.getBoundingClientRect();
    const screen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.renderer.screenToWorld(screen, this.viewState);
    this.activeTool.onPointerDown(this.toolCtx, world, e);
  }

  handlePointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.renderer.screenToWorld(screen, this.viewState);
    this.activeTool.onPointerMove(this.toolCtx, world, e);
  }

  handlePointerUp(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.renderer.screenToWorld(screen, this.viewState);
    this.activeTool.onPointerUp(this.toolCtx, world, e);
  }

  handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const screen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom
      const delta = -e.deltaY * 0.005;
      const min = this.config.minZoom ?? 0.1;
      const max = this.config.maxZoom ?? 5;
      const newZoom = clamp(this.viewState.zoom * (1 + delta), min, max);
      const worldBefore = this.renderer.screenToWorld(screen, this.viewState);
      this.viewState.zoom = newZoom;
      this.viewState.scrollX = screen.x - worldBefore.x * newZoom;
      this.viewState.scrollY = screen.y - worldBefore.y * newZoom;
    } else {
      // Pan
      this.viewState.scrollX -= e.deltaX;
      this.viewState.scrollY -= e.deltaY;
    }

    this._onView?.({ ...this.viewState });
    this.render();
  }

  handleKeyDown(e: KeyboardEvent): void {
    // Space → pan override
    if (e.code === 'Space' && !this.spaceHeld && !e.repeat) {
      this.spaceHeld = true;
      this.canvas.style.cursor = 'grab';
      return;
    }

    // Ctrl shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z': e.shiftKey ? this.redo() : this.undo(); e.preventDefault(); return;
        case 'y': this.redo(); e.preventDefault(); return;
        case 'a': this.selectAll(); e.preventDefault(); return;
        case 'c': this.clipboard.copy(this.scene.getSelectedElements()); return;
        case 'x':
          this.clipboard.copy(this.scene.getSelectedElements());
          this.deleteSelected();
          return;
        case 'v':
          if (this.clipboard.hasContent) {
            this.history.push(this.scene.getElements());
            const pasted = this.clipboard.paste();
            this.scene.addElements(pasted);
            this.scene.setSelection(pasted.map(e => e.id));
            this.history.push(this.scene.getElements());
            this.render();
          }
          return;
        case 'd':
          e.preventDefault();
          if (this.scene.getSelectedIds().length) {
            this.clipboard.copy(this.scene.getSelectedElements());
            this.history.push(this.scene.getElements());
            const duped = this.clipboard.paste();
            this.scene.addElements(duped);
            this.scene.setSelection(duped.map(el => el.id));
            this.history.push(this.scene.getElements());
            this.render();
          }
          return;
        case '=': case '+': e.preventDefault(); this.zoomTo(this.viewState.zoom * 1.2); return;
        case '-': e.preventDefault(); this.zoomTo(this.viewState.zoom / 1.2); return;
        case '0': e.preventDefault(); this.zoomTo(1); return;
      }
      if (e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        this.zoomToFit();
        return;
      }
    }

    // Tool shortcuts (single key, no modifier)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const toolMap: Record<string, BoardierToolType> = {
        v: 'select', r: 'rectangle', e: 'ellipse', d: 'diamond',
        l: 'line', a: 'arrow', p: 'freehand', t: 'text',
        h: 'pan', x: 'eraser',
      };
      if (toolMap[e.key]) { this.setTool(toolMap[e.key]); return; }

      // Z-order
      if (e.key === ']') { this.bringToFront(); return; }
      if (e.key === '[') { this.sendToBack(); return; }
    }

    this.activeTool.onKeyDown(this.toolCtx, e);
  }

  handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      this.canvas.style.cursor = this.activeTool.getCursor();
    }
    this.activeTool.onKeyUp(this.toolCtx, e);
  }

  handleDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.renderer.screenToWorld(screen, this.viewState);

    // If the active tool supports double-click, delegate
    const tool = this.activeTool as any;
    if (tool.onDoubleClick) {
      tool.onDoubleClick(this.toolCtx, world);
      return;
    }

    const hit = this.scene.hitTest(world);
    if (!hit) return;

    if (hit.type === 'text') {
      this.scene.setSelection([hit.id]);
      this._onTextEdit?.(hit.id);
    } else if (hit.type === 'rectangle' || hit.type === 'ellipse' || hit.type === 'diamond') {
      // Double-click a shape → edit its label
      this.scene.setSelection([hit.id]);
      this._onShapeLabelEdit?.(hit.id);
    } else if (hit.type === 'icon') {
      // Double-click an icon → open picker to replace it
      this.scene.setSelection([hit.id]);
      this._onIconEdit?.(hit.id);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────

  render(): void {
    cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._doRender());
  }

  /** Synchronous render — use for export or when RAF isn't suitable. */
  renderNow(): void {
    cancelAnimationFrame(this._rafId);
    this._doRender();
  }

  private _doRender(): void {
    const selectTool = this.tools.get('select') as SelectTool;
    this.renderer.render(
      this.scene.getElements(),
      this.viewState,
      new Set(this.scene.getSelectedIds()),
      this.theme,
      {
        showGrid: this.config.showGrid ?? true,
        gridSize: this.config.gridSize ?? 20,
        boxSelect: selectTool?.getBoxSelectBounds?.() ?? null,
        lassoPath: selectTool?.getLassoPath?.() ?? null,
        smartGuides: selectTool?.getSmartGuides?.() ?? [],
      },
    );
  }

  resize(w: number, h: number): void {
    this.renderer.resize(w, h);
    this.render();
  }

  // ─── Event listeners ─────────────────────────────────────────────

  onChange(cb: (elements: BoardierElement[]) => void): void { this._onChange = cb; }
  onSelectionChange(cb: (ids: string[]) => void): void { this._onSelection = cb; }
  onViewChange(cb: (vs: ViewState) => void): void { this._onView = cb; }
  onToolChange(cb: (t: BoardierToolType) => void): void { this._onTool = cb; }
  onTextEditRequest(cb: (id: string) => void): void { this._onTextEdit = cb; }
  onShapeLabelEditRequest(cb: (id: string) => void): void { this._onShapeLabelEdit = cb; }
  onIconEditRequest(cb: (id: string) => void): void { this._onIconEdit = cb; }

  dispose(): void {
    cancelAnimationFrame(this._rafId);
    this._onChange = undefined;
    this._onSelection = undefined;
    this._onView = undefined;
    this._onTool = undefined;
    this._onTextEdit = undefined;
    this._onShapeLabelEdit = undefined;
    this._onIconEdit = undefined;
  }

  // ─── AI-Facing API ──────────────────────────────────────────────
  // Designed to be easily consumed by chatbots / AI integrations.

  /** Search elements by type, text content, color, or proximity. */
  searchElements(query: {
    type?: string;
    text?: string;
    strokeColor?: string;
    backgroundColor?: string;
    near?: Vec2;
    radius?: number;
  }): BoardierElement[] {
    return this.scene.getElements().filter(el => {
      if (query.type && el.type !== query.type) return false;
      if (query.text) {
        if (el.type !== 'text') return false;
        if (!(el as any).text?.toLowerCase().includes(query.text.toLowerCase())) return false;
      }
      if (query.strokeColor && el.strokeColor !== query.strokeColor) return false;
      if (query.backgroundColor && el.backgroundColor !== query.backgroundColor) return false;
      if (query.near && query.radius) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const dx = cx - query.near.x;
        const dy = cy - query.near.y;
        if (Math.sqrt(dx * dx + dy * dy) > query.radius) return false;
      }
      return true;
    });
  }

  /** Get a human-readable / AI-parseable summary of the scene. */
  getSceneSummary(): string {
    const elements = this.scene.getElements();
    if (elements.length === 0) return 'Empty canvas.';
    const byType: Record<string, number> = {};
    for (const el of elements) byType[el.type] = (byType[el.type] || 0) + 1;
    const typeSummary = Object.entries(byType).map(([t, n]) => `${n} ${t}${n > 1 ? 's' : ''}`).join(', ');
    const texts = elements.filter(e => e.type === 'text').map(e => `"${(e as any).text}"`).join(', ');
    let summary = `Canvas has ${elements.length} elements: ${typeSummary}.`;
    if (texts) summary += ` Text elements: ${texts}.`;
    return summary;
  }

  /** Get scene statistics. */
  getSceneStats(): { totalElements: number; elementsByType: Record<string, number>; bounds: Bounds | null } {
    const elements = this.scene.getElements();
    const byType: Record<string, number> = {};
    for (const el of elements) byType[el.type] = (byType[el.type] || 0) + 1;
    if (elements.length === 0) return { totalElements: 0, elementsByType: byType, bounds: null };
    const allBounds = elements.map(getElementBounds);
    const minX = Math.min(...allBounds.map(b => b.x));
    const minY = Math.min(...allBounds.map(b => b.y));
    const maxX = Math.max(...allBounds.map(b => b.x + b.width));
    const maxY = Math.max(...allBounds.map(b => b.y + b.height));
    return { totalElements: elements.length, elementsByType: byType, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
  }

  /** Move an element to absolute position. */
  moveElement(id: string, x: number, y: number): void {
    this.history.push(this.scene.getElements());
    this.scene.updateElement(id, { x, y });
    this.history.push(this.scene.getElements());
    this.render();
  }

  /** Resize an element. */
  resizeElement(id: string, width: number, height: number): void {
    this.history.push(this.scene.getElements());
    this.scene.updateElement(id, { width, height });
    this.history.push(this.scene.getElements());
    this.render();
  }

  /** Set stroke/fill color of an element. */
  setElementColor(id: string, stroke?: string, fill?: string): void {
    const changes: Partial<BoardierElement> = {};
    if (stroke) changes.strokeColor = stroke;
    if (fill) { changes.backgroundColor = fill; changes.fillStyle = fill === 'transparent' ? 'none' : 'solid'; }
    this.history.push(this.scene.getElements());
    this.scene.updateElement(id, changes);
    this.history.push(this.scene.getElements());
    this.render();
  }

  /** Delete all elements. */
  deleteAll(): void {
    this.history.push(this.scene.getElements());
    this.scene.setElements([]);
    this.history.push(this.scene.getElements());
    this.render();
  }

  /** Pan the view to center on a world coordinate. */
  panTo(x: number, y: number): void {
    this.viewState.scrollX = this.canvas.clientWidth / 2 - x * this.viewState.zoom;
    this.viewState.scrollY = this.canvas.clientHeight / 2 - y * this.viewState.zoom;
    this._onView?.({ ...this.viewState });
    this.render();
  }

  /** Select elements by IDs. */
  selectElements(ids: string[]): void {
    this.scene.setSelection(ids);
    this.render();
  }

  /** Get the canvas element for direct access. */
  getCanvas(): HTMLCanvasElement { return this.canvas; }
}
