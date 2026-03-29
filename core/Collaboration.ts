/**
 * @boardier-module core/Collaboration
 * @boardier-category Core
 * @boardier-description Real-time multiplayer collaboration provider using Y.js CRDT and a WebSocket relay server. Supports host/guest roles, password-protected rooms, join approval flow, and cursor/selection awareness. The host's browser is the authoritative peer.
 * @boardier-since 0.5.0
 */
import * as Y from 'yjs';
import type { BoardierElement, CollaborationConfig, CollaborationUser, JoinRequest, CollabEvent, Vec2 } from './types';
import type { Scene } from './Scene';

/* ── Y.js sync protocol message types ─────────────────── */
const MSG_SYNC_STEP1 = 0;
const MSG_SYNC_STEP2 = 1;
const MSG_UPDATE = 2;

/* ── User colors ─────────────────────────────────────── */
const USER_COLORS = [
  '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#9c36b5', '#0c8599', '#e8590c', '#6741d9',
];

/** Hash a password string using SHA-256 (Web Crypto). */
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @boardier-class CollaborationProvider
 * @boardier-description Manages the Y.js document, WebSocket connection to the signaling server, and bidirectional sync with the Scene. Emits CollabEvents for UI integration.
 */
export class CollaborationProvider {
  private ydoc: Y.Doc;
  private yElements: Y.Map<any>;
  private yOrder: Y.Array<string>;
  private undoManager: Y.UndoManager;

  private ws: WebSocket | null = null;
  private scene: Scene;
  private config: CollaborationConfig;
  private role: 'host' | 'guest';
  private clientId = 0;

