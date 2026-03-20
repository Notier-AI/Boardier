/**
 * @boardier-module tools/WidgetTool
 * @boardier-category Tools
 * @boardier-description Generic tool for placing widget elements (checkbox, radiogroup, frame, embed, table). Accepts a widget type and default dimensions; creates the corresponding element on click.
 * @boardier-since 0.1.0
 */
import type { Vec2, BoardierElementType } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createElement } from '../elements/base';
import { normalizeBounds } from '../utils/math';

/**
 * Shared tool for placing widget elements (checkbox, radiogroup, frame).
 * Click creates at default size; drag creates at custom size.
 */
export class WidgetTool extends BaseTool {
  readonly type;
  private elementType: BoardierElementType;
  private activeId: string | null = null;
  private startPos: Vec2 = { x: 0, y: 0 };
  private drawing = false;
  private defaultW: number;
  private defaultH: number;

  constructor(toolType: 'checkbox' | 'radiogroup' | 'frame', defaultW: number, defaultH: number) {
    super();
    this.type = toolType;
    this.elementType = toolType;
    this.defaultW = defaultW;
    this.defaultH = defaultH;
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
    if (el && el.width < 5 && el.height < 5) {
      // Click-to-place: use default dimensions
      ctx.scene.updateElement(this.activeId, {
        x: this.startPos.x - this.defaultW / 2,
        y: this.startPos.y - this.defaultH / 2,
        width: this.defaultW,
        height: this.defaultH,
      });
    }
    ctx.commitHistory();
    const placedId = this.activeId;
    this.drawing = false;
    this.activeId = null;
    ctx.setToolType('select');

    // Trigger embed URL prompt after placement
    if (this.elementType === 'embed' as any && placedId) {
      ctx.startEmbedUrlEditing?.(placedId);
    }
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
