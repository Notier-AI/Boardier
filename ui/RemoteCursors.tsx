/**
 * @boardier-module ui/RemoteCursors
 * @boardier-category UI
 * @boardier-description Canvas overlay that renders soft, modern cursors and name badges for remote users in a collaborative session, plus colored selection outlines around elements they have selected. Each cursor is positioned in world coordinates and transformed to screen space.
 * @boardier-since 0.5.0
 * @boardier-changed 0.5.0 Redesigned cursors to modern soft rounded style without arrow tail; added remote selection outlines
 */
import React from 'react';
import type { CollaborationUser, ViewState, Bounds } from '../core/types';

interface RemoteCursorsProps {
  users: CollaborationUser[];
  viewState: ViewState;
  /** Resolve element bounds by id — used to draw selection outlines. */
  getElementBounds?: (id: string) => Bounds | null;
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({ users, viewState, getElementBounds }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 8 }}>
      {users.map(user => {
        const screenX = user.cursor
          ? user.cursor.x * viewState.zoom + viewState.scrollX
          : -9999;
        const screenY = user.cursor
          ? user.cursor.y * viewState.zoom + viewState.scrollY
          : -9999;

        // Slightly transparent version of user color for soft look
        const softColor = user.color + 'cc';
        const glowColor = user.color + '40';

        return (
          <React.Fragment key={user.clientId}>
            {/* ── Cursor dot + name badge ── */}
            {user.cursor && (
              <div
                style={{
                  position: 'absolute',
                  left: screenX,
                  top: screenY,
                  transition: 'left 80ms linear, top 80ms linear',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Soft glow ring */}
                <div style={{
                  position: 'absolute',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: glowColor,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }} />
                {/* Solid dot */}
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: softColor,
                  border: '2px solid #fff',
                  boxShadow: `0 0 0 1px ${user.color}44, 0 1px 4px rgba(0,0,0,0.18)`,
                  position: 'relative',
                  zIndex: 1,
                }} />
                {/* Name pill */}
                <div style={{
                  position: 'absolute',
                  left: 12,
                  top: 10,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: user.color,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  lineHeight: '16px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  letterSpacing: '0.01em',
                }}>
                  {user.name}
                </div>
              </div>
            )}

            {/* ── Selection outlines ── */}
            {getElementBounds && user.selectedIds.length > 0 && user.selectedIds.map(elId => {
              const bounds = getElementBounds(elId);
              if (!bounds) return null;
              const sx = bounds.x * viewState.zoom + viewState.scrollX;
              const sy = bounds.y * viewState.zoom + viewState.scrollY;
              const sw = bounds.width * viewState.zoom;
              const sh = bounds.height * viewState.zoom;
              return (
                <div key={`${user.clientId}-${elId}`} style={{
                  position: 'absolute',
                  left: sx - 3,
                  top: sy - 3,
                  width: sw + 6,
                  height: sh + 6,
                  border: `2px solid ${user.color}88`,
                  borderRadius: 4,
                  pointerEvents: 'none',
                  transition: 'left 60ms, top 60ms, width 60ms, height 60ms',
                }}>
                  {/* Small name tag on selection */}
                  <span style={{
                    position: 'absolute',
                    top: -16,
                    left: 0,
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    background: user.color + 'cc',
                    padding: '1px 5px',
                    borderRadius: 4,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    whiteSpace: 'nowrap',
                    lineHeight: '13px',
                  }}>
                    {user.name}
                  </span>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};
