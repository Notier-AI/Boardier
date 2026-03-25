/**
 * @boardier-module ui/BoardierCanvas
 * @boardier-category UI
 * @boardier-description The top-level React component for embedding the Boardier whiteboard. Wraps the BoardierEngine with a canvas element and provides a complete UI including toolbar, property panel, zoom controls, export dialog, text editor overlays, context menu, minimap, page navigator, and presentation mode. All UI panels are draggable via the DraggablePanel system.
 * @boardier-since 0.1.0
 * @boardier-changed 0.3.1 Moved zoom controls into Minimap footer, removed standalone ZoomControls panel
 * @boardier-changed 0.3.2 Added built-in light/dark mode toggle button with showDarkModeToggle config option
 * @boardier-changed 0.4.0 Added context menu export actions with group-aware selection, wired import handler to ExportDialog
 * @boardier-changed 0.4.1 Wired export dropdown in PropertyPanel for per-element export
 * @boardier-changed 0.4.2 Mobile-responsive — larger touch targets for buttons, minimap hidden on mobile, viewport-aware sizing
 * @boardier-changed 0.4.4 Text commit now word-wraps within element width instead of expanding unboundedly
 * @boardier-usage `<BoardierCanvas config={{ showGrid: true }} theme={defaultTheme} onChange={handleChange} />`
 * @boardier-props BoardierCanvasProps
 * @boardier-ref BoardierCanvasRef (via React.forwardRef) — exposes getEngine(), getSceneData(), loadScene(), exportToPNG(), exportToSVG(), exportToJSON()
 */
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type {
  BoardierElement,
  BoardierToolType,
  BoardierConfig,
  BoardierSceneData,
  ViewState,
  Vec2,
  TextElement,
} from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { BoardierEngine } from '../core/Engine';
import { defaultTheme, defaultDarkTheme } from '../themes/defaultTheme';
import { Toolbar } from './Toolbar';
import { PropertyPanel } from './PropertyPanel';
import { ZoomControls } from './ZoomControls';
import { ContextMenu } from './ContextMenu';
import { TextEditor } from './TextEditor';
import { ExportDialog } from './ExportDialog';
import { ShapeLabelEditor } from './ShapeLabelEditor';
import { IconPicker } from './IconPicker';
import { DraggablePanel } from './DraggablePanel';
import { Minimap } from './Minimap';
import { PageNavigator } from './PageNavigator';
import { PresentationMode } from './PresentationMode';
import { createIcon, createComment } from '../elements/base';
import { getElementBounds } from '../elements/base';
import { mermaidToBoardier } from '../utils/mermaidParser';
import { measureText } from '../elements/text';
import { describeElements } from '../ai/htmlConverter';
import {
  exportToPNG as exportToPNGFn,
  exportToSVG,
  exportToHTML,
  exportToBoardier,
  exportToJSON,
  copyToClipboard,
  copyImageToClipboard,
  downloadString,
  downloadBlob,
} from '../utils/export';

/* ──────────────── public types ──────────────── */

export interface BoardierCanvasProps {
  initialData?: BoardierSceneData | null;
  onChange?: (data: BoardierSceneData) => void;
  /** Called when the user right-clicks selected elements and chooses "Send to AI". Receives a text description of the selected elements. */
  onSendToAI?: (description: string) => void;
  theme?: BoardierTheme;
  darkMode?: boolean;
  readOnly?: boolean;
  config?: Partial<BoardierConfig>;
  style?: React.CSSProperties;
  className?: string;
}

export interface BoardierCanvasRef {
  getSceneData(): BoardierSceneData;
  loadScene(data: BoardierSceneData | null): void;
  addElements(elements: BoardierElement[]): void;
  undo(): void;
  redo(): void;
  zoomToFit(): void;
  zoomTo(level: number): void;
  exportToPNG(): Promise<Blob>;
  getEngine(): BoardierEngine;
}

/* ──────────────── component ──────────────── */

