/**
 * @boardier-module ui/CollabOverlay
 * @boardier-category UI
 * @boardier-description Collaboration UI overlay with Share dialog (host link + password), Join dialog (username + password), join-request approval popup, and connected users badges. Uses inline styles with theme tokens.
 * @boardier-since 0.5.0
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CollaborationUser, JoinRequest, CollabEvent, ViewState } from '../core/types';
import type { CollaborationProvider } from '../core/Collaboration';
import type { BoardierTheme } from '../themes/types';
import { RemoteCursors } from './RemoteCursors';

interface CollabOverlayProps {
  collab: CollaborationProvider;
  theme: BoardierTheme;
  viewState: ViewState;
  roomId?: string;
  /** Called when room is created (host mode) so parent can update URL. */
  onRoomCreated?: (roomId: string) => void;
}

export const CollabOverlay: React.FC<CollabOverlayProps> = ({ collab, theme, viewState, roomId, onRoomCreated }) => {
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'waiting' | 'approved' | 'denied'>('idle');
  const [denyReason, setDenyReason] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinUserName, setJoinUserName] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const isHost = collab.getRole() === 'host';
  const joinFormShownRef = useRef(false);

  useEffect(() => {
    const unsub = collab.onEvent((e: CollabEvent) => {
      switch (e.type) {
        case 'room-created':
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('room', e.roomId);
            setShareLink(url.toString());
          }
          onRoomCreated?.(e.roomId);
          if (isHost) setShowShareDialog(true);
          break;
        case 'connected':
          setConnected(true);
          setJoinStatus('approved');
          break;
        case 'disconnected':
          setConnected(false);
          break;
        case 'join-request':
          setJoinRequests(prev => [...prev, e.request]);
          break;
        case 'join-approved':
          setJoinStatus('approved');
          break;
        case 'join-denied':
          setJoinStatus('denied');
          setDenyReason(e.reason || 'Host denied access');
          break;
        case 'password-required':
          setNeedsPassword(true);
          // Re-show join form so guest can enter the password
          setJoinStatus('idle');
          setShowJoinForm(true);
          break;
        case 'users-changed':
          setUsers(e.users);
          break;
        case 'error':
          // If guest hasn't been approved yet, show the error in the join form
          if (!isHost && (joinStatus === 'waiting' || joinStatus === 'idle')) {
            setJoinStatus('denied');
            setDenyReason(e.message);
          }
          break;
      }
    });
    return unsub;
  }, [collab, isHost, onRoomCreated]);

  // Show join form for guests
  useEffect(() => {
    if (!isHost && !joinFormShownRef.current) {
      joinFormShownRef.current = true;
      setShowJoinForm(true);
      setJoinStatus('idle');
    }
  }, [isHost]);

  const handleApprove = useCallback((clientId: number) => {
    collab.approveJoin(clientId);
    setJoinRequests(prev => prev.filter(r => r.clientId !== clientId));
  }, [collab]);

  const handleDeny = useCallback((clientId: number) => {
    collab.denyJoin(clientId);
    setJoinRequests(prev => prev.filter(r => r.clientId !== clientId));
  }, [collab]);

  const handleCopyLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareLink]);

  const ui = theme.uiStyle;
  const font = theme.uiFontFamily;

  const dialogBackdrop: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const dialogBox: React.CSSProperties = {
    background: theme.panelBackground, borderRadius: ui.panelBorderRadius + 4,
    border: `${ui.panelBorderWidth}px ${ui.panelBorderStyle} ${theme.panelBorder}`,
    boxShadow: ui.panelShadow, padding: 20, minWidth: 320, maxWidth: 400,
    fontFamily: font, color: theme.panelText,
  };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', border: 'none', borderRadius: ui.buttonBorderRadius,
    background: theme.selectionColor, color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: font,
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px', border: `1px solid ${theme.panelBorder}`, borderRadius: ui.buttonBorderRadius,
    background: 'transparent', color: theme.panelText, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: font,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 34, border: `${ui.inputBorderWidth}px solid ${theme.panelBorder}`,
    borderRadius: ui.inputBorderRadius, background: theme.panelBackground, color: theme.panelText,
    padding: '0 10px', fontSize: 13, fontFamily: font, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <>
      {/* Remote cursors */}
      <RemoteCursors users={users} viewState={viewState} />

      {/* Connected users badges */}
      {connected && users.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 15,
          fontFamily: font,
        }}>
          {users.map(u => (
            <div key={u.clientId} title={u.name} style={{
              width: 28, height: 28, borderRadius: '50%', background: u.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700,
              border: '2px solid ' + theme.panelBackground,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}>
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {/* Connection status dot */}
      {collab.isConnected() && (
        <div style={{
          position: 'absolute', top: 14, right: users.length > 0 ? 12 + users.length * 32 + 8 : 12,
          width: 10, height: 10, borderRadius: '50%',
          background: connected ? '#2f9e44' : '#e03131',
          border: '2px solid ' + theme.panelBackground,
          zIndex: 15,
        }} title={connected ? 'Connected' : 'Disconnected'} />
      )}

      {/* ── Share Dialog (host) ── */}
      {showShareDialog && isHost && (
        <div style={dialogBackdrop} onClick={() => setShowShareDialog(false)}>
          <div style={dialogBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Share this board</div>
            <div style={{ fontSize: 12, color: theme.panelTextSecondary, marginBottom: 12 }}>
              Anyone with this link can request to join. You'll approve each person.
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input readOnly value={shareLink} style={{ ...inputStyle, flex: 1, fontSize: 11, fontFamily: 'monospace' }}
                onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={handleCopyLink} style={btnPrimary}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={() => setShowShareDialog(false)} style={{ ...btnSecondary, width: '100%' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Join Request Popups (host) ── */}
      {joinRequests.map((req, i) => (
        <div key={req.clientId} style={{
          position: 'absolute', top: 56 + i * 60, right: 12, zIndex: 20,
          background: theme.panelBackground, borderRadius: ui.panelBorderRadius,
          border: `${ui.panelBorderWidth}px ${ui.panelBorderStyle} ${theme.panelBorder}`,
          boxShadow: ui.panelShadow, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, fontFamily: font,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            <strong>{req.userName}</strong> wants to join
          </span>
          <button onClick={() => handleApprove(req.clientId)} style={{
            ...btnPrimary, padding: '5px 12px', fontSize: 12,
          }}>Accept</button>
          <button onClick={() => handleDeny(req.clientId)} style={{
            ...btnSecondary, padding: '5px 12px', fontSize: 12, color: '#e03131', borderColor: '#e03131',
          }}>Deny</button>
        </div>
      ))}

      {/* ── Join Form (guest, shown before connecting) ── */}
      {!isHost && showJoinForm && joinStatus === 'idle' && (
        <div style={dialogBackdrop}>
          <div style={dialogBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Join collaborative session</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.panelTextSecondary, display: 'block', marginBottom: 4 }}>
                  Your name
                </label>
                <input value={joinUserName} onChange={e => setJoinUserName(e.target.value)}
                  placeholder="Enter your name" autoFocus style={inputStyle} />
              </div>
              {needsPassword && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.panelTextSecondary, display: 'block', marginBottom: 4 }}>
                    Password
                  </label>
                  <input type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)}
                    placeholder="Room password" style={inputStyle} />
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!joinUserName.trim()) return;
                setShowJoinForm(false);
                setJoinStatus('waiting');
                collab.setUserName(joinUserName.trim());
                if (joinPassword) collab.setPassword(joinPassword);
                collab.disconnect();
                collab.connect();
              }}
              disabled={!joinUserName.trim()}
              style={{ ...btnPrimary, width: '100%', opacity: joinUserName.trim() ? 1 : 0.5 }}
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* ── Waiting for approval (guest) ── */}
      {!isHost && joinStatus === 'waiting' && (
        <div style={dialogBackdrop}>
          <div style={{ ...dialogBox, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Waiting for host approval...</div>
            <div style={{ fontSize: 12, color: theme.panelTextSecondary }}>
              The host will see your join request.
            </div>
          </div>
        </div>
      )}

      {/* ── Denied (guest) ── */}
      {!isHost && joinStatus === 'denied' && (
        <div style={dialogBackdrop}>
          <div style={{ ...dialogBox, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e03131', marginBottom: 8 }}>Access Denied</div>
            <div style={{ fontSize: 12, color: theme.panelTextSecondary, marginBottom: 12 }}>{denyReason}</div>
            <button onClick={() => { setJoinStatus('idle'); setShowJoinForm(true); }} style={btnSecondary}>
              Try again
            </button>
          </div>
        </div>
      )}
    </>
  );
};
