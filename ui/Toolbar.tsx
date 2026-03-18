import React from 'react';
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

const TOOLS: { type: BoardierToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
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
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /></svg> },
  { type: 'eraser', label: 'Eraser', shortcut: 'X',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 8 8-4 4" /><path d="M6 20l5-5" /></svg> },
  { type: 'pan', label: 'Pan', shortcut: 'H',
    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-4 0v5" /><path d="M14 10V4a2 2 0 00-4 0v6" /><path d="M10 10.5V5a2 2 0 00-4 0v9" /><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.8-.6-5.5-2.3L3 15.5a2 2 0 013-2.7l2 2" /></svg> },
];

export const Toolbar: React.FC<ToolbarProps> = React.memo(({ activeTool, onToolChange, theme }) => {
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
          onMouseEnter={e => { if (activeTool !== t.type) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
          onMouseLeave={e => { if (activeTool !== t.type) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
});

Toolbar.displayName = 'Toolbar';
