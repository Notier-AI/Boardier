import React from 'react';
import type { BoardierTheme } from '../themes/types';
import type { Vec2 } from '../core/types';

interface ContextMenuProps {
  position: Vec2;
  onAction: (action: string) => void;
  onClose: () => void;
  theme: BoardierTheme;
  hasSelection: boolean;
  canPaste: boolean;
}

const ITEMS = [
  { action: 'copy', label: 'Copy', shortcut: 'Ctrl+C', needsSelection: true },
  { action: 'paste', label: 'Paste', shortcut: 'Ctrl+V', needsSelection: false },
  { action: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', needsSelection: true },
  { action: 'separator', label: '', shortcut: '', needsSelection: false },
  { action: 'bringToFront', label: 'Bring to front', shortcut: ']', needsSelection: true },
  { action: 'sendToBack', label: 'Send to back', shortcut: '[', needsSelection: true },
  { action: 'separator2', label: '', shortcut: '', needsSelection: false },
  { action: 'delete', label: 'Delete', shortcut: 'Del', needsSelection: true },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({ position, onAction, onClose, theme, hasSelection, canPaste }) => {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          minWidth: 180,
          padding: '4px 0',
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: theme.borderRadius,
          boxShadow: theme.shadow,
          zIndex: 51,
          fontFamily: theme.uiFontFamily,
        }}
      >
        {ITEMS.map(item => {
          if (item.action.startsWith('separator')) {
            return <div key={item.action} style={{ height: 1, background: theme.panelBorder, margin: '4px 0' }} />;
          }
          const disabled = (item.needsSelection && !hasSelection) || (item.action === 'paste' && !canPaste);
          return (
            <button
              key={item.action}
              onClick={() => { if (!disabled) onAction(item.action); }}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                cursor: disabled ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 500,
                color: disabled ? theme.panelTextSecondary : theme.panelText,
                opacity: disabled ? 0.5 : 1,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!disabled) (e.target as HTMLElement).style.background = theme.panelHover; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <span>{item.label}</span>
              <span style={{ fontSize: 10, color: theme.panelTextSecondary }}>{item.shortcut}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
