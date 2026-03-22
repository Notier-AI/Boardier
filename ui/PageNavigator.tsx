/**
 * @boardier-module ui/PageNavigator
 * @boardier-category UI
 * @boardier-description Multi-page navigation panel. Lists all pages/slides, allows adding, deleting, renaming, and switching between pages.
 * @boardier-since 0.1.0
 */
import React, { useState } from 'react';
import type { BoardierTheme } from '../themes/types';
import type { BoardierPage } from '../core/types';

interface PageNavigatorProps {
  pages: BoardierPage[];
  activePageId: string;
  onSwitchPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  theme: BoardierTheme;
}

export const PageNavigator: React.FC<PageNavigatorProps> = React.memo(({
  pages, activePageId, onSwitchPage, onAddPage, onDeletePage, onRenamePage, theme,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (page: BoardierPage) => {
    setEditingId(page.id);
    setEditName(page.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRenamePage(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: '4px 8px',
        background: theme.panelBackground,
        border: `${theme.uiStyle.panelBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
        borderRadius: theme.uiStyle.panelBorderRadius,
        boxShadow: theme.uiStyle.panelShadow,
        zIndex: 10,
        alignItems: 'center',
        fontFamily: theme.uiFontFamily,
        fontSize: 12,
      }}
    >
      {pages.map(page => (
        <div
          key={page.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
          }}
        >
          {editingId === page.id ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
              style={{
                width: 60, height: 24, fontSize: 11, fontWeight: 600,
                border: `${theme.uiStyle.inputBorderWidth}px solid ${theme.selectionColor}`, borderRadius: theme.uiStyle.inputBorderRadius,
                background: 'transparent', color: theme.panelText,
                outline: 'none', textAlign: 'center', fontFamily: 'inherit',
                padding: '0 4px',
              }}
            />
          ) : (
            <button
              onClick={() => onSwitchPage(page.id)}
              onDoubleClick={() => startRename(page)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: page.id === activePageId ? 700 : 500,
                border: `${theme.uiStyle.buttonBorderWidth}px solid ${page.id === activePageId ? theme.selectionColor : theme.panelBorder}`,
                borderRadius: theme.uiStyle.buttonBorderRadius,
                background: page.id === activePageId ? theme.panelActive : 'transparent',
                cursor: 'pointer',
                color: theme.panelText,
                fontFamily: 'inherit',
              }}
            >
              {page.name}
            </button>
          )}
          {pages.length > 1 && (
            <button
              onClick={() => onDeletePage(page.id)}
              title={`Delete ${page.name}`}
              style={{
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: theme.panelTextSecondary, fontSize: 10, padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAddPage}
        title="Add page"
        style={{
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `${theme.uiStyle.buttonBorderWidth}px dashed ${theme.panelBorder}`, borderRadius: theme.uiStyle.buttonBorderRadius,
          background: 'transparent', cursor: 'pointer', color: theme.panelTextSecondary,
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        }}
      >
        +
      </button>
    </div>
  );
});

PageNavigator.displayName = 'PageNavigator';
