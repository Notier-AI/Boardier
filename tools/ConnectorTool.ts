import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createConnector } from '../elements/base';
import { getElementBounds } from '../elements/base';

/**
 * ConnectorTool: click on source element → drag → release on target element to create a smart connector.
 * If released on empty space, creates a floating endpoint.
 */
export class ConnectorTool extends BaseTool {
  readonly type = 'connector' as const;
  private drawing = false;
  private activeId: string | null = null;
  private startWorld: Vec2 = { x: 0, y: 0 };

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.drawing = true;
    this.startWorld = world;

    // Check if clicking on an element to start connection
    const els = ctx.scene.getElements();
    let startId: string | null = null;
    let startPort: 'top' | 'right' | 'bottom' | 'left' | 'auto' = 'auto';

    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.type === 'connector') continue;
      const b = getElementBounds(el);
      if (world.x >= b.x && world.x <= b.x + b.width && world.y >= b.y && world.y <= b.y + b.height) {
        startId = el.id;
        // Determine closest port
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const dx = world.x - cx, dy = world.y - cy;
        if (Math.abs(dx) > Math.abs(dy)) {
          startPort = dx > 0 ? 'right' : 'left';
        } else {
          startPort = dy > 0 ? 'bottom' : 'top';
        }
        break;
      }
    }

    const defaults = ctx.theme.elementDefaults;
    const el = createConnector({
      x: 0, y: 0,
      startId,
      endId: null,
      startPort,
      endPort: 'auto',
      pathPoints: [{ x: world.x, y: world.y }, { x: world.x, y: world.y }],
      strokeColor: defaults.strokeColor,
      strokeWidth: defaults.strokeWidth,
    });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    ctx.scene.setSelection([el.id]);
    this.activeId = el.id;
    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    if (!el || el.type !== 'connector') return;

    // Update end point
    const pts = [...el.pathPoints];
    pts[pts.length - 1] = { x: world.x, y: world.y };

    // For elbow style, generate intermediate points
    if (el.lineStyle === 'elbow' && pts.length >= 2) {
      const start = pts[0];
      const end = pts[pts.length - 1];
      const midX = (start.x + end.x) / 2;
      const elbowPoints = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
      ctx.scene.updateElement(this.activeId, { pathPoints: elbowPoints } as any);
    } else {
      ctx.scene.updateElement(this.activeId, { pathPoints: pts } as any);
    }
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;

    // Check if landing on an element
    const els = ctx.scene.getElements();
    let endId: string | null = null;
    let endPort: 'top' | 'right' | 'bottom' | 'left' | 'auto' = 'auto';

    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.type === 'connector' || el.id === this.activeId) continue;
      const b = getElementBounds(el);
      if (world.x >= b.x && world.x <= b.x + b.width && world.y >= b.y && world.y <= b.y + b.height) {
        endId = el.id;
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const dx = world.x - cx, dy = world.y - cy;
        if (Math.abs(dx) > Math.abs(dy)) {
          endPort = dx > 0 ? 'right' : 'left';
        } else {
          endPort = dy > 0 ? 'bottom' : 'top';
        }
        break;
      }
    }

    // Finalize connector path
    const connEl = ctx.scene.getElementById(this.activeId);
    if (connEl && connEl.type === 'connector') {
      const updates: any = { endId, endPort };

      // Rebuild path if both ends are connected
      if (connEl.startId && endId) {
        const startEl = ctx.scene.getElementById(connEl.startId);
        const endEl = ctx.scene.getElementById(endId);
        if (startEl && endEl) {
          const sb = getElementBounds(startEl);
          const eb = getElementBounds(endEl);
          const sp = portPos(sb, connEl.startPort);
          const ep = portPos(eb, endPort);
          updates.pathPoints = [sp, ep];
        }
      }

      ctx.scene.updateElement(this.activeId, updates);
    }

    ctx.commitHistory();
    this.drawing = false;
    this.activeId = null;
    ctx.setToolType('select');
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.drawing && this.activeId) {
      ctx.scene.removeElement(this.activeId);
      this.drawing = false;
      this.activeId = null;
      ctx.requestRender();
    }
  }
}

function portPos(b: { x: number; y: number; width: number; height: number }, port: string): Vec2 {
  switch (port) {
    case 'top':    return { x: b.x + b.width / 2, y: b.y };
    case 'bottom': return { x: b.x + b.width / 2, y: b.y + b.height };
    case 'left':   return { x: b.x, y: b.y + b.height / 2 };
    case 'right':  return { x: b.x + b.width, y: b.y + b.height / 2 };
    default:       return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
}
