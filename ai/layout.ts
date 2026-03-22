/**
 * @boardier-module ai/layout
 * @boardier-category AI
 * @boardier-description Layout algorithms for automatic element arrangement.
 * Provides grid, tree, flow (dagre-like), radial, and force-directed layouts.
 * All functions are pure — they take elements and return positioned elements
 * without mutating the originals.
 * @boardier-since 0.2.0
 */

import type { BoardierElement, Bounds, Vec2 } from '../core/types';
import { getElementBounds } from '../elements/base';

// ─── Types ────────────────────────────────────────────────────────

export interface LayoutOptions {
  /** Horizontal gap between elements. Default: 60. */
  gapX?: number;
  /** Vertical gap between elements. Default: 40. */
  gapY?: number;
  /** Starting position. Default: { x: 0, y: 0 }. */
  origin?: Vec2;
  /** For tree/flow: direction. Default: 'TB'. */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** For radial: starting radius. Default: 200. */
  radius?: number;
  /** For radial: radius increment per level. Default: 180. */
  radiusStep?: number;
  /** For grid: number of columns. Default: auto (sqrt of count). */
  columns?: number;
  /** Whether to center the layout around origin. Default: true. */
  center?: boolean;
}

interface LayoutResult {
  elements: BoardierElement[];
  bounds: Bounds;
}

// ─── Grid Layout ──────────────────────────────────────────────────

/**
 * Arrange elements in a uniform grid.
 * Elements keep their original sizes; only positions change.
 */
export function layoutGrid(elements: BoardierElement[], options: LayoutOptions = {}): LayoutResult {
  if (elements.length === 0) return { elements: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };

  const gapX = options.gapX ?? 60;
  const gapY = options.gapY ?? 40;
  const cols = options.columns ?? Math.ceil(Math.sqrt(elements.length));
  const origin = options.origin ?? { x: 0, y: 0 };

  // Find max width and height per column/row for uniform spacing
  const colWidths: number[] = new Array(cols).fill(0);
  const rowCount = Math.ceil(elements.length / cols);
  const rowHeights: number[] = new Array(rowCount).fill(0);

  for (let i = 0; i < elements.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const b = getElementBounds(elements[i]);
    colWidths[col] = Math.max(colWidths[col], b.width);
    rowHeights[row] = Math.max(rowHeights[row], b.height);
  }

  // Compute cumulative offsets
  const colStarts: number[] = [0];
  for (let c = 1; c < cols; c++) colStarts[c] = colStarts[c - 1] + colWidths[c - 1] + gapX;
  const rowStarts: number[] = [0];
  for (let r = 1; r < rowCount; r++) rowStarts[r] = rowStarts[r - 1] + rowHeights[r - 1] + gapY;

  const totalW = colStarts[cols - 1] + colWidths[cols - 1];
  const totalH = rowStarts[rowCount - 1] + rowHeights[rowCount - 1];
  const centerOffset = options.center !== false
    ? { x: -totalW / 2, y: -totalH / 2 }
    : { x: 0, y: 0 };

  const result: BoardierElement[] = [];
  for (let i = 0; i < elements.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const b = getElementBounds(elements[i]);
    // Center element within its cell
    const cellCenterX = colStarts[col] + colWidths[col] / 2;
    const cellCenterY = rowStarts[row] + rowHeights[row] / 2;
    result.push({
      ...elements[i],
      x: origin.x + centerOffset.x + cellCenterX - b.width / 2,
      y: origin.y + centerOffset.y + cellCenterY - b.height / 2,
    });
  }

  const bx = origin.x + centerOffset.x;
  const by = origin.y + centerOffset.y;
  return { elements: result, bounds: { x: bx, y: by, width: totalW, height: totalH } };
}

// ─── Tree Layout ──────────────────────────────────────────────────

interface TreeNode {
  id: string;
  children: TreeNode[];
  element: BoardierElement;
  x: number;
  y: number;
  width: number;
  height: number;
  subtreeWidth: number;
}

/**
 * Build an adjacency from arrow bindings.
 * Returns { parentToChildren, roots }.
 */
function buildTree(elements: BoardierElement[]): { roots: string[]; children: Record<string, string[]> } {
  const nodeIds = new Set(elements.filter(e => e.type !== 'arrow' && e.type !== 'line').map(e => e.id));
  const children: Record<string, string[]> = {};
  const hasParent = new Set<string>();

  for (const el of elements) {
    if (el.type === 'arrow') {
      const arrow = el as any;
      const from = arrow.startBindingId;
      const to = arrow.endBindingId;
      if (from && to && nodeIds.has(from) && nodeIds.has(to)) {
        if (!children[from]) children[from] = [];
        children[from].push(to);
        hasParent.add(to);
      }
    }
  }

  const roots = [...nodeIds].filter(id => !hasParent.has(id));
  return { roots, children };
}