export const BoardierCanvas = forwardRef<BoardierCanvasRef, BoardierCanvasProps>(
  ({ initialData, onChange, onSendToAI, theme: themeProp, darkMode = false, readOnly = false, config = {}, style, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BoardierEngine | null>(null);

    // UI state
    const [activeTool, setActiveTool] = useState<BoardierToolType>('select');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewState, setViewState] = useState<ViewState>({ scrollX: 0, scrollY: 0, zoom: 1 });
    const [elementVersion, setElementVersion] = useState(0);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ position: Vec2 } | null>(null);
    const [showExport, setShowExport] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [editingIconId, setEditingIconId] = useState<string | null>(null);
    const [insertingIconForText, setInsertingIconForText] = useState(false);
    const insertIconTargetRef = useRef<string | null>(null);
    const [showMermaidDialog, setShowMermaidDialog] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [showPresentation, setShowPresentation] = useState(false);
    const [pages, setPages] = useState<{ id: string; name: string; elements: BoardierElement[] }[]>([]);
    const [activePageId, setActivePageId] = useState('');
    const [editingEmbedId, setEditingEmbedId] = useState<string | null>(null);
    const [editingTableCellId, setEditingTableCellId] = useState<string | null>(null);
    const [editingTableCell, setEditingTableCell] = useState<{ row: number; col: number } | null>(null);
    const [isDark, setIsDark] = useState(darkMode);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

    // Detect mobile viewport
    useEffect(() => {
      const mq = window.matchMedia('(max-width: 767px)');
      const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
      setIsMobile(mq.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);

    // Track whether viewport has drifted from content
    const isViewportDrifted = React.useMemo(() => {
      const engine = engineRef.current;
      if (!engine) return false;
      const elements = engine.scene.getElements();
      if (elements.length === 0) return false;
      const allBounds = elements.map(getElementBounds);
      const minX = Math.min(...allBounds.map(b => b.x));
      const minY = Math.min(...allBounds.map(b => b.y));
      const maxX = Math.max(...allBounds.map(b => b.x + b.width));
      const maxY = Math.max(...allBounds.map(b => b.y + b.height));
      const { scrollX, scrollY, zoom } = viewState;
      const canvas = engine.getCanvas();
      const vpW = canvas.clientWidth / zoom;
      const vpH = canvas.clientHeight / zoom;
      const vpLeft = -scrollX / zoom;
      const vpTop = -scrollY / zoom;
      const vpRight = vpLeft + vpW;
      const vpBottom = vpTop + vpH;
      // Content is visible if bounding boxes overlap
      const overlaps = maxX > vpLeft && minX < vpRight && maxY > vpTop && minY < vpBottom;
      return !overlaps;
    }, [viewState]);

    const fullConfig: BoardierConfig = {
      readOnly,
      showGrid: true,
      gridSize: 20,
      snapToGrid: false,
      minZoom: 0.1,
      maxZoom: 5,
      showDarkModeToggle: true,
      ...config,
    };
    const resolvedTheme = themeProp ?? (isDark ? defaultDarkTheme : defaultTheme);
    const showDarkToggle = fullConfig.showDarkModeToggle !== false;

    // ── Engine lifecycle ──────────────────────────────

    useEffect(() => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;

      const engine = new BoardierEngine(canvas, fullConfig, resolvedTheme);
      engineRef.current = engine;

      // Wire callbacks — debounce onChange to avoid expensive structuredClone on every mutation
      const changeTimer = { id: 0 as any };
      engine.onChange(() => {
        clearTimeout(changeTimer.id);
        changeTimer.id = setTimeout(() => { onChange?.(engine.getSceneData()); }, 120);
        setElementVersion(v => v + 1);
      });
      engine.onSelectionChange(ids => setSelectedIds(ids));
      engine.onViewChange(vs => setViewState({ ...vs }));
      engine.onToolChange(t => setActiveTool(t));
      engine.onTextEditRequest(id => setEditingTextId(id));
      engine.onShapeLabelEditRequest(id => setEditingLabelId(id));
      engine.onIconEditRequest(id => {
        setEditingIconId(id);
        setShowIconPicker(true);
      });
      engine.onPageChange((p, a) => { setPages([...p]); setActivePageId(a); });
      engine.onEmbedUrlRequest(id => setEditingEmbedId(id));
      engine.onTableCellEditRequest((id, row, col) => {
        setEditingTableCellId(id);
        setEditingTableCell({ row, col });
      });

      // Initial data
      if (initialData) {
        engine.loadScene(initialData);
        engine.initPages(initialData.pages, initialData.activePageId);
      } else {
        engine.loadScene(null);
        engine.initPages();
      }

      // Set initial size
      const { width, height } = container.getBoundingClientRect();
      engine.resize(width, height);

      // Resize observer
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          if (w > 0 && h > 0) engine.resize(w, h);
        }
      });
      ro.observe(container);

      // Pointer events
      const onPointerDown = (e: PointerEvent) => engine.handlePointerDown(e);
      const onPointerMove = (e: PointerEvent) => engine.handlePointerMove(e);
      const onPointerUp = (e: PointerEvent) => engine.handlePointerUp(e);
      const onWheel = (e: WheelEvent) => engine.handleWheel(e);
      const onDblClick = (e: MouseEvent) => engine.handleDoubleClick(e);
      const onContextMenuEvt = (e: MouseEvent) => {
        e.preventDefault();
        setContextMenu({ position: { x: e.clientX, y: e.clientY } });
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('dblclick', onDblClick);
      canvas.addEventListener('contextmenu', onContextMenuEvt);

      // Keyboard events on window so they fire even when canvas isn't focused
      const onKeyDown = (e: KeyboardEvent) => {
        // Skip if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        engine.handleKeyDown(e);
      };
      const onKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e);

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      return () => {
        clearTimeout(changeTimer.id);
        ro.disconnect();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('dblclick', onDblClick);
        canvas.removeEventListener('contextmenu', onContextMenuEvt);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        engine.dispose();
        engineRef.current = null;
      };
    }, []); // mount/unmount only

    // ── Sync theme changes ───────────────────────────

    useEffect(() => {
      setIsDark(darkMode);
    }, [darkMode]);

    useEffect(() => {
      engineRef.current?.setTheme(resolvedTheme);
    }, [resolvedTheme]);

    // ── Ref API ──────────────────────────────────────

    useImperativeHandle(ref, () => ({
      getSceneData: () => engineRef.current!.getSceneData(),
      loadScene: (data) => engineRef.current!.loadScene(data),
      addElements: (els) => engineRef.current!.addElements(els),
      undo: () => engineRef.current!.undo(),
      redo: () => engineRef.current!.redo(),
      zoomToFit: () => engineRef.current!.zoomToFit(),
      zoomTo: (l) => engineRef.current!.zoomTo(l),
      exportToPNG: async () => {
        const engine = engineRef.current!;
        const { exportToPNG } = await import('../utils/export');
        return exportToPNG(engine.scene.getElements(), engine.getTheme().canvasBackground);
      },
      getEngine: () => engineRef.current!,
    }));

    // ── Tool change ──────────────────────────────────

    const handleToolChange = useCallback((t: BoardierToolType) => {
      if (t === 'icon') {
        setShowIconPicker(true);
        return;
      }
      engineRef.current?.setTool(t);
    }, []);

    // ── Property update ──────────────────────────────

    const handlePropertyUpdate = useCallback((updates: Partial<BoardierElement>) => {
      engineRef.current?.updateSelectedElements(updates);
    }, []);

    const handleDelete = useCallback(() => {
      engineRef.current?.deleteSelected();
    }, []);

    // ── Zoom controls ────────────────────────────────

    const handleZoomIn = useCallback(() => {
      const e = engineRef.current;
      if (e) e.zoomTo(e.getViewState().zoom * 1.2);
    }, []);

    const handleZoomOut = useCallback(() => {
      const e = engineRef.current;
      if (e) e.zoomTo(e.getViewState().zoom / 1.2);
    }, []);

    // ── Text editing ─────────────────────────────────

    const editingTextElement = editingTextId
      ? engineRef.current?.scene.getElementById(editingTextId) as TextElement | undefined
      : undefined;

    const handleTextCommit = useCallback((id: string, text: string) => {
      // If inserting an icon, just save text but keep editor open conceptually
      if (insertIconTargetRef.current) return;
      const engine = engineRef.current;
      if (!engine) return;
      const el = engine.scene.getElementById(id) as TextElement | undefined;
      if (el) {
        // First measure without constraint to see natural width
        const natural = measureText(text, el.fontSize, el.fontFamily, el.lineHeight);
        // If text fits in current width, use natural size; otherwise word-wrap within current width
        const fitsWidth = natural.width <= Math.max(el.width, 10);
        const maxW = fitsWidth ? undefined : Math.max(el.width, 60);
        const size = fitsWidth ? natural : measureText(text, el.fontSize, el.fontFamily, el.lineHeight, maxW);
        engine.scene.updateElement(id, {
          text,
          width: fitsWidth ? size.width : Math.max(el.width, size.width),
          height: size.height,
        });
      }
      setEditingTextId(null);
      engine.render();
    }, []);

    const handleTextCancel = useCallback((id: string) => {
      if (insertIconTargetRef.current) return;
      const engine = engineRef.current;
      if (!engine) return;
      // Remove element if it has no text (was just created)
      const el = engine.scene.getElementById(id);
      if (el && (el as TextElement).text === '') {
        engine.scene.removeElements([id]);
        engine.render();
      }
      setEditingTextId(null);
    }, []);

    // ── Shape label editing ──────────────────────────

    const editingLabelElement = editingLabelId
      ? engineRef.current?.scene.getElementById(editingLabelId)
      : undefined;

    const handleLabelCommit = useCallback((text: string) => {
      const engine = engineRef.current;
      if (!engine || !editingLabelId) return;
      engine.history.push(engine.scene.getElements());
      engine.scene.updateElement(editingLabelId, { label: text } as any);
      engine.history.push(engine.scene.getElements());
      setEditingLabelId(null);
      engine.render();
    }, [editingLabelId]);

    const handleLabelCancel = useCallback(() => {
      setEditingLabelId(null);
    }, []);

    // ── Icon picker ──────────────────────────────────

    const handleIconPick = useCallback((iconName: string, iconSet: string, svgMarkup: string) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (insertingIconForText && insertIconTargetRef.current) {
        // Insert inline icon marker into the text element
        const targetId = insertIconTargetRef.current;
        const el = engine.scene.getElementById(targetId) as TextElement | undefined;
        if (el) {
          const marker = `{{${iconName}}}`;
          const newText = el.text + marker;
          const inlineIcons = { ...(el.inlineIcons || {}), [iconName]: svgMarkup };
          const size = measureText(newText, el.fontSize, el.fontFamily, el.lineHeight);
          engine.history.push(engine.scene.getElements());
          engine.scene.updateElement(targetId, { text: newText, inlineIcons, width: size.width, height: size.height } as any);
          engine.history.push(engine.scene.getElements());
          engine.render();
        }
        insertIconTargetRef.current = null;
        setInsertingIconForText(false);
        setShowIconPicker(false);
        return;
      }

      if (editingIconId) {
        // Replace existing icon
        engine.history.push(engine.scene.getElements());
        engine.scene.updateElement(editingIconId, { iconName, iconSet, svgMarkup } as any);
        engine.history.push(engine.scene.getElements());
        engine.render();
        setEditingIconId(null);
      } else {
        // Create new icon at viewport center
        const vs = engine.getViewState();
        const canvas = engine.getCanvas();
        const cx = (-vs.scrollX + canvas.width / 2 / (window.devicePixelRatio || 1)) / vs.zoom;
        const cy = (-vs.scrollY + canvas.height / 2 / (window.devicePixelRatio || 1)) / vs.zoom;
        const el = createIcon({
          x: cx - 24, y: cy - 24, width: 48, height: 48,
          iconName, iconSet, svgMarkup,
          strokeColor: engine.getTheme().elementDefaults.strokeColor,
        });
        engine.history.push(engine.scene.getElements());
        engine.scene.addElement(el);
        engine.scene.setSelection([el.id]);
        engine.history.push(engine.scene.getElements());
        engine.render();
      }
      setShowIconPicker(false);
    }, [editingIconId, insertingIconForText]);

    // ── Icon picker close ──────────────────────────

    const handleIconPickerClose = useCallback(() => {
      setShowIconPicker(false);
      setEditingIconId(null);
      setInsertingIconForText(false);
      insertIconTargetRef.current = null;
    }, []);

    // ── Insert icon into text ────────────────────────

    const handleTextInsertIcon = useCallback(() => {
      insertIconTargetRef.current = editingTextId;
      setInsertingIconForText(true);
      setShowIconPicker(true);
    }, [editingTextId]);

    // ── Context menu ─────────────────────────────────

    /** Get selected elements including all group members for export. */
    const getSelectionWithGroups = (engine: BoardierEngine): BoardierElement[] => {
      const selected = engine.scene.getSelectedElements();
      if (selected.length === 0) return [];
      const groupIds = new Set<string>();
      for (const el of selected) {
        for (const gid of el.groupIds) groupIds.add(gid);
      }
      if (groupIds.size === 0) return selected;
      const all = engine.scene.getElements();
      const ids = new Set(selected.map(e => e.id));
      for (const el of all) {
        if (!ids.has(el.id) && el.groupIds.some(g => groupIds.has(g))) {
          ids.add(el.id);
        }
      }
      return all.filter(e => ids.has(e.id));
    };

    const handleContextAction = useCallback((action: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      switch (action) {
        case 'copy':
          engine.clipboard.copy(engine.scene.getSelectedElements());
          break;
        case 'paste':
          if (engine.clipboard.hasContent) {
            engine.history.push(engine.scene.getElements());
            const pasted = engine.clipboard.paste();
            engine.scene.addElements(pasted);
            engine.scene.setSelection(pasted.map(e => e.id));
            engine.history.push(engine.scene.getElements());
            engine.render();
          }
          break;
        case 'duplicate':
          if (engine.scene.getSelectedIds().length) {
            engine.clipboard.copy(engine.scene.getSelectedElements());
            engine.history.push(engine.scene.getElements());
            const duped = engine.clipboard.paste();
            engine.scene.addElements(duped);
            engine.scene.setSelection(duped.map(e => e.id));
            engine.history.push(engine.scene.getElements());
            engine.render();
          }
          break;
        case 'delete': engine.deleteSelected(); break;
        case 'bringToFront': engine.bringToFront(); break;
        case 'sendToBack': engine.sendToBack(); break;
        case 'addComment': {
          // Add a comment near the selected element
          const selected = engine.scene.getSelectedElements();
          if (selected.length > 0) {
            const first = selected[0];
            const b = getElementBounds(first);
            const comment = createComment({
              x: b.x + b.width + 10, y: b.y,
              text: '', author: '', markerColor: '#f59e0b',
            });
            engine.history.push(engine.scene.getElements());
            engine.scene.addElement(comment);
            engine.scene.setSelection([comment.id]);
            engine.history.push(engine.scene.getElements());
            engine.render();
          }
          break;
        }
        case 'group': {
          const ids = engine.scene.getSelectedIds();
          if (ids.length > 1) {
            const groupId = Math.random().toString(36).substring(2, 10);
            engine.history.push(engine.scene.getElements());
            const updates = ids.map(id => ({
              id,
              changes: { groupIds: [...(engine.scene.getElementById(id)?.groupIds || []), groupId] } as Partial<BoardierElement>,
            }));
            engine.scene.updateElements(updates);
            engine.history.push(engine.scene.getElements());
            engine.render();
          }
          break;
        }
        case 'ungroup': {
          const selected = engine.scene.getSelectedElements();
          if (selected.length > 0) {
            engine.history.push(engine.scene.getElements());
            const updates = selected.map(el => ({
              id: el.id,
              changes: { groupIds: [] } as Partial<BoardierElement>,
            }));
            engine.scene.updateElements(updates);
            engine.history.push(engine.scene.getElements());
            engine.render();
          }
          break;
        }
        case 'alignLeft': engine.alignSelected('left'); break;
        case 'alignCenterH': engine.alignSelected('centerH'); break;
        case 'alignRight': engine.alignSelected('right'); break;
        case 'alignTop': engine.alignSelected('top'); break;
        case 'alignCenterV': engine.alignSelected('centerV'); break;
        case 'alignBottom': engine.alignSelected('bottom'); break;
        case 'distributeH': engine.distributeSelected('horizontal'); break;
        case 'distributeV': engine.distributeSelected('vertical'); break;
        case 'autoArrange': engine.autoArrange('grid'); break;
        case 'sendToAI': {
          const selected = engine.scene.getSelectedElements();
          if (selected.length > 0 && onSendToAI) {
            onSendToAI(describeElements(selected));
          }
          break;
        }
        // ── Export selected items ──
        case 'exportPNG': case 'exportSVG': case 'exportHTML':
        case 'exportBoardier': case 'exportJSON':
        case 'copyPNG': case 'copySVG': case 'copyJSON': {
          const sel = getSelectionWithGroups(engine);
          if (sel.length === 0) break;
          const bg = engine.getTheme().canvasBackground;
          const vs = engine.getViewState();
          (async () => {
            switch (action) {
              case 'exportPNG': {
                const blob = await exportToPNGFn(sel, bg, 40, 2);
                downloadBlob(blob, 'boardier-selection.png');
                break;
              }
              case 'exportSVG': downloadString(exportToSVG(sel, bg, 40), 'boardier-selection.svg', 'image/svg+xml'); break;
              case 'exportHTML': downloadString(exportToHTML(sel, bg, 40), 'boardier-selection.html', 'text/html'); break;
              case 'exportBoardier': downloadString(exportToBoardier(sel, vs), 'boardier-selection.boardier', 'application/json'); break;
              case 'exportJSON': downloadString(exportToJSON(sel, vs), 'boardier-selection.json', 'application/json'); break;
              case 'copyPNG': { const b = await exportToPNGFn(sel, bg, 40, 2); await copyImageToClipboard(b); break; }
              case 'copySVG': await copyToClipboard(exportToSVG(sel, bg, 40)); break;
              case 'copyJSON': await copyToClipboard(exportToJSON(sel, vs)); break;
            }
          })();
          break;
        }
      }
      setContextMenu(null);
    }, [onSendToAI]);

    // ── Mermaid converter ────────────────────────────

    const handleMermaidConvert = useCallback((syntax: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const elements = mermaidToBoardier(syntax.trim());
        if (elements.length > 0) {
          engine.history.push(engine.scene.getElements());
          engine.addElements(elements);
          engine.history.push(engine.scene.getElements());
          setTimeout(() => engine.zoomToFit(), 100);
        }
      } catch (e) {
        console.warn('Mermaid conversion failed:', e);
      }
      setShowMermaidDialog(false);
    }, []);

    // ── Minimap navigation ───────────────────────────

    const handleMinimapNavigate = useCallback((scrollX: number, scrollY: number) => {
      engineRef.current?.setViewState({ scrollX, scrollY });
    }, []);

    // ── Page operations ──────────────────────────────

    const handleSwitchPage = useCallback((pageId: string) => {
      engineRef.current?.switchToPage(pageId);
    }, []);

    const handleAddPage = useCallback(() => {
      engineRef.current?.addPage();
    }, []);

    const handleDeletePage = useCallback((pageId: string) => {
      engineRef.current?.deletePage(pageId);
    }, []);

    const handleRenamePage = useCallback((pageId: string, name: string) => {
      engineRef.current?.renamePage(pageId, name);
    }, []);

    // ── Selected elements for property panel ─────────
    // elementVersion forces re-computation when element properties change
    const selectedElements = React.useMemo(() =>
      selectedIds
        .map(id => engineRef.current?.scene.getElementById(id))
        .filter((e): e is BoardierElement => !!e),
      [selectedIds, elementVersion],
    );

    // When PropertyPanel icon bar is visible on mobile, push bottom UI elements up
    const showPropBarMobile = isMobile && !readOnly && selectedElements.length > 0 && !editingTextId;
    const mobileBottomOffset = showPropBarMobile ? 52 : 0;

    // ── Render ───────────────────────────────────────

    return (
      <div
        ref={containerRef}
        className={className}
        data-boardier-container
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...style,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
          }}
        />

        {/* Toolbar */}
        {!readOnly && (
          <DraggablePanel id="toolbar" layout={fullConfig.layout} theme={resolvedTheme} defaultStyle={{ top: 12, left: '50%', transform: 'translateX(-50%)' }}>
            <Toolbar activeTool={activeTool} onToolChange={handleToolChange} theme={resolvedTheme} onMermaidConvert={() => setShowMermaidDialog(true)} />
          </DraggablePanel>
        )}

        {/* Property Panel */}
        {!readOnly && selectedElements.length > 0 && !editingTextId && (
          <PropertyPanel
            elements={selectedElements}
            onUpdate={handlePropertyUpdate}
            onDelete={handleDelete}
            onCopy={() => handleContextAction('copy')}
            onDuplicate={() => handleContextAction('duplicate')}
            onClose={() => engineRef.current?.scene.setSelection([])}
            onExport={(format) => {
              const actionMap: Record<string, string> = { png: 'exportPNG', svg: 'exportSVG', html: 'exportHTML', boardier: 'exportBoardier', json: 'exportJSON' };
              handleContextAction(actionMap[format] || `export${format.toUpperCase()}`);
            }}
            theme={resolvedTheme}
          />
        )}

        {/* Back to content button */}
        {isViewportDrifted && (
          <DraggablePanel id="backToContent" layout={fullConfig.layout} theme={resolvedTheme} defaultStyle={{ bottom: 52, right: 12 }}>
            <button
              onClick={() => engineRef.current?.zoomToFit()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: `1px solid ${resolvedTheme.panelBorder}`,
                borderRadius: resolvedTheme.borderRadius,
                background: resolvedTheme.panelBackground,
                boxShadow: resolvedTheme.shadow,
                cursor: 'pointer',
                color: resolvedTheme.selectionColor,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: resolvedTheme.uiFontFamily,
                whiteSpace: 'nowrap',
              }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = resolvedTheme.panelHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = resolvedTheme.panelBackground; }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
            </svg>
            Back to content
          </button>
          </DraggablePanel>
        )}

        {/* Inline Text Editor */}
        {editingTextElement && (
          <TextEditor
            element={editingTextElement}
            viewState={viewState}
            theme={resolvedTheme}
            onCommit={handleTextCommit}
            onCancel={handleTextCancel}
            onInsertIcon={handleTextInsertIcon}
          />
        )}

        {/* Shape Label Editor */}
        {editingLabelElement && (
          <ShapeLabelEditor
            element={editingLabelElement}
            viewState={viewState}
            theme={resolvedTheme}
            onCommit={handleLabelCommit}
            onCancel={handleLabelCancel}
          />
        )}

        {/* Table Cell Editor */}
        {editingTableCellId && editingTableCell && (() => {
          const engine = engineRef.current;
          const el = engine?.scene.getElementById(editingTableCellId) as any;
          if (!el || el.type !== 'table') return null;
          // Calculate cell position in screen coords
          let cellX = el.x;
          for (let c = 0; c < editingTableCell.col; c++) cellX += el.colWidths[c];
          let cellY = el.y;
          for (let r = 0; r < editingTableCell.row; r++) cellY += el.rowHeights[r];
          const cellW = el.colWidths[editingTableCell.col];
          const cellH = el.rowHeights[editingTableCell.row];
          const screenX = cellX * viewState.zoom + viewState.scrollX;
          const screenY = cellY * viewState.zoom + viewState.scrollY;
          const screenW = cellW * viewState.zoom;
          const screenH = cellH * viewState.zoom;
          const currentText = el.cells[editingTableCell.row]?.[editingTableCell.col] || '';
          return (
            <input
              key={`table-cell-${editingTableCellId}-${editingTableCell.row}-${editingTableCell.col}`}
              autoFocus
              defaultValue={currentText}
              style={{
                position: 'absolute',
                left: screenX, top: screenY,
                width: screenW, height: screenH,
                padding: '2px 6px',
                border: `2px solid ${resolvedTheme.selectionColor}`,
                borderRadius: 0,
                background: resolvedTheme.panelBackground,
                color: resolvedTheme.panelText,
                fontSize: 13 * viewState.zoom,
                fontFamily: 'system-ui, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
                zIndex: 20,
              }}
              onBlur={(e) => {
                if (engine && editingTableCellId && editingTableCell) {
                  const newCells = el.cells.map((row: string[]) => [...row]);
                  newCells[editingTableCell.row][editingTableCell.col] = e.target.value;
                  engine.history.push(engine.scene.getElements());
                  engine.scene.updateElement(editingTableCellId, { cells: newCells } as any);
                  engine.history.push(engine.scene.getElements());
                  engine.render();
                }
                setEditingTableCellId(null);
                setEditingTableCell(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                  // Move to next cell
                  const nextCol = editingTableCell.col + 1;
                  if (nextCol < el.cols) {
                    setEditingTableCellId(editingTableCellId);
                    setEditingTableCell({ row: editingTableCell.row, col: nextCol });
                  } else if (editingTableCell.row + 1 < el.rows) {
                    setEditingTableCellId(editingTableCellId);
                    setEditingTableCell({ row: editingTableCell.row + 1, col: 0 });
                  }
                }
              }}
            />
          );
        })()}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            position={contextMenu.position}
            onAction={handleContextAction}
            onClose={() => setContextMenu(null)}
            theme={resolvedTheme}
            hasSelection={selectedIds.length > 0}
            canPaste={engineRef.current?.clipboard.hasContent ?? false}
            hasMultipleSelection={selectedIds.length > 1}
            isGrouped={selectedElements.some(e => e.groupIds.length > 0)}
            selectionCount={selectedIds.length}
          />
        )}

        {/* Export Dialog */}
        {showExport && (
          <ExportDialog
            elements={engineRef.current?.scene.getElements() ?? []}
            viewState={viewState}
            backgroundColor={resolvedTheme.canvasBackground}
            altBackgroundColor={isDark ? defaultTheme.canvasBackground : defaultDarkTheme.canvasBackground}
            isDark={isDark}
            theme={resolvedTheme}
            onClose={() => setShowExport(false)}
            onImport={(els, vs) => {
              const engine = engineRef.current;
              if (!engine) return;
              engine.history.push(engine.scene.getElements());
              engine.scene.addElements(els);
              engine.history.push(engine.scene.getElements());
              engine.render();
              setTimeout(() => engine.zoomToFit(), 100);
            }}
          />
        )}

        {/* Icon Picker */}
        {showIconPicker && (
          <IconPicker
            theme={resolvedTheme}
            onPick={handleIconPick}
            onClose={handleIconPickerClose}
          />
        )}

        {/* Export button (bottom-left) */}
        {!readOnly && (
          <DraggablePanel id="export" layout={fullConfig.layout} theme={resolvedTheme} defaultStyle={{ bottom: 12 + mobileBottomOffset, left: 12 }}>
            <button
              onClick={() => setShowExport(true)}
              title="Export"
              style={{
                width: isMobile ? 44 : 34,
                height: isMobile ? 44 : 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${resolvedTheme.panelBorder}`,
                borderRadius: resolvedTheme.borderRadius,
                background: resolvedTheme.panelBackground,
                boxShadow: resolvedTheme.shadow,
                cursor: 'pointer',
                color: resolvedTheme.panelText,
              }}
            >
              <svg width={isMobile ? 20 : 16} height={isMobile ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            </button>
          </DraggablePanel>
        )}

        {/* Dark mode toggle (bottom-left, next to export) */}
        {showDarkToggle && !themeProp && (
          <div
            style={{
              position: 'absolute',
              bottom: 12 + mobileBottomOffset,
              left: readOnly ? 12 : (isMobile ? 64 : 54),
              zIndex: 10,
            }}
          >
            <button
              onClick={() => setIsDark(d => !d)}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: isMobile ? 44 : 34,
                height: isMobile ? 44 : 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${resolvedTheme.panelBorder}`,
                borderRadius: resolvedTheme.borderRadius,
                background: resolvedTheme.panelBackground,
                boxShadow: resolvedTheme.shadow,
                cursor: 'pointer',
                color: resolvedTheme.panelText,
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {isDark ? (
                <svg width={isMobile ? 20 : 16} height={isMobile ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
              ) : (
                <svg width={isMobile ? 20 : 16} height={isMobile ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </button>
          </div>
        )}

        {/* Mermaid Converter Dialog */}
        {showMermaidDialog && (
          <MermaidDialog
            theme={resolvedTheme}
            onConvert={handleMermaidConvert}
            onClose={() => setShowMermaidDialog(false)}
          />
        )}

        {/* Minimap — hidden on mobile to save space */}
        {showMinimap && !showPresentation && !isMobile && (
          <Minimap
            elements={engineRef.current?.scene.getElements() ?? []}
            viewState={viewState}
            canvasWidth={containerRef.current?.clientWidth ?? 800}
            canvasHeight={containerRef.current?.clientHeight ?? 600}
            theme={resolvedTheme}
            onNavigate={handleMinimapNavigate}
            zoom={viewState.zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={() => engineRef.current?.zoomToFit()}
            onResetZoom={() => engineRef.current?.zoomTo(1)}
          />
        )}

        {/* Page Navigator */}
        {!readOnly && pages.length > 0 && !showPresentation && (
          <PageNavigator
            pages={pages}
            activePageId={activePageId}
            onSwitchPage={handleSwitchPage}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            theme={resolvedTheme}
            bottomOffset={mobileBottomOffset}
          />
        )}

        {/* Presentation Mode */}
        {showPresentation && (
          <PresentationMode
            elements={engineRef.current?.scene.getElements() ?? []}
            theme={resolvedTheme}
            onExit={() => setShowPresentation(false)}
          />
        )}

        {/* Embed URL Dialog */}
        {editingEmbedId && (
          <EmbedUrlDialog
            theme={resolvedTheme}
            onSubmit={(url) => {
              const engine = engineRef.current;
              if (engine && editingEmbedId) {
                engine.history.push(engine.scene.getElements());
                engine.scene.updateElement(editingEmbedId, { url, title: url } as any);
                engine.history.push(engine.scene.getElements());
                engine.render();
              }
              setEditingEmbedId(null);
            }}
            onClose={() => {
              // Remove embed if no URL was set
              const engine = engineRef.current;
              if (engine && editingEmbedId) {
                const el = engine.scene.getElementById(editingEmbedId);
                if (el && !(el as any).url) {
                  engine.scene.removeElement(editingEmbedId);
                  engine.render();
                }
              }
              setEditingEmbedId(null);
            }}
          />
        )}

        {/* Embed iframes — render over embed elements that have URLs */}
        {(() => {
          const engine = engineRef.current;
          if (!engine) return null;
          const elements = engine.scene.getElements();
          const embeds = elements.filter(e => e.type === 'embed' && (e as any).url);
          if (embeds.length === 0) return null;
          return embeds.map(el => {
            const embed = el as any;
            const b = getElementBounds(el);
            const left = b.x * viewState.zoom + viewState.scrollX;
            const top = (b.y * viewState.zoom + viewState.scrollY) + 28 * viewState.zoom;
            const width = b.width * viewState.zoom;
            const height = (b.height - 28) * viewState.zoom;
            if (width < 20 || height < 20) return null;
            return (
              <iframe
                key={el.id}
                src={embed.url}
                title={embed.title || 'Embed'}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{
                  position: 'absolute',
                  left, top, width, height,
                  border: 'none',
                  borderRadius: '0 0 6px 6px',
                  pointerEvents: selectedIds.includes(el.id) ? 'none' : 'auto',
                  opacity: el.opacity,
                }}
              />
            );
          });
        })()}
      </div>
    );
  },
);

/* ──────────────── Mermaid Dialog ──────────────── */

const MermaidDialog: React.FC<{
  theme: BoardierTheme;
  onConvert: (syntax: string) => void;
  onClose: () => void;
}> = ({ theme, onConvert, onClose }) => {
  const [value, setValue] = useState('graph TB\n    A[Start] --> B[Process]\n    B --> C{Decision}\n    C -->|Yes| D[End]\n    C -->|No| B');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        zIndex: 50,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: theme.borderRadius + 4,
          boxShadow: theme.shadow,
          padding: 20,
          width: 440,
          maxWidth: '90%',
          fontFamily: theme.uiFontFamily,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: theme.panelText }}>Mermaid Converter</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: theme.panelText, cursor: 'pointer', opacity: 0.6, fontSize: 18, lineHeight: 1 }}
          >&times;</button>
        </div>
        <div style={{ fontSize: 12, color: theme.panelText, opacity: 0.6, marginBottom: 8 }}>
          Paste Mermaid flowchart syntax below. Supports graph/flowchart with TB, BT, LR, RL directions.
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onConvert(value); } }}
          spellCheck={false}
          style={{
            width: '100%',
            height: 180,
            padding: 10,
            fontFamily: 'monospace',
            fontSize: 13,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: theme.borderRadius,
            background: theme.canvasBackground,
            color: theme.panelText,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px', border: `1px solid ${theme.panelBorder}`, borderRadius: theme.borderRadius,
              background: 'transparent', color: theme.panelText, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            onClick={() => onConvert(value)}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: theme.borderRadius,
              background: theme.selectionColor, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >Convert (Ctrl+Enter)</button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────── Embed URL Dialog ──────────────── */

const EmbedUrlDialog: React.FC<{
  theme: BoardierTheme;
  onSubmit: (url: string) => void;
  onClose: () => void;
}> = ({ theme, onSubmit, onClose }) => {
  const [url, setUrl] = useState('https://');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, []);

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (trimmed && trimmed !== 'https://' && trimmed.startsWith('https://')) {
      onSubmit(trimmed);
    }
  };

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)', zIndex: 50,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: theme.borderRadius + 4,
          boxShadow: theme.shadow,
          padding: 20, width: 400, maxWidth: '90%',
          fontFamily: theme.uiFontFamily,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15, color: theme.panelText, marginBottom: 12 }}>
          Embed Website
        </div>
        <div style={{ fontSize: 12, color: theme.panelTextSecondary, marginBottom: 8 }}>
          Enter the URL of the website to embed:
        </div>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
          placeholder="https://example.com"
          style={{
            width: '100%', padding: '8px 12px',
            border: `1px solid ${theme.panelBorder}`, borderRadius: theme.borderRadius,
            background: theme.canvasBackground, color: theme.panelText,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px', border: `1px solid ${theme.panelBorder}`, borderRadius: theme.borderRadius,
              background: 'transparent', color: theme.panelText, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: theme.borderRadius,
              background: theme.selectionColor, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >Embed</button>
        </div>
      </div>
    </div>
  );
};

BoardierCanvas.displayName = 'BoardierCanvas';
