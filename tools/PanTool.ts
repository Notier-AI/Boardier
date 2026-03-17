import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';

export class PanTool extends BaseTool {
  readonly type = 'pan' as const;

  private panning = false;
  private lastScreen: Vec2 = { x: 0, y: 0 };

  getCursor(): string { return this.panning ? 'grabbing' : 'grab'; }

  onPointerDown(ctx: ToolContext, _world: Vec2, e: PointerEvent): void {
    this.panning = true;
    this.lastScreen = { x: e.clientX, y: e.clientY };
    ctx.setCursor('grabbing');
  }

  onPointerMove(ctx: ToolContext, _world: Vec2, e: PointerEvent): void {
    if (!this.panning) return;
    const dx = e.clientX - this.lastScreen.x;
    const dy = e.clientY - this.lastScreen.y;
    this.lastScreen = { x: e.clientX, y: e.clientY };

    const vs = ctx.getViewState();
    ctx.setViewState({ scrollX: vs.scrollX + dx, scrollY: vs.scrollY + dy });
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    this.panning = false;
    ctx.setCursor('grab');
  }
}
