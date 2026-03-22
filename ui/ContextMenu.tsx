/**
 * @boardier-module ui/ContextMenu
 * @boardier-category UI
 * @boardier-description Right-click context menu for the canvas. Shows element operations (copy, paste, delete, duplicate, z-order, select all) positioned at the cursor.
 * @boardier-since 0.1.0
 */
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
  hasMultipleSelection?: boolean;
  isGrouped?: boolean;
}

const ICON_SIZE = 14;

const Icons: Record<string, React.ReactNode> = {
  copy: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  paste: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
  duplicate: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16V4a2 2 0 012-2h12"/></svg>,
  bringToFront: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1"/><rect x="10" y="10" width="12" height="12" rx="1" fill="currentColor" opacity="0.15"/></svg>,
  sendToBack: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="10" y="10" width="12" height="12" rx="1"/><rect x="2" y="2" width="12" height="12" rx="1" fill="currentColor" opacity="0.15"/></svg>,
  comment: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  group: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="22" height="22" rx="2" strokeDasharray="4 2"/><rect x="5" y="5" width="6" height="6" rx="1"/><rect x="13" y="13" width="6" height="6" rx="1"/></svg>,
  ungroup: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M14 7h3m0 0V4m0 3l-3-3" /><path d="M10 17H7m0 0v3m0-3l3 3" /></svg>,
  delete: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
};

interface MenuItem {
  action: string;
  label: string;
  shortcut: string;
  needsSelection: boolean;
  icon?: React.ReactNode;
}

const ITEMS: MenuItem[] = [
  { action: 'copy', label: 'Copy', shortcut: 'Ctrl+C', needsSelection: true, icon: Icons.copy },
  { action: 'paste', label: 'Paste', shortcut: 'Ctrl+V', needsSelection: false, icon: Icons.paste },
  { action: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', needsSelection: true, icon: Icons.duplicate },
  { action: 'separator', label: '', shortcut: '', needsSelection: false },
  { action: 'bringToFront', label: 'Bring to front', shortcut: ']', needsSelection: true, icon: Icons.bringToFront },
  { action: 'sendToBack', label: 'Send to back', shortcut: '[', needsSelection: true, icon: Icons.sendToBack },
  { action: 'separator2', label: '', shortcut: '', needsSelection: false },
  { action: 'addComment', label: 'Add comment', shortcut: '', needsSelection: true, icon: Icons.comment },
  { action: 'group', label: 'Group', shortcut: 'Ctrl+G', needsSelection: true, icon: Icons.group },
  { action: 'ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', needsSelection: true, icon: Icons.ungroup },
  { action: 'separator3', label: '', shortcut: '', needsSelection: false },
  { action: 'delete', label: 'Delete', shortcut: 'Del', needsSelection: true, icon: Icons.delete },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({ position, onAction, onClose, theme, hasSelection, canPaste, hasMultipleSelection, isGrouped }) => {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          minWidth: 200,
          padding: '4px 0',
          background: theme.panelBackground,
          border: `${theme.uiStyle.panelBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
          borderRadius: theme.uiStyle.menuBorderRadius,
          boxShadow: theme.uiStyle.panelShadow,
          zIndex: 51,
          fontFamily: theme.uiFontFamily,
        }}
      >
        {ITEMS.map(item => {
          if (item.action.startsWith('separator')) {
            return <div key={item.action} style={{ height: 1, background: theme.panelBorder, margin: '4px 0' }} />;
          }
          // Hide group if only one selected, hide ungroup if not grouped
          if (item.action === 'group' && !hasMultipleSelection) return null;
          if (item.action === 'ungroup' && !isGrouped) return null;

          const disabled = (item.needsSelection && !hasSelection) || (item.action === 'paste' && !canPaste);
          return (
            <button
              key={item.action}
              onClick={() => { if (!disabled) onAction(item.action); }}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                cursor: disabled ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 500,
                color: disabled ? theme.panelTextSecondary : (item.action === 'delete' ? '#e03131' : theme.panelText),
                opacity: disabled ? 0.5 : 1,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {item.icon && <span style={{ display: 'flex', flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && <span style={{ fontSize: 10, color: theme.panelTextSecondary, marginLeft: 12 }}>{item.shortcut}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
};
