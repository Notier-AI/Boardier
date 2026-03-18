import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { BoardierToolType } from '../core/types';
import type { BoardierTheme } from '../themes/types';

interface ToolbarProps {
  activeTool: BoardierToolType;
  onToolChange: (tool: BoardierToolType) => void;
  theme: BoardierTheme;
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
  { type: 'text', label: 'Text', shortcut: 'T',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12" /><path d="M12 4v16" /></svg> },
  { type: 'icon', label: 'Icon', shortcut: 'I',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg> },
  { type: 'eraser', label: 'Eraser', shortcut: 'X',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 8 8-4 4" /><path d="M6 20l5-5" /></svg> },
  { type: 'pan', label: 'Pan', shortcut: 'H',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-4 0v5" /><path d="M14 10V4a2 2 0 00-4 0v6" /><path d="M10 10.5V5a2 2 0 00-4 0v9" /><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.8-.6-5.5-2.3L3 15.5a2 2 0 013-2.7l2 2" /></svg> },
];

const STORAGE_KEY = 'boardier-toolbar-order';

function loadOrder(): BoardierToolType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const order: BoardierToolType[] = JSON.parse(stored);
      // Validate: all default tool types must be present
      const defaultTypes = DEFAULT_TOOLS.map(t => t.type);
      if (defaultTypes.every(t => order.includes(t)) && order.length === defaultTypes.length) {
        return order;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_TOOLS.map(t => t.type);
}

function saveOrder(order: BoardierToolType[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

const TOOL_MAP = new Map(DEFAULT_TOOLS.map(t => [t.type, t]));
const ITEM_SIZE = 34;
const GAP = 2;

export const Toolbar: React.FC<ToolbarProps> = React.memo(({ activeTool, onToolChange, theme }) => {
  const [order, setOrder] = useState<BoardierToolType[]>(loadOrder);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragOriginIdx = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute reordered tools
  const tools = order.map(type => TOOL_MAP.get(type)!).filter(Boolean);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    // Long-press or middle button or right-click doesn't start drag
    // We use a brief hold to differentiate click from drag
    dragStartY.current = e.clientY;
    dragOriginIdx.current = idx;

    const pointerId = e.pointerId;
    const target = e.currentTarget as HTMLElement;
    let moved = false;

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
        const hoverIdx = Math.max(0, Math.min(order.length - 1, Math.floor(relY / (ITEM_SIZE + GAP))));
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
            setOrder(old => {
              const newOrder = [...old];
              const [removed] = newOrder.splice(dragOriginIdx.current, 1);
              newOrder.splice(prev, 0, removed);
              saveOrder(newOrder);
              return newOrder;
            });
          }
          return null;
        });
      } else {
        // Was a click, not a drag
        onToolChange(order[idx]);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [order, onToolChange]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        padding: 6,
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadow,
        zIndex: 10,
        fontFamily: theme.uiFontFamily,
        touchAction: 'none',
      }}
    >
      {tools.map((t, i) => {
        const isDragging = dragIdx === i;
        const isDropTarget = dragIdx !== null && overIdx === i && dragIdx !== i;
        return (
          <button
            key={t.type}
            title={`${t.label} (${t.shortcut})`}
            onPointerDown={e => handlePointerDown(e, i)}
            style={{
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
                : activeTool === t.type
                  ? theme.panelActive
                  : 'transparent',
              color: activeTool === t.type ? theme.selectionColor : theme.panelText,
              transition: isDragging ? 'none' : 'background 0.1s, color 0.1s',
              opacity: isDragging ? 0.5 : 1,
              borderTop: isDropTarget ? `2px solid ${theme.selectionColor}` : '2px solid transparent',
              touchAction: 'none',
              userSelect: 'none',
            }}
            onMouseEnter={e => { if (activeTool !== t.type && dragIdx === null) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
            onMouseLeave={e => { if (activeTool !== t.type && dragIdx === null) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {t.icon}
          </button>
        );
      })}
    </div>
  );
});

Toolbar.displayName = 'Toolbar';
