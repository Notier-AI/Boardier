import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createLine, createArrow } from '../elements/base';

/**
 * Shared tool for drawing lines and arrows.
 * Click start point, drag to end point.
 */
export class LineTool extends BaseTool {
  readonly type;
  private isArrow: boolean;
  private activeId: string | null = null;
  private startPos: Vec2 = { x: 0, y: 0 };
  private drawing = false;

  constructor(toolType: 'line' | 'arrow') {
    super();
    this.type = toolType;
    this.isArrow = toolType === 'arrow';
  }

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.startPos = world;
    this.drawing = true;

    const defaults = ctx.theme.elementDefaults;
    const el = this.isArrow
      ? createArrow({
          x: world.x, y: world.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
        })
      : createLine({
          x: world.x, y: world.y, width: 0, height: 0,
          points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
          strokeColor: defaults.strokeColor, strokeWidth: defaults.strokeWidth,
        });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    ctx.scene.setSelection([el.id]);
    this.activeId = el.id;
    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const dx = world.x - this.startPos.x;
    const dy = world.y - this.startPos.y;
    ctx.scene.updateElement(this.activeId, {
      width: Math.abs(dx),
      height: Math.abs(dy),
      points: [{ x: 0, y: 0 }, { x: dx, y: dy }],
    });
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const dx = world.x - this.startPos.x;
    const dy = world.y - this.startPos.y;
    // Remove zero-length lines
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
      ctx.scene.removeElement(this.activeId);
    } else {
      ctx.commitHistory();
    }
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
