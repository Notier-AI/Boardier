/**
 * @boardier-module core/Engine
 * @boardier-category Core
 * @boardier-description The central orchestrator of the Boardier whiteboard. `BoardierEngine` owns the scene graph, undo/redo history, renderer, clipboard, and the active tool. It exposes a public API for tool switching, element manipulation, multi-page support, viewport control, theming, and an AI-facing interface for LLM integration.
 * @boardier-since 0.1.0
 * @boardier-see Scene, Renderer, History, Clipboard, BaseTool
 * @boardier-changed 0.5.0 Added CollaborationProvider integration — collab-aware undo/redo via Y.js UndoManager, cursor/selection forwarding, and getCollaboration() accessor
 */
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
import { MarkerTool } from '../tools/MarkerTool';
import { WidgetTool } from '../tools/WidgetTool';
import { ImageTool } from '../tools/ImageTool';
import { CommentTool } from '../tools/CommentTool';
import { clamp } from '../utils/math';
import { getElementBounds, createElement } from '../elements/base';
import { CollaborationProvider } from './Collaboration';
import { setIconImageLoadCallback } from '../elements/icon';
import { setIconResolveCallback, preloadIconSets } from '../utils/iconResolver';
import { generateId } from '../utils/id';
import { layoutGrid, layoutTree, layoutRadial, layoutForce, type LayoutOptions, type ForceLayoutOptions } from '../ai/layout';
import { applyPreset, applyStyle, extractStyle, type ElementStyle } from '../ai/styles';
import type { BoardierPage } from './types';

