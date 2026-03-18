import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { BoardierToolType } from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { Tooltip } from './Tooltip';

interface ToolbarProps {
  activeTool: BoardierToolType;
  onToolChange: (tool: BoardierToolType) => void;
  theme: BoardierTheme;
  onMermaidConvert?: () => void;
}

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const DEFAULT_TOOLS: { type: BoardierToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
  { type: 'select', label: 'Select', shortcut: 'V',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-7 2-3 7z" /><path d="M12 14l5 5" /></svg> },
  { type: 'rectangle', label: 'Rectangle', shortcut: 'R',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /></svg> },
  { type: 'ellipse', label: 'Ellipse', shortcut: 'E',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="9" ry="7" /></svg> },
  { type: 'diamond', label: 'Diamond', shortcut: 'D',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 9-9 9-9-9z" /></svg> },
  { type: 'line', label: 'Line', shortcut: 'L',
    icon: <Icon d="M5 19L19 5" /> },
  { type: 'arrow', label: 'Arrow', shortcut: 'A',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19L19 5" /><path d="M19 5h-6" /><path d="M19 5v6" /></svg> },
  { type: 'freehand', label: 'Pencil', shortcut: 'P',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4L7 21H3v-4z" /></svg> },
  { type: 'marker', label: 'Marker', shortcut: 'M',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3l5.5 5.5-11 11H4.5v-5.5z" /><path d="M14 6l4 4" /><path d="M4 20h5" /></svg> },
  { type: 'text', label: 'Text', shortcut: 'T',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12" /><path d="M12 4v16" /></svg> },
  { type: 'icon', label: 'Icon', shortcut: 'I',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg> },
  { type: 'checkbox', label: 'Checkbox', shortcut: '',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></svg> },
  { type: 'radiogroup', label: 'Radio Group', shortcut: '',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="6" r="4" /><circle cx="12" cy="6" r="1.5" fill="currentColor" /><circle cx="12" cy="18" r="4" /></svg> },
  { type: 'frame', label: 'Frame', shortcut: 'F',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M2 8h20" /></svg> },
  { type: 'connector', label: 'Connector', shortcut: 'C',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 12h10" /><path d="M15 8l4 4-4 4" /></svg> },
  { type: 'stickynote', label: 'Sticky Note', shortcut: 'N',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 3z" /><path d="M14 3v6h6" /></svg> },
  { type: 'image', label: 'Image', shortcut: '',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg> },
  { type: 'embed', label: 'Embed', shortcut: '',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg> },
  { type: 'table', label: 'Table', shortcut: '',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></svg> },
  { type: 'comment', label: 'Comment', shortcut: '',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> },
  { type: 'eraser', label: 'Eraser', shortcut: 'X',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 8 8-4 4" /><path d="M6 20l5-5" /></svg> },
  { type: 'pan', label: 'Pan', shortcut: 'H',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-4 0v5" /><path d="M14 10V4a2 2 0 00-4 0v6" /><path d="M10 10.5V5a2 2 0 00-4 0v9" /><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.8-.6-5.5-2.3L3 15.5a2 2 0 013-2.7l2 2" /></svg> },
];

const STORAGE_KEY = 'boardier-toolbar-order';
const OVERFLOW_KEY = 'boardier-toolbar-overflow';

function loadOrder(): BoardierToolType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const order: BoardierToolType[] = JSON.parse(stored);
      // Validate: all default tool types must be present across main+overflow
      const defaultTypes = DEFAULT_TOOLS.map(t => t.type);
      const overflow = loadOverflow();
      const allPresent = [...order, ...overflow];
      if (defaultTypes.every(t => allPresent.includes(t))) {
        return order;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_TOOLS.map(t => t.type);
}

function loadOverflow(): BoardierToolType[] {
  try {
    const stored = localStorage.getItem(OVERFLOW_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveOrder(order: BoardierToolType[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

function saveOverflow(overflow: BoardierToolType[]): void {
  try { localStorage.setItem(OVERFLOW_KEY, JSON.stringify(overflow)); } catch { /* ignore */ }
}

const TOOL_MAP = new Map(DEFAULT_TOOLS.map(t => [t.type, t]));
const ITEM_SIZE = 34;
const GAP = 2;

export const Toolbar: React.FC<ToolbarProps> = React.memo(({ activeTool, onToolChange, theme, onMermaidConvert }) => {
  const [order, setOrder] = useState<BoardierToolType[]>(loadOrder);
  const [overflow, setOverflow] = useState<BoardierToolType[]>(loadOverflow);
  const [showMore, setShowMore] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragOriginIdx = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close overflow panel on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node) &&
          containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [showMore]);

  // Compute reordered tools (only those NOT in overflow)
  const tools = order.filter(t => !overflow.includes(t)).map(type => TOOL_MAP.get(type)!).filter(Boolean);
  const overflowTools = overflow.map(type => TOOL_MAP.get(type)!).filter(Boolean);

  const moveToOverflow = useCallback((toolType: BoardierToolType) => {
    setOverflow(prev => {
      const next = [...prev, toolType];
      saveOverflow(next);
      return next;
    });
  }, []);

  const moveToMain = useCallback((toolType: BoardierToolType) => {
    setOverflow(prev => {
      const next = prev.filter(t => t !== toolType);
      saveOverflow(next);
      return next;
    });
    setOrder(prev => {
      if (!prev.includes(toolType)) {
        const next = [...prev, toolType];
        saveOrder(next);
        return next;
      }
      return prev;
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    dragStartY.current = e.clientY;
    dragOriginIdx.current = idx;

    const pointerId = e.pointerId;
    const target = e.currentTarget as HTMLElement;
    let moved = false;
    // Get the currently visible tool types for correct index mapping
    const visibleTypes = order.filter(t => !overflow.includes(t));

    const onMove = (ev: PointerEvent) => {
      const dy = Math.abs(ev.clientY - dragStartY.current);
      if (!moved && dy > 4) {
        moved = true;
        setDragIdx(idx);
        target.setPointerCapture(pointerId);
      }
      if (moved && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relY = ev.clientY - rect.top - 6; // 6 = padding
        const hoverIdx = Math.max(0, Math.min(visibleTypes.length - 1, Math.floor(relY / (ITEM_SIZE + GAP))));
        setOverIdx(hoverIdx);
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        setDragIdx(null);
        setOverIdx(prev => {
          if (prev !== null && prev !== dragOriginIdx.current) {
            // Reorder within the full order array using visible indices
            const fromType = visibleTypes[dragOriginIdx.current];
            const toType = visibleTypes[prev];
            setOrder(old => {
              const newOrder = [...old];
              const fromIdx = newOrder.indexOf(fromType);
              const toIdx = newOrder.indexOf(toType);
              if (fromIdx >= 0 && toIdx >= 0) {
                newOrder.splice(fromIdx, 1);
                newOrder.splice(toIdx, 0, fromType);
              }
              saveOrder(newOrder);
              return newOrder;
            });
          }
          return null;
        });
      } else {
        // Was a click, not a drag
        onToolChange(visibleTypes[idx]);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [order, overflow, onToolChange]);

  const btnStyle = useCallback((active: boolean, isDragging: boolean, isDropTarget: boolean): React.CSSProperties => ({
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: theme.borderRadius - 2,
    cursor: isDragging ? 'grabbing' : 'pointer',
    fontSize: 16,
    fontFamily: 'inherit',
    background: isDropTarget
      ? theme.selectionFill
      : active
        ? theme.panelActive
        : 'transparent',
    color: active ? theme.selectionColor : theme.panelText,
    transition: isDragging ? 'none' : 'background 0.1s, color 0.1s',
    opacity: isDragging ? 0.5 : 1,
    borderTop: isDropTarget ? `2px solid ${theme.selectionColor}` : '2px solid transparent',
    touchAction: 'none',
    userSelect: 'none',
  }), [theme]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        padding: 6,
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadow,
        fontFamily: theme.uiFontFamily,
        touchAction: 'none',
      }}
    >
      {tools.map((t, i) => {
        const isDragging = dragIdx === i;
        const isDropTarget = dragIdx !== null && overIdx === i && dragIdx !== i;
        return (
          <Tooltip key={t.type} text={t.label} shortcut={t.shortcut || undefined} theme={theme} placement="right">
            <button
              onPointerDown={e => handlePointerDown(e, i)}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); moveToOverflow(t.type); }}
              style={btnStyle(activeTool === t.type, isDragging, isDropTarget)}
              onMouseEnter={e => { if (activeTool !== t.type && dragIdx === null) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
              onMouseLeave={e => { if (activeTool !== t.type && dragIdx === null) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {t.icon}
            </button>
          </Tooltip>
        );
      })}

      {/* Separator + More button */}
      <div style={{ width: ITEM_SIZE, height: 1, background: theme.panelBorder, margin: '2px 0' }} />
      <button
        title="More tools..."
        onClick={() => setShowMore(v => !v)}
        style={{
          ...btnStyle(showMore, false, false),
          background: showMore ? theme.panelActive : 'transparent',
          color: showMore ? theme.selectionColor : theme.panelText,
        }}
        onMouseEnter={e => { if (!showMore) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
        onMouseLeave={e => { if (!showMore) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Overflow panel */}
      {showMore && (
        <div
          ref={moreRef}
          style={{
            position: 'absolute',
            left: '100%',
            bottom: 0,
            marginLeft: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 8,
            background: theme.panelBackground,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: theme.borderRadius,
            boxShadow: theme.shadow,
            minWidth: 160,
            zIndex: 11,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.panelText, opacity: 0.6, marginBottom: 2, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            More Tools
          </div>

          {/* Mermaid converter */}
          <button
            onClick={() => { onMermaidConvert?.(); setShowMore(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              border: 'none',
              borderRadius: theme.borderRadius - 2,
              background: 'transparent',
              color: theme.panelText,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
              textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h4l3 10h6l3-10h4" /><circle cx="8" cy="19" r="2" /><circle cx="16" cy="19" r="2" />
            </svg>
            Mermaid Converter
          </button>

          {/* Overflow tools (hidden from main toolbar) */}
          {overflowTools.length > 0 && (
            <>
              <div style={{ width: '100%', height: 1, background: theme.panelBorder, margin: '4px 0' }} />
              <div style={{ fontSize: 11, color: theme.panelText, opacity: 0.5, marginBottom: 2 }}>Hidden Tools</div>
              {overflowTools.map(t => (
                <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => { onToolChange(t.type); setShowMore(false); }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      border: 'none',
                      borderRadius: theme.borderRadius - 2,
                      background: activeTool === t.type ? theme.panelActive : 'transparent',
                      color: activeTool === t.type ? theme.selectionColor : theme.panelText,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (activeTool !== t.type) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
                    onMouseLeave={e => { if (activeTool !== t.type) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                  <button
                    title="Move back to toolbar"
                    onClick={() => moveToMain(t.type)}
                    style={{
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: 4,
                      background: 'transparent',
                      color: theme.panelText,
                      cursor: 'pointer',
                      opacity: 0.5,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l-6-6 6-6" /><path d="M3 12h18" /></svg>
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Drag tools here hint */}
          {overflowTools.length === 0 && (
            <div style={{ fontSize: 11, color: theme.panelText, opacity: 0.4, padding: '4px 8px', fontStyle: 'italic' }}>
              Right-click a tool to hide it here
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Toolbar.displayName = 'Toolbar';
