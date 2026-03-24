/**
 * @boardier-module ui/ContextMenu
 * @boardier-category UI
 * @boardier-description Right-click context menu for the canvas. Shows element operations (copy, paste, delete, duplicate, z-order, arrange submenu, send to AI, select all) positioned at the cursor.
 * @boardier-since 0.1.0
 * @boardier-changed 0.4.2 Increased touch target sizes for context menu items
 * @boardier-changed 0.4.0 Added Export submenu with per-format download and clipboard copy for selected elements
 * @boardier-changed 0.4.1 Fixed Export submenu not appearing in context menu
 */
import React, { useState } from 'react';
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
  selectionCount?: number;
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
  alignLeft: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="2" x2="3" y2="22"/><rect x="7" y="4" width="14" height="6" rx="1"/><rect x="7" y="14" width="8" height="6" rx="1"/></svg>,
  alignCenterH: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><rect x="5" y="4" width="14" height="6" rx="1"/><rect x="7" y="14" width="10" height="6" rx="1"/></svg>,
  alignRight: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="2" x2="21" y2="22"/><rect x="3" y="4" width="14" height="6" rx="1"/><rect x="9" y="14" width="8" height="6" rx="1"/></svg>,
  alignTop: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="3" x2="22" y2="3"/><rect x="4" y="7" width="6" height="14" rx="1"/><rect x="14" y="7" width="6" height="8" rx="1"/></svg>,
  alignCenterV: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12"/><rect x="4" y="5" width="6" height="14" rx="1"/><rect x="14" y="7" width="6" height="10" rx="1"/></svg>,
  alignBottom: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="21" x2="22" y2="21"/><rect x="4" y="3" width="6" height="14" rx="1"/><rect x="14" y="9" width="6" height="8" rx="1"/></svg>,
  distributeH: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="2" x2="3" y2="22"/><line x1="21" y1="2" x2="21" y2="22"/><rect x="8" y="6" width="8" height="12" rx="1"/></svg>,
  distributeV: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="3" x2="22" y2="3"/><line x1="2" y1="21" x2="22" y2="21"/><rect x="6" y="8" width="12" height="8" rx="1"/></svg>,
  autoArrange: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  sendToAI: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg>,
  exportItem: <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>,
};

interface MenuItem {
  action: string;
  label: string;
  shortcut: string;
  needsSelection: boolean;
  icon?: React.ReactNode;
  needsMultiple?: boolean;
  needsTriple?: boolean;
  children?: MenuItem[];
}

const ARRANGE_ITEMS: MenuItem[] = [
  { action: 'alignLeft', label: 'Align left', shortcut: '', needsSelection: true, icon: Icons.alignLeft, needsMultiple: true },
  { action: 'alignCenterH', label: 'Align center', shortcut: '', needsSelection: true, icon: Icons.alignCenterH, needsMultiple: true },
  { action: 'alignRight', label: 'Align right', shortcut: '', needsSelection: true, icon: Icons.alignRight, needsMultiple: true },
  { action: 'alignTop', label: 'Align top', shortcut: '', needsSelection: true, icon: Icons.alignTop, needsMultiple: true },
  { action: 'alignCenterV', label: 'Align middle', shortcut: '', needsSelection: true, icon: Icons.alignCenterV, needsMultiple: true },
  { action: 'alignBottom', label: 'Align bottom', shortcut: '', needsSelection: true, icon: Icons.alignBottom, needsMultiple: true },
  { action: 'separator-ar1', label: '', shortcut: '', needsSelection: false },
  { action: 'distributeH', label: 'Distribute horizontal', shortcut: '', needsSelection: true, icon: Icons.distributeH, needsTriple: true },
  { action: 'distributeV', label: 'Distribute vertical', shortcut: '', needsSelection: true, icon: Icons.distributeV, needsTriple: true },
  { action: 'separator-ar2', label: '', shortcut: '', needsSelection: false },
  { action: 'autoArrange', label: 'Auto-arrange', shortcut: '', needsSelection: false, icon: Icons.autoArrange },
];

const EXPORT_ITEMS: MenuItem[] = [
  { action: 'exportPNG', label: 'PNG image', shortcut: '', needsSelection: true },
  { action: 'exportSVG', label: 'SVG vector', shortcut: '', needsSelection: true },
  { action: 'exportHTML', label: 'HTML page', shortcut: '', needsSelection: true },
  { action: 'exportBoardier', label: 'Boardier (.boardier)', shortcut: '', needsSelection: true },
  { action: 'exportJSON', label: 'JSON data', shortcut: '', needsSelection: true },
  { action: 'separator-exp1', label: '', shortcut: '', needsSelection: false },
  { action: 'copyPNG', label: 'Copy as PNG', shortcut: '', needsSelection: true },
  { action: 'copySVG', label: 'Copy as SVG', shortcut: '', needsSelection: true },
  { action: 'copyJSON', label: 'Copy as JSON', shortcut: '', needsSelection: true },
];

