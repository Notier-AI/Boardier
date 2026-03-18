import type { BoardierToolType, BoardierConfig, Vec2 } from '../core/types';
import type { Scene } from '../core/Scene';
import type { History } from '../core/History';
import type { Renderer } from '../core/Renderer';
import type { Clipboard } from '../core/Clipboard';
import type { BoardierTheme } from '../themes/types';

/** Everything a tool needs to interact with the engine. */
export interface ToolContext {
  scene: Scene;
  history: History;
  renderer: Renderer;
  clipboard: Clipboard;
  theme: BoardierTheme;
  config: BoardierConfig;
  getViewState(): { scrollX: number; scrollY: number; zoom: number };
  setViewState(update: Partial<{ scrollX: number; scrollY: number; zoom: number }>): void;
  screenToWorld(screen: Vec2): Vec2;
  requestRender(): void;
  commitHistory(): void;
  setToolType(type: BoardierToolType): void;
  setCursor(cursor: string): void;
  startTextEditing(elementId: string): void;
  getCanvasRect(): DOMRect;
}

/** Abstract base for all Boardier tools. */
export abstract class BaseTool {
  abstract readonly type: BoardierToolType;

  onPointerDown(_ctx: ToolContext, _worldPos: Vec2, _e: PointerEvent): void {}
  onPointerMove(_ctx: ToolContext, _worldPos: Vec2, _e: PointerEvent): void {}
  onPointerUp(_ctx: ToolContext, _worldPos: Vec2, _e: PointerEvent): void {}
  onKeyDown(_ctx: ToolContext, _e: KeyboardEvent): void {}
  onKeyUp(_ctx: ToolContext, _e: KeyboardEvent): void {}
  onActivate(_ctx: ToolContext): void {}
  onDeactivate(_ctx: ToolContext): void {}

  getCursor(): string {
    return 'default';
  }
}
