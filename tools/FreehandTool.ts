import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createFreehand } from '../elements/base';
import { simplifyPath } from '../utils/math';

export class FreehandTool extends BaseTool {
  readonly type = 'freehand' as const;

  private activeId: string | null = null;
  private rawPoints: Vec2[] = [];
  private rawPressures: number[] = [];
  private originX = 0;
  private originY = 0;
  private drawing = false;

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, e: PointerEvent): void {
    this.drawing = true;
    this.originX = world.x;
    this.originY = world.y;
    this.rawPoints = [{ x: 0, y: 0 }];
    this.rawPressures = [e.pressure || 0.5];

    const defaults = ctx.theme.elementDefaults;
    const el = createFreehand({
      x: world.x, y: world.y, width: 0, height: 0,
      points: [{ x: 0, y: 0 }],
      strokeColor: defaults.strokeColor,
      strokeWidth: defaults.strokeWidth,
    });

    ctx.history.push(ctx.scene.getElements());
    ctx.scene.addElement(el);
    this.activeId = el.id;
    ctx.requestRender();
  }

  onPointerMove(ctx: ToolContext, world: Vec2, e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;

    const p = { x: world.x - this.originX, y: world.y - this.originY };
    this.rawPoints.push(p);
    this.rawPressures.push(e.pressure || 0.5);

    // Compute bounding extent
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of this.rawPoints) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }

    ctx.scene.updateElement(this.activeId, {
      points: [...this.rawPoints],
      pressures: [...this.rawPressures],
      width: maxX - minX,
      height: maxY - minY,
    });
    ctx.requestRender();
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    if (!this.drawing || !this.activeId) return;

    if (this.rawPoints.length < 3) {
      ctx.scene.removeElement(this.activeId);
    } else {
      // Simplify path
      const simplified = simplifyPath(this.rawPoints, 1.5);
      // Downsample pressures to match simplified path length
      const ratio = this.rawPressures.length / Math.max(simplified.length, 1);
      const simplifiedPressures = simplified.map((_, i) => {
        const srcIdx = Math.min(Math.round(i * ratio), this.rawPressures.length - 1);
        return this.rawPressures[srcIdx];
      });
      ctx.scene.updateElement(this.activeId, { points: simplified, pressures: simplifiedPressures } as any);
      ctx.commitHistory();
    }

    this.drawing = false;
    this.activeId = null;
    this.rawPoints = [];
    this.rawPressures = [];
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.drawing && this.activeId) {
      ctx.scene.removeElement(this.activeId);
      this.drawing = false;
      this.activeId = null;
      this.rawPoints = [];
      this.rawPressures = [];
      ctx.requestRender();
    }
  }
}
