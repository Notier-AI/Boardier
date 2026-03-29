/**
 * @boardier-module ui/RemoteCursors
 * @boardier-category UI
 * @boardier-description Canvas overlay that renders colored cursors and name badges for remote users in a collaborative session. Each cursor is positioned in world coordinates and transformed to screen space.
 * @boardier-since 0.5.0
 */
import React from 'react';
import type { CollaborationUser, ViewState } from '../core/types';

interface RemoteCursorsProps {
  users: CollaborationUser[];
  viewState: ViewState;
}

/** Small arrow SVG rotated slightly for a natural cursor look. */
const CursorSVG: React.FC<{ color: string }> = ({ color }) => (
  <svg width={16} height={20} viewBox="0 0 16 20" fill="none" style={{ display: 'block' }}>
    <path d="M1 1L1 15L5.5 11L10 19L13 17.5L8.5 9.5L14 8.5L1 1Z" fill={color} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({ users, viewState }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 8 }}>
      {users.map(user => {
        if (!user.cursor) return null;
        const screenX = user.cursor.x * viewState.zoom + viewState.scrollX;
        const screenY = user.cursor.y * viewState.zoom + viewState.scrollY;
        return (
          <div
            key={user.clientId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transition: 'left 80ms linear, top 80ms linear',
            }}
          >
            <CursorSVG color={user.color} />
            <span style={{
              display: 'inline-block',
              marginTop: -2,
              marginLeft: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: user.color,
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
              fontFamily: 'system-ui, sans-serif',
            }}>
              {user.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
