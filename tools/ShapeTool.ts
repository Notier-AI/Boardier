import type { Vec2, BoardierElementType } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createElement } from '../elements/base';
import { normalizeBounds } from '../utils/math';

/**
 * Shared tool for drawing rectangles, ellipses, and diamonds.
 * The `elementType` parameter selects which shape to create.
 */
export class ShapeTool extends BaseTool {
  readonly type;
  private elementType: BoardierElementType;
  private activeId: string | null = null;
  private startPos: Vec2 = { x: 0, y: 0 };
  private drawing = false;

  constructor(toolType: 'rectangle' | 'ellipse' | 'diamond') {
    super();
    this.type = toolType;
    this.elementType = toolType;
  }

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.startPos = world;
    this.drawing = true;

    const defaults = ctx.theme.elementDefaults;
    const el = createElement(this.elementType, {
      x: world.x,
      y: world.y,
      width: 0,
      height: 0,
      strokeColor: defaults.strokeColor,
      backgroundColor: defaults.backgroundColor,
      fillStyle: defaults.fillStyle,
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
    const b = normalizeBounds(
      this.startPos.x, this.startPos.y,
      world.x - this.startPos.x, world.y - this.startPos.y,
    );
    ctx.scene.updateElement(this.activeId, { x: b.x, y: b.y, width: b.width, height: b.height });
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;
    const el = ctx.scene.getElementById(this.activeId);
    // Remove zero-size elements (accidental click)
    if (el && el.width < 2 && el.height < 2) {
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
