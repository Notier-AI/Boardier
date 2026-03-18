import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createText } from '../elements/base';

export class TextTool extends BaseTool {
  readonly type = 'text' as const;

  getCursor(): string { return 'text'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    // Check if clicking an existing text element
    const hit = ctx.scene.hitTest(world);
    if (hit && hit.type === 'text') {
      ctx.scene.setSelection([hit.id]);
      ctx.startTextEditing(hit.id);
      ctx.setToolType('select');
      return;
    }

    // Create a new text element
    const defaults = ctx.theme.elementDefaults;
    const el = createText({
      x: world.x,
      y: world.y,
      text: '',
      fontSize: defaults.fontSize,
      fontFamily: defaults.fontFamily,
      strokeColor: defaults.strokeColor,
    });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    ctx.scene.setSelection([el.id]);
    ctx.startTextEditing(el.id);
    ctx.setToolType('select');
  }
}
