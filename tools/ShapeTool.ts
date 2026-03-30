/**
 * @boardier-module tools/ShapeTool
 * @boardier-category Tools
 * @boardier-description Generic tool for creating rectangle, ellipse, and diamond shapes. Click-and-drag creates the shape; hold Shift for square/circle constraint. Snaps to smart guides during creation.
 * @boardier-since 0.1.0
 * @boardier-changed 0.5.1 Added smart guide snapping during shape creation — edges snap to alignment, spacing, and size-match guides while drawing
 */
import type { Vec2, Bounds, BoardierElementType } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createElement, getElementBounds } from '../elements/base';
import { normalizeBounds } from '../utils/math';
import {
  type SmartGuide,
  type SpacingGap,
  type RefEdgeCache,
  buildRefEdgeCache,
  computeSmartGuides,
} from '../utils/smartGuides';

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
  // Smart guides during shape creation
  private smartGuides: SmartGuide[] = [];
  private spacingGaps: SpacingGap[] = [];
  private _refEdgesCache: RefEdgeCache | null = null;

  constructor(toolType: 'rectangle' | 'ellipse' | 'diamond') {
    super();
    this.type = toolType;
    this.elementType = toolType;
  }

  getCursor(): string { return 'crosshair'; }

  onPointerDown(ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.startPos = world;
    this.drawing = true;
    this._refEdgesCache = null;

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

    // Build reference cache (excludes the active element)
    if (!this._refEdgesCache) {
      const refBounds: Bounds[] = [];
      for (const el of ctx.scene.getElements()) {
        if (el.id === this.activeId) continue;
        refBounds.push(getElementBounds(el));
      }
      this._refEdgesCache = buildRefEdgeCache(refBounds);
    }

    // Compute snapping on the drawn shape's bounds
    const zoom = ctx.getViewState().zoom || 1;
    const result = computeSmartGuides([b], this._refEdgesCache, zoom);
    this.smartGuides = result.guides;
    this.spacingGaps = result.gaps;

    // Apply snap to the moving edge (opposite of start point)
    let { x, y, width, height } = b;
    if (world.x >= this.startPos.x) {
      width += result.snapDx; // right edge
    } else {
      x += result.snapDx;
      width -= result.snapDx; // left edge
    }
    if (world.y >= this.startPos.y) {
      height += result.snapDy; // bottom edge
    } else {
      y += result.snapDy;
      height -= result.snapDy; // top edge
    }

    if (width < 1) width = 1;
    if (height < 1) height = 1;

    ctx.scene.updateElement(this.activeId, { x, y, width, height });
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
    this.smartGuides = [];
    this.spacingGaps = [];
    this._refEdgesCache = null;
    ctx.setToolType('select');
  }

  getSmartGuides(): SmartGuide[] {
    return this.smartGuides;
  }

  getSpacingGaps(): SpacingGap[] {
    return this.spacingGaps;
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.drawing && this.activeId) {
      ctx.scene.removeElement(this.activeId);
      this.drawing = false;
      this.activeId = null;
      this.smartGuides = [];
      this.spacingGaps = [];
      this._refEdgesCache = null;
      ctx.requestRender();
    }
  }
}