/**
 * @boardier-class BoardierEngine
 * @boardier-description The main engine class. Instantiate with a `<canvas>` element, a config, and a theme. All user interaction flows through `handlePointer*` / `handleWheel` / `handleKey*` methods which delegate to the active tool. The engine batches re-renders via `requestAnimationFrame`.
 * @boardier-usage `const engine = new BoardierEngine(canvasEl, { showGrid: true }, defaultTheme);`
 * @boardier-ai The engine exposes `searchElements()`, `getSceneSummary()`, `getSceneStats()`, `moveElement()`, `resizeElement()`, `setElementColor()`, `deleteAll()`, `panTo()`, `selectElements()`, and `getCanvas()` specifically for LLM agents to read and manipulate the whiteboard programmatically.
 */
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

  // Collaboration
  private collab: CollaborationProvider | null = null;

  // Callbacks
  private _onChange?: (elements: BoardierElement[]) => void;
  private _onSelection?: (ids: string[]) => void;
  private _onView?: (vs: ViewState) => void;
  private _onTool?: (t: BoardierToolType) => void;
  private _onTextEdit?: (id: string) => void;
  private _onShapeLabelEdit?: (id: string) => void;
  private _onIconEdit?: (id: string) => void;
  private _onEmbedUrl?: (id: string) => void;
  private _onTableCellEdit?: (id: string, row: number, col: number) => void;

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
      ['marker', new MarkerTool()],
      ['checkbox', new WidgetTool('checkbox', 140, 28)],
      ['radiogroup', new WidgetTool('radiogroup', 140, 80)],
      ['frame', new WidgetTool('frame', 300, 200)],
      ['image', new ImageTool()],
      ['embed', new WidgetTool('embed' as any, 280, 60)],
      ['table', new WidgetTool('table' as any, 300, 120)],
      ['comment', new CommentTool()],
    ]);

    // Wire scene events → external callbacks
    this.scene.onChange(els => { this._onChange?.(els); });
    this.scene.onSelectionChange(ids => {
      this._onSelection?.(ids);
      this.collab?.updateSelection(ids);
    });

    // Re-render when icon images finish loading (fixes color change causing invisible icons)
    setIconImageLoadCallback(() => this.render());
    setIconResolveCallback(() => this.render());

    // Pre-load common icon sets so bracket icons resolve quickly in AI-generated content
    preloadIconSets();

    // Initialize collaboration if configured (don't auto-connect — CollabOverlay handles that)
    if (config.collaboration) {
      this.collab = new CollaborationProvider(this.scene, config.collaboration);
      this.collab.requestRender = () => this.render();
    }
  }

  // ─── Tool context (passed to tools) ──────────────────────────────

  private get toolCtx(): ToolContext {
    return {
      scene: this.scene,
      history: this.history,
      renderer: this.renderer,
      clipboard: this.clipboard,
      theme: this.theme,
      config: this.config,
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
      startEmbedUrlEditing: (id) => { this._onEmbedUrl?.(id); },
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
    if (this.collab) {
      this.collab.undo();
      this.render();
      return;
    }
    const snapshot = this.history.undo();
    if (snapshot) {
      this.scene.setElements(snapshot);
      this.scene.clearSelection();
      this.render();
    }
  }

  redo(): void {
    if (this.collab) {
      this.collab.redo();
      this.render();
      return;
    }
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

  // ─── Multi-page ──────────────────────────────────────────────────

  private pages: BoardierPage[] = [];
  private activePageId: string = '';
  private _onPageChange?: (pages: BoardierPage[], activeId: string) => void;

  onPageChange(cb: (pages: BoardierPage[], activeId: string) => void): void { this._onPageChange = cb; }

  getPages(): BoardierPage[] { return this.pages; }
  getActivePageId(): string { return this.activePageId; }

  /** Initialize pages from loaded scene data or create default page. */
  initPages(pages?: BoardierPage[], activeId?: string): void {
    if (pages && pages.length > 0) {
      this.pages = pages;
      this.activePageId = activeId || pages[0].id;
    } else {
      const pageId = generateId();
      this.pages = [{ id: pageId, name: 'Page 1', elements: this.scene.getElements() }];
      this.activePageId = pageId;
    }
    this._onPageChange?.(this.pages, this.activePageId);
  }

  addPage(name?: string): string {
    // Save current page elements
    this.saveCurrentPage();
    const id = generateId();
    this.pages.push({ id, name: name || `Page ${this.pages.length + 1}`, elements: [] });
    this.switchToPage(id);
    return id;
  }

  deletePage(pageId: string): void {
    if (this.pages.length <= 1) return; // Always keep at least one page
    const idx = this.pages.findIndex(p => p.id === pageId);
    if (idx === -1) return;
    this.pages.splice(idx, 1);
    if (this.activePageId === pageId) {
      const newIdx = Math.min(idx, this.pages.length - 1);
      this.switchToPage(this.pages[newIdx].id);
    }
    this._onPageChange?.(this.pages, this.activePageId);
  }

  renamePage(pageId: string, name: string): void {
    const page = this.pages.find(p => p.id === pageId);
    if (page) {
      page.name = name;
      this._onPageChange?.(this.pages, this.activePageId);
    }
  }

  switchToPage(pageId: string): void {
    if (pageId === this.activePageId) return;
    this.saveCurrentPage();
    const page = this.pages.find(p => p.id === pageId);
    if (!page) return;
    this.activePageId = pageId;
    this.scene.setElements(page.elements);
    this.scene.clearSelection();
    this.history.clear();
    this.history.push(this.scene.getElements());
    this._onPageChange?.(this.pages, this.activePageId);
    this.render();
  }

  private saveCurrentPage(): void {
    const page = this.pages.find(p => p.id === this.activePageId);
    if (page) {
      page.elements = this.scene.getElements();
    }
  }

  /** Get scene data including all pages. */
  getSceneDataWithPages(): BoardierSceneData {
    this.saveCurrentPage();
    const data = this.scene.toJSON(this.viewState);
    data.pages = this.pages;
    data.activePageId = this.activePageId;
    return data;
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

  /** Get the collaboration provider, or null if multiplayer is not enabled. */
  getCollaboration(): CollaborationProvider | null { return this.collab; }

  /** Start a collaboration session dynamically (host mode if no roomId, guest if roomId provided). */
  startCollaboration(config: import('./types').CollaborationConfig): CollaborationProvider {
    if (this.collab) {
      this.collab.destroy();
    }
    this.collab = new CollaborationProvider(this.scene, config);
    this.collab.requestRender = () => this.render();
    this.collab.connect();
    return this.collab;
  }

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
    this.collab?.updateCursor(world);
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
      // Check if hovering over a scrollable text element
      const world = this.renderer.screenToWorld(screen, this.viewState);
      const hit = this.scene.hitTest(world, 4);
      if (hit && hit.type === 'text' && hit.scrollbar !== false) {
        const el = hit;
        const lineH = el.fontSize * el.lineHeight;
        const rawLines = el.multiLine !== false ? el.text.split('\n') : [el.text.replace(/\n/g, ' ')];
        // Word-wrap using the canvas context for accurate content height
        const ctx = this.canvas.getContext('2d');
        let wrappedCount = rawLines.length;
        if (ctx) {
          ctx.font = `${el.fontSize}px ${el.fontFamily}`;
          wrappedCount = 0;
          for (const raw of rawLines) {
            if (!raw || el.width <= 0) { wrappedCount++; continue; }
            if (ctx.measureText(raw).width <= el.width) { wrappedCount++; continue; }
            const words = raw.split(/(\s+)/);
            let cur = '';
            for (const w of words) {
              const test = cur + w;
              if (ctx.measureText(test).width > el.width && cur.length > 0) {
                wrappedCount++;
                cur = w.trimStart();
              } else { cur = test; }
            }
            if (cur) wrappedCount++;
          }
        }
        const totalContentH = wrappedCount * lineH;
        const maxScroll = Math.max(0, totalContentH - el.height);
        if (maxScroll > 0) {
          const current = el.scrollTop ?? 0;
          const next = clamp(current + e.deltaY, 0, maxScroll);
          if (next !== current) {
            this.scene.updateElement(el.id, { scrollTop: next } as any);
            this.render();
            return;
          }
        }
      }
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
        h: 'pan', x: 'eraser', m: 'marker', f: 'frame',
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
    } else if (hit.type === 'checkbox') {
      // Toggle checked state
      this.history.push(this.scene.getElements());
      this.scene.updateElement(hit.id, { checked: !(hit as any).checked } as any);
      this.history.push(this.scene.getElements());
      this.render();
    } else if (hit.type === 'radiogroup') {
      // Cycle selected index
      const el = hit as any;
      const next = (el.selectedIndex + 1) % el.options.length;
      this.history.push(this.scene.getElements());
      this.scene.updateElement(hit.id, { selectedIndex: next } as any);
      this.history.push(this.scene.getElements());
      this.render();
    } else if (hit.type === 'comment') {
      // Toggle comment resolved state
      this.history.push(this.scene.getElements());
      this.scene.updateElement(hit.id, { resolved: !(hit as any).resolved } as any);
      this.history.push(this.scene.getElements());
      this.render();
    } else if (hit.type === 'table') {
      // Find which cell was double-clicked
      const table = hit as any;
      const localX = world.x - table.x;
      const localY = world.y - table.y;
      let cumX = 0, col = -1;
      for (let c = 0; c < table.cols; c++) {
        if (localX >= cumX && localX < cumX + table.colWidths[c]) { col = c; break; }
        cumX += table.colWidths[c];
      }
      let cumY = 0, row = -1;
      for (let r = 0; r < table.rows; r++) {
        if (localY >= cumY && localY < cumY + table.rowHeights[r]) { row = r; break; }
        cumY += table.rowHeights[r];
      }
      if (row >= 0 && col >= 0) {
        this.scene.setSelection([hit.id]);
        this._onTableCellEdit?.(hit.id, row, col);
      }
    } else if (hit.type === 'embed') {
      // Double-click embed → edit URL
      this.scene.setSelection([hit.id]);
      this._onEmbedUrl?.(hit.id);
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
    // Collect binding highlight IDs from active line/arrow tool or select tool endpoint drag
    const bindHighlightIds: string[] = [];
    const lineTool = this.tools.get('line') as LineTool | undefined;
    const arrowTool = this.tools.get('arrow') as LineTool | undefined;
    const activeLT = this.activeToolType === 'line' ? lineTool : this.activeToolType === 'arrow' ? arrowTool : null;
    if (activeLT?.hoverBindTargetId) {
      bindHighlightIds.push(activeLT.hoverBindTargetId);
    }
    if (selectTool?.hoverBindTargetId) {
      bindHighlightIds.push(selectTool.hoverBindTargetId);
    }

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
        bindHighlightIds,
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
  onEmbedUrlRequest(cb: (id: string) => void): void { this._onEmbedUrl = cb; }
  onTableCellEditRequest(cb: (id: string, row: number, col: number) => void): void { this._onTableCellEdit = cb; }

  dispose(): void {
    cancelAnimationFrame(this._rafId);
    this.collab?.destroy();
    this.collab = null;
    this._onChange = undefined;
    this._onSelection = undefined;
    this._onView = undefined;
    this._onTool = undefined;
    this._onTextEdit = undefined;
    this._onShapeLabelEdit = undefined;
    this._onIconEdit = undefined;
    this._onEmbedUrl = undefined;
    this._onTableCellEdit = undefined;
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

    // Labels & text
    const labeled = elements.filter(e => (e as any).label || (e as any).text);
    const labelSummary = labeled.slice(0, 15).map(e => {
      const label = (e as any).label || (e as any).text || '';
      return `${e.type}:"${label.substring(0, 40)}"`;
    });

    // Connection graph
    const arrows = elements.filter(e => e.type === 'arrow') as any[];
    const connections = arrows
      .filter(a => a.startBindingId && a.endBindingId)
      .slice(0, 20)
      .map(a => {
        const from = elements.find(e => e.id === a.startBindingId);
        const to = elements.find(e => e.id === a.endBindingId);
        const fromName = (from as any)?.label || (from as any)?.text || from?.type || '?';
        const toName = (to as any)?.label || (to as any)?.text || to?.type || '?';
        return `${fromName} → ${toName}`;
      });

    // Frames
    const frames = elements.filter(e => e.type === 'frame') as any[];
    const frameSummary = frames.slice(0, 5).map(f => {
      const childCount = f.childIds?.length || 0;
      return `Frame "${f.label || 'untitled'}" (${childCount} children)`;
    });

    let summary = `Canvas has ${elements.length} elements: ${typeSummary}.`;
    if (labelSummary.length > 0) summary += `\nLabeled: ${labelSummary.join(', ')}.`;
    if (connections.length > 0) summary += `\nConnections: ${connections.join('; ')}.`;
    if (frameSummary.length > 0) summary += `\nFrames: ${frameSummary.join('; ')}.`;
    return summary;
  }

  /**
   * Get a detailed description of the scene for AI consumption.
   * @param detail 'brief' returns summary + stats. 'full' adds spatial relationships and element details.
   */
  getSceneDescription(detail: 'brief' | 'full' = 'brief'): string {
    const summary = this.getSceneSummary();
    const stats = this.getSceneStats();

    if (detail === 'brief') {
      let desc = summary;
      if (stats.bounds) {
        desc += `\nBounds: (${Math.round(stats.bounds.x)}, ${Math.round(stats.bounds.y)}) ${Math.round(stats.bounds.width)}×${Math.round(stats.bounds.height)}.`;
      }
      return desc;
    }

    // Full detail: include element list with positions, sizes, colors
    const elements = this.scene.getElements();
    let desc = summary + '\n';
    if (stats.bounds) {
      desc += `Canvas bounds: (${Math.round(stats.bounds.x)}, ${Math.round(stats.bounds.y)}) ${Math.round(stats.bounds.width)}×${Math.round(stats.bounds.height)}\n`;
    }

    // Spatial regions
    if (elements.length > 0 && stats.bounds) {
      const midX = stats.bounds.x + stats.bounds.width / 2;
      const midY = stats.bounds.y + stats.bounds.height / 2;
      const regions: Record<string, string[]> = { 'top-left': [], 'top-right': [], 'bottom-left': [], 'bottom-right': [] };
      for (const el of elements) {
        if (el.type === 'arrow' || el.type === 'line') continue;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const quad = `${cy < midY ? 'top' : 'bottom'}-${cx < midX ? 'left' : 'right'}`;
        const name = (el as any).label || (el as any).text || el.type;
        regions[quad].push(name);
      }
      const nonEmptyRegions = Object.entries(regions).filter(([, v]) => v.length > 0);
      if (nonEmptyRegions.length > 1) {
        desc += '\nSpatial layout:\n';
        for (const [quad, items] of nonEmptyRegions) {
          desc += `  ${quad}: ${items.slice(0, 5).join(', ')}${items.length > 5 ? ` (+${items.length - 5} more)` : ''}\n`;
        }
      }
    }

    // Element details (first 50)
    desc += `\nElement details (${Math.min(elements.length, 50)} of ${elements.length}):\n`;
    for (const el of elements.slice(0, 50)) {
      const label = (el as any).label || (el as any).text || '';
      const pos = `(${Math.round(el.x)},${Math.round(el.y)})`;
      const size = `${Math.round(el.width)}×${Math.round(el.height)}`;
      const colors = `stroke:${el.strokeColor} fill:${el.backgroundColor}`;
      desc += `  [${el.id}] ${el.type} ${pos} ${size} ${label ? `"${label}" ` : ''}${colors}\n`;
    }

    // Groups
    const groups = new Map<string, string[]>();
    for (const el of elements) {
      for (const gid of el.groupIds) {
        if (!groups.has(gid)) groups.set(gid, []);
        groups.get(gid)!.push((el as any).label || (el as any).text || el.type);
      }
    }
    if (groups.size > 0) {
      desc += `\nGroups (${groups.size}):\n`;
      for (const [gid, members] of groups) {
        desc += `  Group ${gid}: ${members.join(', ')}\n`;
      }
    }

    // Selection
    const selectedIds = this.scene.getSelectedIds();
    if (selectedIds.length > 0) {
      desc += `\nSelected: ${selectedIds.length} element(s) [${selectedIds.slice(0, 10).join(', ')}]\n`;
    }

    return desc;
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

  // ─── Align & Distribute ───────────────────────────────────────

  /** Align selected elements. Axis: 'left'|'centerH'|'right'|'top'|'centerV'|'bottom'. */
  alignSelected(axis: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'): void {
    const ids = this.scene.getSelectedIds();
    if (ids.length < 2) return;
    const elements = ids.map(id => this.scene.getElements().find(e => e.id === id)).filter(Boolean) as BoardierElement[];
    const bounds = elements.map(getElementBounds);
    this.history.push(this.scene.getElements());

    switch (axis) {
      case 'left': {
        const target = Math.min(...bounds.map(b => b.x));
        for (let i = 0; i < elements.length; i++) this.scene.updateElement(elements[i].id, { x: target });
        break;
      }
      case 'centerH': {
        const allMinX = Math.min(...bounds.map(b => b.x));
        const allMaxX = Math.max(...bounds.map(b => b.x + b.width));
        const center = (allMinX + allMaxX) / 2;
        for (let i = 0; i < elements.length; i++) this.scene.updateElement(elements[i].id, { x: center - bounds[i].width / 2 });
        break;
      }
      case 'right': {
        const target = Math.max(...bounds.map(b => b.x + b.width));
        for (let i = 0; i < elements.length; i++) this.scene.updateElement(elements[i].id, { x: target - bounds[i].width });
        break;
      }
      case 'top': {
        const target = Math.min(...bounds.map(b => b.y));
        for (let i = 0; i < elements.length; i++) this.scene.updateElement(elements[i].id, { y: target });
        break;
      }
      case 'centerV': {
        const allMinY = Math.min(...bounds.map(b => b.y));
        const allMaxY = Math.max(...bounds.map(b => b.y + b.height));
        const center = (allMinY + allMaxY) / 2;
        for (let i = 0; i < elements.length; i++) this.scene.updateElement(elements[i].id, { y: center - bounds[i].height / 2 });
        break;
      }
      case 'bottom': {
        const target = Math.max(...bounds.map(b => b.y + b.height));
        for (let i = 0; i < elements.length; i++) this.scene.updateElement(elements[i].id, { y: target - bounds[i].height });
        break;
      }
    }
    this.history.push(this.scene.getElements());
    this.render();
  }

  /** Distribute selected elements evenly. Direction: 'horizontal' | 'vertical'. */
  distributeSelected(direction: 'horizontal' | 'vertical'): void {
    const ids = this.scene.getSelectedIds();
    if (ids.length < 3) return;
    const elements = ids.map(id => this.scene.getElements().find(e => e.id === id)).filter(Boolean) as BoardierElement[];
    const bounds = elements.map(getElementBounds);
    this.history.push(this.scene.getElements());

    if (direction === 'horizontal') {
      const sorted = elements.map((el, i) => ({ el, b: bounds[i] })).sort((a, b) => a.b.x - b.b.x);
      const minX = sorted[0].b.x;
      const maxX = sorted[sorted.length - 1].b.x + sorted[sorted.length - 1].b.width;
      const totalWidth = sorted.reduce((s, { b }) => s + b.width, 0);
      const gap = (maxX - minX - totalWidth) / (sorted.length - 1);
      let x = minX;
      for (const { el, b } of sorted) {
        this.scene.updateElement(el.id, { x });
        x += b.width + gap;
      }
    } else {
      const sorted = elements.map((el, i) => ({ el, b: bounds[i] })).sort((a, b) => a.b.y - b.b.y);
      const minY = sorted[0].b.y;
      const maxY = sorted[sorted.length - 1].b.y + sorted[sorted.length - 1].b.height;
      const totalHeight = sorted.reduce((s, { b }) => s + b.height, 0);
      const gap = (maxY - minY - totalHeight) / (sorted.length - 1);
      let y = minY;
      for (const { el, b } of sorted) {
        this.scene.updateElement(el.id, { y });
        y += b.height + gap;
      }
    }
    this.history.push(this.scene.getElements());
    this.render();
  }

  // ─── Auto-Arrange ─────────────────────────────────────────────

  /** Auto-arrange all (or selected) elements using the given algorithm. */
  autoArrange(
    algorithm: 'grid' | 'tree' | 'radial' | 'force' = 'grid',
    options?: LayoutOptions | ForceLayoutOptions
  ): void {
    const selectedIds = this.scene.getSelectedIds();
    const useSelected = selectedIds.length > 1;
    const all = this.scene.getElements();
    const targets = useSelected ? all.filter(e => selectedIds.includes(e.id)) : all;

    if (targets.length < 2) return;

    // Compute center of current positions for origin
    const allBounds = targets.map(getElementBounds);
    const cx = allBounds.reduce((s, b) => s + b.x + b.width / 2, 0) / allBounds.length;
    const cy = allBounds.reduce((s, b) => s + b.y + b.height / 2, 0) / allBounds.length;
    const opts = { origin: { x: cx, y: cy }, ...options };

    let result;
    switch (algorithm) {
      case 'grid': result = layoutGrid(targets, opts); break;
      case 'tree': result = layoutTree(targets, opts); break;
      case 'radial': result = layoutRadial(targets, opts); break;
      case 'force': result = layoutForce(targets, opts as ForceLayoutOptions); break;
    }

    this.history.push(all);
    for (const el of result.elements) {
      this.scene.updateElement(el.id, { x: el.x, y: el.y });
      // Also update arrow points if changed
      if ((el.type === 'arrow' || el.type === 'line') && (el as any).points) {
        this.scene.updateElement(el.id, { points: (el as any).points } as any);
      }
    }
    this.history.push(this.scene.getElements());
    this.render();
    setTimeout(() => this.zoomToFit(), 100);
  }

  // ─── Style Presets & Transfer ─────────────────────────────────

  /** Apply a named style preset to all or selected elements. */
  applyStylePreset(presetName: string, selectedOnly = false): boolean {
    const targets = selectedOnly
      ? this.scene.getSelectedElements()
      : this.scene.getElements();
    if (targets.length === 0) return false;

    const styled = applyPreset(targets, presetName);
    if (!styled) return false;

    this.history.push(this.scene.getElements());
    for (const el of styled) {
      this.scene.updateElement(el.id, el);
    }
    this.history.push(this.scene.getElements());
    this.render();
    return true;
  }

  /** Copy style from source element to target elements (or selected). */
  transferStyle(sourceId: string, targetIds?: string[]): void {
    const source = this.scene.getElementById(sourceId);
    if (!source) return;
    const style = extractStyle(source);
    const targets = targetIds
      ? targetIds.map(id => this.scene.getElementById(id)).filter(Boolean) as BoardierElement[]
      : this.scene.getSelectedElements().filter(e => e.id !== sourceId);
    if (targets.length === 0) return;

    const styled = applyStyle(targets, style);
    this.history.push(this.scene.getElements());
    for (const el of styled) {
      this.scene.updateElement(el.id, el);
    }
    this.history.push(this.scene.getElements());
    this.render();
  }
}
