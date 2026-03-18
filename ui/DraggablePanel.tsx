import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { BoardierTheme } from '../themes/types';
import type { BoardierPanelId, BoardierLayoutConfig } from '../core/types';

const STORAGE_KEY = 'boardier-panel-positions';

interface StoredPositions {
  [id: string]: { dx: number; dy: number };
}

function loadPositions(): StoredPositions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

function savePositions(positions: StoredPositions): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch { /* ignore */ }
}

interface DraggablePanelProps {
  id: BoardierPanelId;
  layout?: BoardierLayoutConfig;
  theme: BoardierTheme;
  children: React.ReactNode;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id,
  layout,
  theme,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<{ dx: number; dy: number }>(() => {
    // Priority: layout config override > localStorage > default (0,0)
    const configPos = layout?.positions?.[id];
    if (configPos) {
      return { dx: configPos.left ?? configPos.right ?? 0, dy: configPos.top ?? configPos.bottom ?? 0 };
    }
    const stored = loadPositions()[id];
    if (stored) return stored;
    return { dx: 0, dy: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);

  const isLocked = layout?.locked ?? false;
  const isHidden = layout?.hidden?.includes(id) ?? false;

  // Reset offset when layout positions change from config
  useEffect(() => {
    const configPos = layout?.positions?.[id];
    if (configPos) {
      setOffset({ dx: configPos.left ?? configPos.right ?? 0, dy: configPos.top ?? configPos.bottom ?? 0 });
    }
  }, [layout?.positions, id]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startDx = offset.dx;
    const startDy = offset.dy;

    const pointerId = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(pointerId);
    setIsDragging(true);

    const container = panelRef.current?.closest('[data-boardier-container]') as HTMLElement | null;
    const containerRect = container?.getBoundingClientRect();
    const noZones = layout?.noDropZones || [];

    const onMove = (ev: PointerEvent) => {
      const newDx = startDx + (ev.clientX - startX);
      const newDy = startDy + (ev.clientY - startY);

      // Check no-drop zones if container exists
      if (containerRect && noZones.length > 0) {
        const panel = panelRef.current;
        if (panel) {
          const panelRect = panel.getBoundingClientRect();
          const pctX = ((panelRect.left - containerRect.left + panelRect.width / 2) / containerRect.width) * 100;
          const pctY = ((panelRect.top - containerRect.top + panelRect.height / 2) / containerRect.height) * 100;
          const inNoZone = noZones.some(z =>
            pctX >= z.x && pctX <= z.x + z.width && pctY >= z.y && pctY <= z.y + z.height
          );
          if (inNoZone) return;
        }
      }

      setOffset({ dx: newDx, dy: newDy });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setIsDragging(false);
      // Save
      setOffset(cur => {
        const stored = loadPositions();
        stored[id] = cur;
        savePositions(stored);
        return cur;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [id, isLocked, offset, layout?.noDropZones]);

  if (isHidden) return null;

  const hasOffset = offset.dx !== 0 || offset.dy !== 0;

  return (
    <div
      ref={panelRef}
      style={{
        // display: 'contents' doesn't work well with transforms, so use inline-block wrapper
        position: 'relative',
        display: 'inline-block',
        transform: hasOffset ? `translate(${offset.dx}px, ${offset.dy}px)` : undefined,
        // Keep existing positioning from children
        pointerEvents: 'auto',
      }}
    >
      {!isLocked && (
        <div
          onPointerDown={handlePointerDown}
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 6,
            borderRadius: 3,
            background: isDragging ? theme.selectionColor : theme.panelBorder,
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 1 : 0,
            transition: 'opacity 0.15s',
            zIndex: 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
          onMouseLeave={e => { if (!isDragging) (e.currentTarget as HTMLElement).style.opacity = '0'; }}
        />
      )}
      {children}
    </div>
  );
};

DraggablePanel.displayName = 'DraggablePanel';
