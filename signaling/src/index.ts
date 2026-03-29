/**
 * Boardier Signaling Server — Cloudflare Worker + Durable Object
 *
 * Routes WebSocket connections to per-room Durable Objects.
 * Each room has a host, optional password, and guest approval flow.
 *
 * Protocol:
 *   Text frames  = JSON control messages (create-room, join-request, awareness, etc.)
 *   Binary frames = Y.js sync data (relayed to all approved peers)
 */

interface Env {
  ROOM: DurableObjectNamespace;
}

// ─── Worker entry ───────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Route: /room/:roomId
    const match = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]+)$/);
    if (!match) {
      return new Response('Not found. Use /room/:roomId', { status: 404 });
    }

    const roomId = match[1];
    const id = env.ROOM.idFromName(roomId);
    const room = env.ROOM.get(id);

    // Forward the request (must be a WebSocket upgrade)
    const res = await room.fetch(request);
    // Add CORS headers
    const response = new Response(res.body, res);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  },
};

// ─── Guest metadata stored per WebSocket ────────────────

interface GuestInfo {
  clientId: number;
  userName: string;
  approved: boolean;
}

// ─── Durable Object: Room ───────────────────────────────

export class Room {
  private ctx: DurableObjectState;
  private host: WebSocket | null = null;
  private hostClientId = 0;
  private guests = new Map<WebSocket, GuestInfo>();
  private passwordHash: string | null = null;
  private nextClientId = 1;
  private roomId = '';

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    // Extract room ID from the URL
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]+)$/);
    if (match) this.roomId = match[1];

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string') {
      try {
        const msg = JSON.parse(message);
        this.handleControl(ws, msg);
      } catch {
        this.sendJSON(ws, { type: 'error', message: 'Invalid JSON' });
      }
    } else {
      // Binary — Y.js sync data, relay to all other approved peers
      this.relayBinary(ws, message);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    if (ws === this.host) {
      // Host left — notify all guests
      this.broadcastJSON({ type: 'error', message: 'Host disconnected' }, ws);
      this.host = null;
    } else {
      const guest = this.findGuest(ws);
      if (guest) {
        this.broadcastJSON({ type: 'peer-left', clientId: guest.clientId }, ws);
        this.guests.delete(ws);
      }
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.webSocketClose(ws);
  }

  // ─── Control message handler ─────────────────────

  private handleControl(ws: WebSocket, msg: any): void {
    switch (msg.type) {
      case 'create-room': {
        this.host = ws;
        this.hostClientId = this.nextClientId++;
        if (msg.password) this.passwordHash = msg.password;
        this.sendJSON(ws, { type: 'room-created', roomId: this.roomId, clientId: this.hostClientId });
        break;
      }

      case 'join-request': {
        if (!this.host) {
          this.sendJSON(ws, { type: 'error', message: 'No host in this room' });
          return;
        }
        // Validate password if set
        if (this.passwordHash) {
          if (!msg.password) {
            this.sendJSON(ws, { type: 'password-required' });
            return;
          }
          if (msg.password !== this.passwordHash) {
            this.sendJSON(ws, { type: 'join-denied', reason: 'Invalid password' });
            return;
          }
        }
        const clientId = this.nextClientId++;
        this.guests.set(ws, { clientId, userName: msg.userName || 'Guest', approved: false });
        // Forward to host for approval
        this.sendJSON(this.host, { type: 'join-request', clientId, userName: msg.userName || 'Guest' });
        break;
      }

      case 'join-response': {
        // From host: approve or deny a guest
        if (ws !== this.host) return;
        const targetWs = this.findWsByClientId(msg.clientId);
        if (!targetWs) return;
        const guest = this.guests.get(targetWs);
        if (!guest) return;

        if (msg.approved) {
          guest.approved = true;
          this.sendJSON(targetWs, { type: 'join-approved', clientId: guest.clientId });
          // Notify all approved peers
          this.broadcastJSON({ type: 'peer-joined', clientId: guest.clientId, userName: guest.userName }, targetWs);
        } else {
          this.sendJSON(targetWs, { type: 'join-denied', reason: 'Host denied access' });
          this.guests.delete(targetWs);
          try { targetWs.close(1000, 'Denied'); } catch {}
        }
        break;
      }

      case 'awareness': {
        // Relay awareness state to all other approved peers
        this.broadcastJSON(msg, ws);
        break;
      }

      default:
        this.sendJSON(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
    }
  }

  // ─── Helpers ─────────────────────────────────────

  private sendJSON(ws: WebSocket, data: any): void {
    try { ws.send(JSON.stringify(data)); } catch {}
  }

  private broadcastJSON(data: any, exclude?: WebSocket): void {
    const str = JSON.stringify(data);
    if (this.host && this.host !== exclude) {
      try { this.host.send(str); } catch {}
    }
    for (const [guestWs, info] of this.guests) {
      if (guestWs !== exclude && info.approved) {
        try { guestWs.send(str); } catch {}
      }
    }
  }

  private relayBinary(sender: WebSocket, data: ArrayBuffer): void {
    // Only relay if sender is approved
    const isHost = sender === this.host;
    const senderGuest = this.guests.get(sender);
    if (!isHost && (!senderGuest || !senderGuest.approved)) return;

    if (this.host && this.host !== sender) {
      try { this.host.send(data); } catch {}
    }
    for (const [guestWs, info] of this.guests) {
      if (guestWs !== sender && info.approved) {
        try { guestWs.send(data); } catch {}
      }
    }
  }

  private findGuest(ws: WebSocket): GuestInfo | undefined {
    return this.guests.get(ws);
  }

  private findWsByClientId(clientId: number): WebSocket | undefined {
    for (const [ws, info] of this.guests) {
      if (info.clientId === clientId) return ws;
    }
    return undefined;
  }
}
