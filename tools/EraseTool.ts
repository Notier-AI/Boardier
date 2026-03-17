import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';

export class EraseTool extends BaseTool {
  readonly type = 'eraser' as const;
  private erasing = false;
  private erasedIds = new Set<string>();

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.erasing = true;
    this.erasedIds.clear();
    ctx.history.push(ctx.scene.getElements());
    this.tryErase(ctx, world);
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.erasing) return;
    this.tryErase(ctx, world);
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    if (!this.erasing) return;
    this.erasing = false;
    if (this.erasedIds.size > 0) {
      ctx.commitHistory();
    }
    this.erasedIds.clear();
  }

  private tryErase(ctx: ToolContext, world: Vec2): void {
    const hit = ctx.scene.hitTest(world, 8);
    if (hit && !this.erasedIds.has(hit.id)) {
      this.erasedIds.add(hit.id);
      ctx.scene.removeElement(hit.id);
      ctx.requestRender();
    }
  }
}
