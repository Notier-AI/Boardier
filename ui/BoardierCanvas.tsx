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
import { createIcon } from '../elements/base';
import { measureText } from '../elements/text';

/* ──────────────── public types ──────────────── */

export interface BoardierCanvasProps {
  initialData?: BoardierSceneData | null;
  onChange?: (data: BoardierSceneData) => void;
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
  ({ initialData, onChange, theme: themeProp, darkMode = false, readOnly = false, config = {}, style, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BoardierEngine | null>(null);

    // UI state
    const [activeTool, setActiveTool] = useState<BoardierToolType>('select');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewState, setViewState] = useState<ViewState>({ scrollX: 0, scrollY: 0, zoom: 1 });
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ position: Vec2 } | null>(null);
    const [showExport, setShowExport] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [editingIconId, setEditingIconId] = useState<string | null>(null);
    const [insertingIconForText, setInsertingIconForText] = useState(false);

    const resolvedTheme = themeProp ?? (darkMode ? defaultDarkTheme : defaultTheme);
    const fullConfig: BoardierConfig = {
      readOnly,
      showGrid: true,
      gridSize: 20,
      snapToGrid: false,
      minZoom: 0.1,
      maxZoom: 5,
      ...config,
    };

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

      // Initial data
      if (initialData) {
        engine.loadScene(initialData);
      } else {
        engine.loadScene(null);
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
      const engine = engineRef.current;
      if (!engine) return;
      const el = engine.scene.getElementById(id) as TextElement | undefined;
      if (el) {
        const size = measureText(text, el.fontSize, el.fontFamily, el.lineHeight);
        engine.scene.updateElement(id, { text, width: size.width, height: size.height });
      }
      setEditingTextId(null);
      engine.render();
    }, []);

    const handleTextCancel = useCallback((id: string) => {
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

      if (insertingIconForText && editingTextId) {
        // Insert inline icon marker into the text element
        const el = engine.scene.getElementById(editingTextId) as TextElement | undefined;
        if (el) {
          const marker = `{{${iconName}}}`;
          const newText = el.text + marker;
          const inlineIcons = { ...(el.inlineIcons || {}), [iconName]: svgMarkup };
          const size = measureText(newText, el.fontSize, el.fontFamily, el.lineHeight);
          engine.history.push(engine.scene.getElements());
          engine.scene.updateElement(editingTextId, { text: newText, inlineIcons, width: size.width, height: size.height } as any);
          engine.history.push(engine.scene.getElements());
          engine.render();
        }
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
    }, [editingIconId, insertingIconForText, editingTextId]);

    // ── Icon picker close ──────────────────────────

    const handleIconPickerClose = useCallback(() => {
      setShowIconPicker(false);
      setEditingIconId(null);
      setInsertingIconForText(false);
    }, []);

    // ── Insert icon into text ────────────────────────

    const handleTextInsertIcon = useCallback(() => {
      setInsertingIconForText(true);
      setShowIconPicker(true);
    }, []);

    // ── Context menu ─────────────────────────────────

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
      }
      setContextMenu(null);
    }, []);

    // ── Selected elements for property panel ─────────

    const selectedElements = selectedIds
      .map(id => engineRef.current?.scene.getElementById(id))
      .filter((e): e is BoardierElement => !!e);

    // ── Render ───────────────────────────────────────

    return (
      <div
        ref={containerRef}
        className={className}
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
          <Toolbar activeTool={activeTool} onToolChange={handleToolChange} theme={resolvedTheme} />
        )}

        {/* Property Panel */}
        {!readOnly && selectedElements.length > 0 && !editingTextId && (
          <PropertyPanel
            elements={selectedElements}
            onUpdate={handlePropertyUpdate}
            onDelete={handleDelete}
            theme={resolvedTheme}
          />
        )}

        {/* Zoom Controls */}
        <ZoomControls
          zoom={viewState.zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={() => engineRef.current?.zoomToFit()}
          onResetZoom={() => engineRef.current?.zoomTo(1)}
          theme={resolvedTheme}
        />

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

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            position={contextMenu.position}
            onAction={handleContextAction}
            onClose={() => setContextMenu(null)}
            theme={resolvedTheme}
            hasSelection={selectedIds.length > 0}
            canPaste={engineRef.current?.clipboard.hasContent ?? false}
          />
        )}

        {/* Export Dialog */}
        {showExport && (
          <ExportDialog
            elements={engineRef.current?.scene.getElements() ?? []}
            viewState={viewState}
            backgroundColor={resolvedTheme.canvasBackground}
            theme={resolvedTheme}
            onClose={() => setShowExport(false)}
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
          <button
            onClick={() => setShowExport(true)}
            title="Export"
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${resolvedTheme.panelBorder}`,
              borderRadius: resolvedTheme.borderRadius,
              background: resolvedTheme.panelBackground,
              boxShadow: resolvedTheme.shadow,
              cursor: 'pointer',
              color: resolvedTheme.panelText,
              zIndex: 10,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
          </button>
        )}
      </div>
    );
  },
);

BoardierCanvas.displayName = 'BoardierCanvas';
