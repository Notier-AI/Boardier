import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';

/**
 * Icon tool — triggers the icon picker dialog via the Engine callback.
 * The actual icon creation is handled by the UI layer (BoardierCanvas).
 */
export class IconTool extends BaseTool {
  readonly type = 'icon' as const;

  getCursor(): string { return 'default'; }

  onPointerDown(_ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    // Handled by the picker
  }
}
