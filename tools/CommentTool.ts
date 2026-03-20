/**
 * @boardier-module tools/CommentTool
 * @boardier-category Tools
 * @boardier-description Click-to-place tool for adding comment/annotation pins. Creates a CommentElement at the click position with default author and timestamp.
 * @boardier-since 0.1.0
 */
import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createComment } from '../elements/base';

/**
 * CommentTool: click to place a comment pin at the clicked location.
 */
export class CommentTool extends BaseTool {
  readonly type = 'comment' as const;

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    const el = createComment({
      x: world.x - 12,
      y: world.y - 12,
      width: 24,
      height: 28,
      text: '',
      author: '',
      markerColor: '#f59e0b',
    });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    ctx.scene.setSelection([el.id]);
    ctx.commitHistory();
    ctx.requestRender();
    ctx.setToolType('select');
  }
}