const ITEMS: MenuItem[] = [
  { action: 'copy', label: 'Copy', shortcut: 'Ctrl+C', needsSelection: true, icon: Icons.copy },
  { action: 'paste', label: 'Paste', shortcut: 'Ctrl+V', needsSelection: false, icon: Icons.paste },
  { action: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', needsSelection: true, icon: Icons.duplicate },
  { action: 'separator', label: '', shortcut: '', needsSelection: false },
  { action: 'bringToFront', label: 'Bring to front', shortcut: ']', needsSelection: true, icon: Icons.bringToFront },
  { action: 'sendToBack', label: 'Send to back', shortcut: '[', needsSelection: true, icon: Icons.sendToBack },
  { action: 'separator2', label: '', shortcut: '', needsSelection: false },
  { action: 'arrange', label: 'Arrange', shortcut: '', needsSelection: false, icon: Icons.autoArrange, children: ARRANGE_ITEMS },
  { action: 'separator2b', label: '', shortcut: '', needsSelection: false },
  { action: 'sendToAI', label: 'Send to AI', shortcut: '', needsSelection: true, icon: Icons.sendToAI },
  { action: 'separator2c', label: '', shortcut: '', needsSelection: false },
  { action: 'addComment', label: 'Add comment', shortcut: '', needsSelection: true, icon: Icons.comment },
  { action: 'exportMenu', label: 'Export', shortcut: '', needsSelection: true, icon: Icons.exportItem, children: EXPORT_ITEMS },
  { action: 'separator2d', label: '', shortcut: '', needsSelection: false },
  { action: 'group', label: 'Group', shortcut: 'Ctrl+G', needsSelection: true, icon: Icons.group },
  { action: 'ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', needsSelection: true, icon: Icons.ungroup },
  { action: 'separator3', label: '', shortcut: '', needsSelection: false },
  { action: 'delete', label: 'Delete', shortcut: 'Del', needsSelection: true, icon: Icons.delete },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({ position, onAction, onClose, theme, hasSelection, canPaste, hasMultipleSelection, isGrouped, selectionCount = 0 }) => {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const renderItem = (item: MenuItem, parentAction?: string) => {
    if (item.action.startsWith('separator')) {
      return <div key={(parentAction || '') + item.action} style={{ height: 1, background: theme.panelBorder, margin: '4px 0' }} />;
    }
    if (item.action === 'group' && !hasMultipleSelection) return null;
    if (item.action === 'ungroup' && !isGrouped) return null;
    if (item.needsMultiple && selectionCount < 2) return null;
    if (item.needsTriple && selectionCount < 3) return null;

    const disabled = (item.needsSelection && !hasSelection) || (item.action === 'paste' && !canPaste);
    const hasChildren = item.children && item.children.length > 0;
    const submenuOpen = openSubmenu === item.action;

    return (
      <div key={item.action} style={{ position: 'relative' }}
        onMouseEnter={() => { if (hasChildren && !disabled) setOpenSubmenu(item.action); }}
        onMouseLeave={() => { if (hasChildren) setOpenSubmenu(null); }}>
        <button
          onClick={() => { if (!disabled && !hasChildren) onAction(item.action); }}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 14px',
            border: 'none',
            background: submenuOpen ? theme.panelHover : 'transparent',
            cursor: disabled ? 'default' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
            minHeight: 36,
            color: disabled ? theme.panelTextSecondary : (item.action === 'delete' ? '#e03131' : theme.panelText),
            opacity: disabled ? 0.5 : 1,
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
          onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = theme.panelHover; }}
          onMouseLeave={e => { if (!submenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {item.icon && <span style={{ display: 'flex', flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>}
          <span style={{ flex: 1 }}>{item.label}</span>
          {hasChildren && <span style={{ fontSize: 10, color: theme.panelTextSecondary, marginLeft: 8 }}>▶</span>}
          {!hasChildren && item.shortcut && <span style={{ fontSize: 10, color: theme.panelTextSecondary, marginLeft: 12 }}>{item.shortcut}</span>}
        </button>
        {hasChildren && submenuOpen && (
          <div style={{
            position: 'absolute',
            left: '100%',
            top: -4,
            minWidth: 200,
            padding: '4px 0',
            background: theme.panelBackground,
            border: `${theme.uiStyle.panelBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
            borderRadius: theme.uiStyle.menuBorderRadius,
            boxShadow: theme.uiStyle.panelShadow,
            zIndex: 52,
            fontFamily: theme.uiFontFamily,
          }}>
            {item.children!.map(child => renderItem(child, item.action))}
          </div>
        )}
      </div>
    );
  };

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
        {ITEMS.map(item => renderItem(item))}
      </div>
    </>
  );
};