/**
 * Arrange elements as a tree based on arrow bindings.
 * Nodes without connections are placed at root level.
 */
export function layoutTree(elements: BoardierElement[], options: LayoutOptions = {}): LayoutResult {
  if (elements.length === 0) return { elements: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };

  const gapX = options.gapX ?? 80;
  const gapY = options.gapY ?? 60;
  const dir = options.direction ?? 'TB';
  const origin = options.origin ?? { x: 0, y: 0 };
  const isVertical = dir === 'TB' || dir === 'BT';

  const elementMap = new Map<string, BoardierElement>();
  for (const el of elements) elementMap.set(el.id, el);

  const { roots, children } = buildTree(elements);
  const arrows = elements.filter(e => e.type === 'arrow');
  const nonArrows = elements.filter(e => e.type !== 'arrow' && e.type !== 'line');

  // Build tree nodes
  const visited = new Set<string>();
  function buildNode(id: string): TreeNode | null {
    if (visited.has(id)) return null;
    visited.add(id);
    const el = elementMap.get(id);
    if (!el) return null;
    const b = getElementBounds(el);
    const childNodes: TreeNode[] = [];
    for (const cid of (children[id] || [])) {
      const cn = buildNode(cid);
      if (cn) childNodes.push(cn);
    }
    const primary = isVertical ? b.width : b.height;
    const childrenSpan = childNodes.reduce(
      (sum, c) => sum + c.subtreeWidth + (sum > 0 ? (isVertical ? gapX : gapY) : 0), 0
    );
    return {
      id, element: el, children: childNodes,
      x: 0, y: 0, width: b.width, height: b.height,
      subtreeWidth: Math.max(primary, childrenSpan),
    };
  }

  const treeRoots: TreeNode[] = [];
  for (const rid of roots) {
    const n = buildNode(rid);
    if (n) treeRoots.push(n);
  }
  // Also add unvisited nodes as standalone roots
  for (const el of nonArrows) {
    if (!visited.has(el.id)) {
      const b = getElementBounds(el);
      treeRoots.push({
        id: el.id, element: el, children: [],
        x: 0, y: 0, width: b.width, height: b.height,
        subtreeWidth: isVertical ? b.width : b.height,
      });
    }
  }

  // Position tree nodes
  function positionNode(node: TreeNode, offsetPrimary: number, level: number): void {
    const depth = level * ((isVertical ? Math.max(node.height, 60) : Math.max(node.width, 120)) + (isVertical ? gapY : gapX));
    if (isVertical) {
      node.x = offsetPrimary + node.subtreeWidth / 2 - node.width / 2;
      node.y = depth;
    } else {
      node.x = depth;
      node.y = offsetPrimary + node.subtreeWidth / 2 - node.height / 2;
    }

    let childOffset = offsetPrimary + (node.subtreeWidth - node.children.reduce(
      (sum, c) => sum + c.subtreeWidth + (sum > 0 ? (isVertical ? gapX : gapY) : 0), 0
    )) / 2;

    for (const child of node.children) {
      positionNode(child, childOffset, level + 1);
      childOffset += child.subtreeWidth + (isVertical ? gapX : gapY);
    }
  }

  let offset = 0;
  for (const root of treeRoots) {
    positionNode(root, offset, 0);
    offset += root.subtreeWidth + (isVertical ? gapX : gapY);
  }

  // Flip for BT / RL
  if (dir === 'BT' || dir === 'RL') {
    let maxDepth = 0;
    function findMax(node: TreeNode) {
      const val = isVertical ? node.y + node.height : node.x + node.width;
      if (val > maxDepth) maxDepth = val;
      for (const c of node.children) findMax(c);
    }
    for (const r of treeRoots) findMax(r);
    function flip(node: TreeNode) {
      if (isVertical) node.y = maxDepth - node.y - node.height;
      else node.x = maxDepth - node.x - node.width;
      for (const c of node.children) flip(c);
    }
    for (const r of treeRoots) flip(r);
  }

  // Collect positioned elements
  const posMap = new Map<string, Vec2>();
  function collect(node: TreeNode) {
    posMap.set(node.id, { x: node.x, y: node.y });
    for (const c of node.children) collect(c);
  }
  for (const r of treeRoots) collect(r);

  // Center around origin
  let totalBounds = computeBounds(treeRoots);
  const centerOff = options.center !== false
    ? { x: origin.x - totalBounds.width / 2, y: origin.y - totalBounds.height / 2 }
    : { x: origin.x, y: origin.y };

  const result: BoardierElement[] = [];
  for (const el of nonArrows) {
    const pos = posMap.get(el.id);
    if (pos) {
      result.push({ ...el, x: pos.x + centerOff.x, y: pos.y + centerOff.y });
    } else {
      result.push(el);
    }
  }

  // Reposition arrows to connect their bound elements
  for (const a of arrows) {
    const arrow = a as any;
    const fromPos = posMap.get(arrow.startBindingId);
    const toPos = posMap.get(arrow.endBindingId);
    const fromEl = fromPos && elementMap.get(arrow.startBindingId);
    const toEl = toPos && elementMap.get(arrow.endBindingId);
    if (fromEl && toEl && fromPos && toPos) {
      const fromBounds = getElementBounds(fromEl);
      const toBounds = getElementBounds(toEl);
      const fx = fromPos.x + centerOff.x + fromBounds.width / 2;
      const fy = fromPos.y + centerOff.y + fromBounds.height / 2;
      const tx = toPos.x + centerOff.x + toBounds.width / 2;
      const ty = toPos.y + centerOff.y + toBounds.height / 2;

      // Compute arrow start/end on element edges
      const { sx, sy, ex, ey } = computeEdgePoints(
        fromPos.x + centerOff.x, fromPos.y + centerOff.y, fromBounds.width, fromBounds.height,
        toPos.x + centerOff.x, toPos.y + centerOff.y, toBounds.width, toBounds.height,
      );
      result.push({
        ...a,
        x: sx, y: sy, width: 0, height: 0,
        points: [{ x: 0, y: 0 }, { x: ex - sx, y: ey - sy }],
      } as any);
    } else {
      result.push(a);
    }
  }

  const finalBounds = computeResultBounds(result);
  return { elements: result, bounds: finalBounds };
}

