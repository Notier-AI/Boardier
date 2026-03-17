import React from 'react';
import type { BoardierToolType } from '../core/types';
import type { BoardierTheme } from '../themes/types';

interface ToolbarProps {
  activeTool: BoardierToolType;
  onToolChange: (tool: BoardierToolType) => void;
  theme: BoardierTheme;
}

const TOOLS: { type: BoardierToolType; label: string; shortcut: string; icon: string }[] = [
  { type: 'select',    label: 'Select',    shortcut: 'V', icon: '⇲' },
  { type: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: '▭' },
  { type: 'ellipse',   label: 'Ellipse',   shortcut: 'E', icon: '◯' },
  { type: 'diamond',   label: 'Diamond',   shortcut: 'D', icon: '◇' },
  { type: 'line',      label: 'Line',      shortcut: 'L', icon: '╱' },
  { type: 'arrow',     label: 'Arrow',     shortcut: 'A', icon: '→' },
  { type: 'freehand',  label: 'Pencil',    shortcut: 'P', icon: '✎' },
  { type: 'text',      label: 'Text',      shortcut: 'T', icon: 'T' },
  { type: 'eraser',    label: 'Eraser',    shortcut: 'X', icon: '⌫' },
  { type: 'pan',       label: 'Pan',       shortcut: 'H', icon: '✋' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, theme }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 6,
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadow,
        zIndex: 10,
        fontFamily: theme.uiFontFamily,
      }}
    >
      {TOOLS.map(t => (
        <button
          key={t.type}
          title={`${t.label} (${t.shortcut})`}
          onClick={() => onToolChange(t.type)}
          style={{
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: theme.borderRadius - 2,
            cursor: 'pointer',
            fontSize: 16,
            fontFamily: 'inherit',
            background: activeTool === t.type ? theme.panelActive : 'transparent',
            color: activeTool === t.type ? theme.selectionColor : theme.panelText,
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { if (activeTool !== t.type) (e.target as HTMLElement).style.background = theme.panelHover; }}
          onMouseLeave={e => { if (activeTool !== t.type) (e.target as HTMLElement).style.background = 'transparent'; }}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};
