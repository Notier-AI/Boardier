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
import { createIcon } from '../elements/base';
import { getElementBounds } from '../elements/base';
import { mermaidToBoardier } from '../utils/mermaidParser';
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
    const insertIconTargetRef = useRef<string | null>(null);
    const [showMermaidDialog, setShowMermaidDialog] = useState(false);

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
      // If inserting an icon, just save text but keep editor open conceptually
      if (insertIconTargetRef.current) return;
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

    // ── Selected elements for property panel ─────────

    const selectedElements = selectedIds
      .map(id => engineRef.current?.scene.getElementById(id))
      .filter((e): e is BoardierElement => !!e);

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
          <DraggablePanel id="toolbar" layout={fullConfig.layout} theme={resolvedTheme}>
            <Toolbar activeTool={activeTool} onToolChange={handleToolChange} theme={resolvedTheme} onMermaidConvert={() => setShowMermaidDialog(true)} />
          </DraggablePanel>
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
        <DraggablePanel id="zoom" layout={fullConfig.layout} theme={resolvedTheme}>
          <ZoomControls
            zoom={viewState.zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={() => engineRef.current?.zoomToFit()}
            onResetZoom={() => engineRef.current?.zoomTo(1)}
            theme={resolvedTheme}
          />
        </DraggablePanel>

        {/* Back to content button */}
        {isViewportDrifted && (
          <DraggablePanel id="backToContent" layout={fullConfig.layout} theme={resolvedTheme}>
            <button
              onClick={() => engineRef.current?.zoomToFit()}
              style={{
              position: 'absolute',
              bottom: 52,
              right: 12,
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
              zIndex: 10,
              whiteSpace: 'nowrap',
              animation: 'boardier-fadein 0.2s ease',
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
          <DraggablePanel id="export" layout={fullConfig.layout} theme={resolvedTheme}>
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
          </DraggablePanel>
        )}

        {/* Mermaid Converter Dialog */}
        {showMermaidDialog && (
          <MermaidDialog
            theme={resolvedTheme}
            onConvert={handleMermaidConvert}
            onClose={() => setShowMermaidDialog(false)}
          />
        )}
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

BoardierCanvas.displayName = 'BoardierCanvas';