// ─── Flow Layout (simplified dagre-like) ──────────────────────────

/**
 * Arrange elements in a flow/process layout. Nodes are layered by depth from roots.
 * This is a simplified layered graph layout — not a full dagre implementation.
 */
export function layoutFlow(elements: BoardierElement[], options: LayoutOptions = {}): LayoutResult {
  // layoutFlow delegates to layoutTree with flow-optimized defaults
  return layoutTree(elements, {
    gapX: options.gapX ?? 80,
    gapY: options.gapY ?? 60,
    direction: options.direction ?? 'TB',
    origin: options.origin,
    center: options.center,
    ...options,
  });
}

// ─── Radial Layout ────────────────────────────────────────────────

/**
 * Arrange elements in concentric circles radiating from a center node.
 * The first root is placed at center; children at increasing radii.
 */
export function layoutRadial(elements: BoardierElement[], options: LayoutOptions = {}): LayoutResult {
  if (elements.length === 0) return { elements: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };

  const origin = options.origin ?? { x: 0, y: 0 };
  const radiusBase = options.radius ?? 200;
  const radiusStep = options.radiusStep ?? 180;

  const elementMap = new Map<string, BoardierElement>();
  for (const el of elements) elementMap.set(el.id, el);

  const { roots, children } = buildTree(elements);
  const arrows = elements.filter(e => e.type === 'arrow');
  const nonArrows = elements.filter(e => e.type !== 'arrow' && e.type !== 'line');

  const posMap = new Map<string, Vec2>();
  const visited = new Set<string>();

  // BFS from roots, assigning levels
  interface LevelNode { id: string; parentId?: string; level: number; }
  const queue: LevelNode[] = [];
  const levels: LevelNode[][] = [];

  for (const rid of roots) {
    queue.push({ id: rid, level: 0 });
    visited.add(rid);
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (!levels[node.level]) levels[node.level] = [];
    levels[node.level].push(node);
    for (const cid of (children[node.id] || [])) {
      if (!visited.has(cid)) {
        visited.add(cid);
        queue.push({ id: cid, parentId: node.id, level: node.level + 1 });
      }
    }
  }

  // Add unvisited nodes to level 0
  for (const el of nonArrows) {
    if (!visited.has(el.id)) {
      if (!levels[0]) levels[0] = [];
      levels[0].push({ id: el.id, level: 0 });
    }
  }

  // Position level 0 at center
  if (levels[0] && levels[0].length === 1) {
    const el = elementMap.get(levels[0][0].id)!;
    const b = getElementBounds(el);
    posMap.set(el.id, { x: origin.x - b.width / 2, y: origin.y - b.height / 2 });
  } else if (levels[0]) {
    // Multiple roots: spread around center at a small radius
    const r = levels[0].length > 1 ? radiusBase / 2 : 0;
    for (let i = 0; i < levels[0].length; i++) {
      const el = elementMap.get(levels[0][i].id)!;
      const b = getElementBounds(el);
      const angle = (2 * Math.PI * i) / levels[0].length - Math.PI / 2;
      posMap.set(el.id, {
        x: origin.x + r * Math.cos(angle) - b.width / 2,
        y: origin.y + r * Math.sin(angle) - b.height / 2,
      });
    }
  }

  // Position deeper levels in concentric circles
  for (let lv = 1; lv < levels.length; lv++) {
    const r = radiusBase + (lv - 1) * radiusStep;
    const nodes = levels[lv];
    for (let i = 0; i < nodes.length; i++) {
      const el = elementMap.get(nodes[i].id);
      if (!el) continue;
      const b = getElementBounds(el);
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      posMap.set(el.id, {
        x: origin.x + r * Math.cos(angle) - b.width / 2,
        y: origin.y + r * Math.sin(angle) - b.height / 2,
      });
    }
  }

  // Build result
  const result: BoardierElement[] = [];
  for (const el of nonArrows) {
    const pos = posMap.get(el.id);
    result.push(pos ? { ...el, x: pos.x, y: pos.y } : el);
  }

  // Reposition arrows
  for (const a of arrows) {
    const arrow = a as any;
    const fromPos = posMap.get(arrow.startBindingId);
    const toPos = posMap.get(arrow.endBindingId);
    const fromEl = fromPos && elementMap.get(arrow.startBindingId);
    const toEl = toPos && elementMap.get(arrow.endBindingId);
    if (fromEl && toEl && fromPos && toPos) {
      const fb = getElementBounds(fromEl);
      const tb = getElementBounds(toEl);
      const { sx, sy, ex, ey } = computeEdgePoints(
        fromPos.x, fromPos.y, fb.width, fb.height,
        toPos.x, toPos.y, tb.width, tb.height,
      );
      result.push({ ...a, x: sx, y: sy, width: 0, height: 0, points: [{ x: 0, y: 0 }, { x: ex - sx, y: ey - sy }] } as any);
    } else {
      result.push(a);
    }
  }

  return { elements: result, bounds: computeResultBounds(result) };
}