  private suppressSceneSync = false;
  private users = new Map<number, CollaborationUser>();
  private eventListeners: ((e: CollabEvent) => void)[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private hasConnected = false;

  /** Called after remote changes are applied so the canvas can repaint. */
  requestRender: (() => void) | null = null;

  constructor(scene: Scene, config: CollaborationConfig) {
    this.scene = scene;
    this.config = config;
    this.role = config.roomId ? 'guest' : 'host';

    this.ydoc = new Y.Doc();
    this.yElements = this.ydoc.getMap('elements');
    this.yOrder = this.ydoc.getArray('elementOrder');
    this.undoManager = new Y.UndoManager([this.yElements, this.yOrder]);

    // Y.js → Scene sync (remote changes only)
    this.yElements.observe((_event, txn) => {
      if (txn.local) return;
      this.syncYDocToScene();
    });
    this.yOrder.observe((_event, txn) => {
      if (txn.local) return;
      this.syncYDocToScene();
    });

    // Scene → Y.js sync (local changes only)
    scene.onChange(() => {
      if (this.suppressSceneSync) return;
      this.syncSceneToYDoc();
    });

    // Listen for Y.js updates to send over WebSocket
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin === 'remote') return;
      this.sendBinary(encodeUpdate(update));
    });
  }

  /** Update the user's display name (must be called before connect for guests). */
  setUserName(name: string): void {
    this.config = { ...this.config, userName: name };
  }

  /** Set the room password (must be called before connect for password-protected rooms). */
  setPassword(password: string): void {
    this.config = { ...this.config, password };
  }

  /* ── Connection ─────────────────────────────────── */

  async connect(): Promise<void> {
    if (this.destroyed) return;
    const url = this.config.signalingUrl.replace(/\/$/, '');
    const roomId = this.config.roomId || generateRoomId();

    this.ws = new WebSocket(`${url}/room/${roomId}`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = async () => {
      if (this.role === 'host') {
        const msg: any = { type: 'create-room', userName: this.config.userName || 'Host' };
        if (this.config.password) msg.password = await hashPassword(this.config.password);
        this.sendJSON(msg);
      } else {
        const msg: any = { type: 'join-request', userName: this.config.userName || 'Guest' };
        if (this.config.password) msg.password = await hashPassword(this.config.password);
        this.sendJSON(msg);
      }
    };

    this.ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(new Uint8Array(e.data));
      } else {
        this.handleJSONMessage(JSON.parse(e.data as string));
      }
    };

    this.ws.onclose = () => {
      this.emit({ type: 'disconnected' });
      // Only auto-reconnect if we had a previously successful session
      if (!this.destroyed && this.hasConnected) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.emit({ type: 'error', message: 'WebSocket connection failed' });
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  /* ── Message handlers ───────────────────────────── */

  private handleJSONMessage(msg: any): void {
    switch (msg.type) {
      case 'room-created':
        this.clientId = msg.clientId;
        this.hasConnected = true;
        if (this.role === 'host') {
          // Seed Y.js from the current scene
          this.syncSceneToYDoc();
        }
        this.emit({ type: 'room-created', roomId: msg.roomId ?? this.config.roomId ?? '' });
        this.emit({ type: 'connected', clientId: this.clientId });
        break;

      case 'join-request':
        this.emit({ type: 'join-request', request: { clientId: msg.clientId, userName: msg.userName } });
        break;

      case 'join-approved':
        this.clientId = msg.clientId;
        this.hasConnected = true;
        this.emit({ type: 'join-approved', clientId: this.clientId });
        this.emit({ type: 'connected', clientId: this.clientId });
        // Request sync from host (send our state vector)
        this.sendBinary(encodeSyncStep1(this.ydoc));
        break;

      case 'join-denied':
        this.emit({ type: 'join-denied', reason: msg.reason });
        break;

      case 'password-required':
        this.emit({ type: 'password-required' });
        break;

      case 'peer-joined': {
        const color = USER_COLORS[msg.clientId % USER_COLORS.length];
        const user: CollaborationUser = { clientId: msg.clientId, name: msg.userName, color, selectedIds: [] };
        this.users.set(msg.clientId, user);
        this.emit({ type: 'peer-joined', user });
        this.emit({ type: 'users-changed', users: this.getUsers() });
        break;
      }

      case 'peer-left':
        this.users.delete(msg.clientId);
        this.emit({ type: 'peer-left', clientId: msg.clientId });
        this.emit({ type: 'users-changed', users: this.getUsers() });
        break;

      case 'awareness': {
        let user = this.users.get(msg.clientId);
        // Auto-create user entry if we haven't seen them yet (e.g. host)
        if (!user && msg.state.name) {
          const color = USER_COLORS[msg.clientId % USER_COLORS.length];
          user = { clientId: msg.clientId, name: msg.state.name, color, selectedIds: [] };
          this.users.set(msg.clientId, user);
        }
        if (user) {
          if (msg.state.cursor) user.cursor = msg.state.cursor;
          if (msg.state.selectedIds) user.selectedIds = msg.state.selectedIds;
          if (msg.state.name) user.name = msg.state.name;
          this.emit({ type: 'users-changed', users: this.getUsers() });
        }
        break;
      }

      case 'error':
        this.emit({ type: 'error', message: msg.message });
        break;
    }
  }

  private handleBinaryMessage(data: Uint8Array): void {
    if (data.length === 0) return;
    const msgType = data[0];
    const payload = data.subarray(1);

    switch (msgType) {
      case MSG_SYNC_STEP1: {
        // Remote sent its state vector; respond with the diff
        const diff = Y.encodeStateAsUpdate(this.ydoc, payload);
        this.sendBinary(encodeSyncStep2(diff));
        // Also send our state vector so they can send us what we're missing
        this.sendBinary(encodeSyncStep1(this.ydoc));
        break;
      }
      case MSG_SYNC_STEP2:
      case MSG_UPDATE:
        Y.applyUpdate(this.ydoc, payload, 'remote');
        break;
    }
  }

  /* ── Host actions ───────────────────────────────── */

  approveJoin(clientId: number): void {
    this.sendJSON({ type: 'join-response', clientId, approved: true });
  }

  denyJoin(clientId: number): void {
    this.sendJSON({ type: 'join-response', clientId, approved: false });
  }

  /* ── Awareness ──────────────────────────────────── */

  updateCursor(pos: Vec2 | null): void {
    this.sendJSON({
      type: 'awareness',
      clientId: this.clientId,
      state: { cursor: pos, name: this.config.userName },
    });
  }

  updateSelection(ids: string[]): void {
    this.sendJSON({
      type: 'awareness',
      clientId: this.clientId,
      state: { selectedIds: ids, name: this.config.userName },
    });
  }

  /* ── Undo/redo (Y.js UndoManager) ──────────────── */

  undo(): boolean {
    if (this.undoManager.undoStack.length > 0) {
      this.undoManager.undo();
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.undoManager.redoStack.length > 0) {
      this.undoManager.redo();
      return true;
    }
    return false;
  }

  /* ── Queries ────────────────────────────────────── */

  getUsers(): CollaborationUser[] {
    return Array.from(this.users.values());
  }

  getRole(): 'host' | 'guest' {
    return this.role;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /* ── Events ─────────────────────────────────────── */

  onEvent(cb: (e: CollabEvent) => void): () => void {
    this.eventListeners.push(cb);
    return () => { this.eventListeners = this.eventListeners.filter(f => f !== cb); };
  }

  private emit(event: CollabEvent): void {
    for (const cb of this.eventListeners) cb(event);
  }

  /* ── Sync logic ─────────────────────────────────── */

  private syncSceneToYDoc(): void {
    const elements = this.scene.getElements();
    this.ydoc.transact(() => {
      const existingIds = new Set<string>();
      const newOrder = elements.map((el, i) => {
        existingIds.add(el.id);
        const existing = this.yElements.get(el.id);
        // Only update if content changed
        if (!existing || !shallowEqual(existing, el)) {
          this.yElements.set(el.id, { ...el, _zIndex: i });
        } else if (existing._zIndex !== i) {
          this.yElements.set(el.id, { ...existing, _zIndex: i });
        }
        return el.id;
      });
      // Remove deleted elements
      this.yElements.forEach((_: any, id: string) => {
        if (!existingIds.has(id)) this.yElements.delete(id);
      });
      // Update order array
      const curOrder = this.yOrder.toArray();
      if (!arraysEqual(curOrder, newOrder)) {
        this.yOrder.delete(0, this.yOrder.length);
        this.yOrder.push(newOrder);
      }
    });
  }

  private syncYDocToScene(): void {
    const entries: any[] = [];
    this.yElements.forEach((val: any, id: string) => {
      entries.push({ ...val, id });
    });
    entries.sort((a, b) => (a._zIndex ?? 0) - (b._zIndex ?? 0));
    const elements: BoardierElement[] = entries.map(({ _zIndex, ...el }) => el);

    this.suppressSceneSync = true;
    this.scene.setElements(elements);
    this.suppressSceneSync = false;
    this.requestRender?.();
  }

  /* ── WebSocket helpers ──────────────────────────── */

  private sendJSON(msg: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private sendBinary(data: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  /* ── Cleanup ────────────────────────────────────── */

  destroy(): void {
    this.destroyed = true;
    this.disconnect();
    this.ydoc.destroy();
    this.eventListeners = [];
    this.users.clear();
  }
}

/* ── Encoding helpers ──────────────────────────────── */

function encodeSyncStep1(ydoc: Y.Doc): Uint8Array {
  const sv = Y.encodeStateVector(ydoc);
  const msg = new Uint8Array(1 + sv.length);
  msg[0] = MSG_SYNC_STEP1;
  msg.set(sv, 1);
  return msg;
}

function encodeSyncStep2(update: Uint8Array): Uint8Array {
  const msg = new Uint8Array(1 + update.length);
  msg[0] = MSG_SYNC_STEP2;
  msg.set(update, 1);
  return msg;
}

function encodeUpdate(update: Uint8Array): Uint8Array {
  const msg = new Uint8Array(1 + update.length);
  msg[0] = MSG_UPDATE;
  msg.set(update, 1);
  return msg;
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
}

function shallowEqual(a: any, b: any): boolean {
  const aKeys = Object.keys(a).filter(k => k !== '_zIndex');
  const bKeys = Object.keys(b).filter(k => k !== '_zIndex');
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      // Deep compare arrays/objects
      if (typeof a[key] === 'object' && typeof b[key] === 'object') {
        if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return false;
      } else {
        return false;
      }
    }
  }
  return true;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