// ─── Force-Directed Layout ────────────────────────────────────────

export interface ForceLayoutOptions extends LayoutOptions {
  /** Number of simulation iterations. Default: 50. */
  iterations?: number;
  /** Repulsion strength between nodes. Default: 1000. */
  repulsion?: number;
  /** Attraction strength of edges. Default: 0.01. */
  attraction?: number;
  /** Ideal edge length. Default: 200. */
  idealLength?: number;
}

/**
 * Simple force-directed layout. Nodes repel each other; connected nodes attract.
 */
export function layoutForce(elements: BoardierElement[], options: ForceLayoutOptions = {}): LayoutResult {
  if (elements.length === 0) return { elements: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };

  const origin = options.origin ?? { x: 0, y: 0 };
  const iterations = options.iterations ?? 50;
  const repulsion = options.repulsion ?? 1000;
  const attraction = options.attraction ?? 0.01;
  const idealLen = options.idealLength ?? 200;

  const arrows = elements.filter(e => e.type === 'arrow');
  const nodes = elements.filter(e => e.type !== 'arrow' && e.type !== 'line');
  const elementMap = new Map<string, BoardierElement>();
  for (const el of elements) elementMap.set(el.id, el);

  // Initialize positions in a circle
  const positions: Vec2[] = nodes.map((_, i) => ({
    x: origin.x + 300 * Math.cos(2 * Math.PI * i / nodes.length),
    y: origin.y + 300 * Math.sin(2 * Math.PI * i / nodes.length),
  }));

  // Build edge list
  const edges: [number, number][] = [];
  for (const a of arrows) {
    const arrow = a as any;
    const fi = nodes.findIndex(n => n.id === arrow.startBindingId);
    const ti = nodes.findIndex(n => n.id === arrow.endBindingId);
    if (fi >= 0 && ti >= 0) edges.push([fi, ti]);
  }

  // Simulate
  for (let iter = 0; iter < iterations; iter++) {
    const forces: Vec2[] = positions.map(() => ({ x: 0, y: 0 }));
    const cooling = 1 - iter / iterations; // Linear cooling

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[i].x += fx;
        forces[i].y += fy;
        forces[j].x -= fx;
        forces[j].y -= fy;
      }
    }

    // Attraction along edges
    for (const [fi, ti] of edges) {
      const dx = positions[ti].x - positions[fi].x;
      const dy = positions[ti].y - positions[fi].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = attraction * (dist - idealLen);
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      forces[fi].x += fx;
      forces[fi].y += fy;
      forces[ti].x -= fx;
      forces[ti].y -= fy;
    }

    // Apply forces with cooling
    const maxDisp = 50 * cooling;
    for (let i = 0; i < nodes.length; i++) {
      const fx = forces[i].x * cooling;
      const fy = forces[i].y * cooling;
      const disp = Math.sqrt(fx * fx + fy * fy);
      if (disp > 0) {
        const clamped = Math.min(disp, maxDisp);
        positions[i].x += (fx / disp) * clamped;
        positions[i].y += (fy / disp) * clamped;
      }
    }
  }

  // Build result
  const posMap = new Map<string, Vec2>();
  const result: BoardierElement[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const b = getElementBounds(nodes[i]);
    const pos = { x: positions[i].x - b.width / 2, y: positions[i].y - b.height / 2 };
    posMap.set(nodes[i].id, pos);
    result.push({ ...nodes[i], x: pos.x, y: pos.y });
  }

  // Reposition arrows
  for (const a of arrows) {
    const arrow = a as any;
    const fromPos = posMap.get(arrow.startBindingId);
    const toPos = posMap.get(arrow.endBindingId);
    const fromEl = fromPos && elementMap.get(arrow.startBindingId);
    const toEl = toPos && elementMap.get(arrow.endBindingId);
    if (fromEl && toEl && fromPos && toPos) {
      const fb = getElementBounds(fromEl);
      const tb = getElementBounds(toEl);
      const { sx, sy, ex, ey } = computeEdgePoints(
        fromPos.x, fromPos.y, fb.width, fb.height,
        toPos.x, toPos.y, tb.width, tb.height,
      );
      result.push({ ...a, x: sx, y: sy, width: 0, height: 0, points: [{ x: 0, y: 0 }, { x: ex - sx, y: ey - sy }] } as any);
    } else {
      result.push(a);
    }
  }

  return { elements: result, bounds: computeResultBounds(result) };
}

// ─── Helpers ──────────────────────────────────────────────────────

function computeBounds(roots: TreeNode[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function walk(node: TreeNode) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
    for (const c of node.children) walk(c);
  }
  for (const r of roots) walk(r);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function computeResultBounds(elements: BoardierElement[]): Bounds {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const all = elements.map(getElementBounds);
  const minX = Math.min(...all.map(b => b.x));
  const minY = Math.min(...all.map(b => b.y));
  const maxX = Math.max(...all.map(b => b.x + b.width));
  const maxY = Math.max(...all.map(b => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Compute arrow start/end points on the edges of two rectangles.
 * Points are on the edge of the source going to the edge of the target.
 */
function computeEdgePoints(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): { sx: number; sy: number; ex: number; ey: number } {
  const acx = ax + aw / 2, acy = ay + ah / 2;
  const bcx = bx + bw / 2, bcy = by + bh / 2;
  const dx = bcx - acx, dy = bcy - acy;

  if (dx === 0 && dy === 0) {
    return { sx: acx, sy: acy + ah / 2, ex: bcx, ey: bcy - bh / 2 };
  }

  const angle = Math.atan2(dy, dx);

  function edgePoint(cx: number, cy: number, w: number, h: number, a: number): Vec2 {
    const hw = w / 2, hh = h / 2;
    const tan = Math.tan(a);
    // Check right/left edge
    if (Math.abs(Math.cos(a)) * hh >= Math.abs(Math.sin(a)) * hw) {
      const signX = Math.cos(a) >= 0 ? 1 : -1;
      return { x: cx + signX * hw, y: cy + signX * hw * tan };
    }
    // Top/bottom edge
    const signY = Math.sin(a) >= 0 ? 1 : -1;
    return { x: cx + signY * hh / tan, y: cy + signY * hh };
  }

  const start = edgePoint(acx, acy, aw, ah, angle);
  const end = edgePoint(bcx, bcy, bw, bh, angle + Math.PI);

  return { sx: start.x, sy: start.y, ex: end.x, ey: end.y };
}
