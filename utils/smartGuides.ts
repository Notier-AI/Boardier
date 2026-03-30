/**
 * @boardier-module utils/smartGuides
 * @boardier-category Utilities
 * @boardier-description Enhanced smart guide engine for alignment, equal-spacing, and dimension-matching snap guides. Includes a pattern-learning system that tracks the user's preferred spacings, sizes, and alignments to offer increasingly relevant suggestions. All computation is pure — rendering is handled separately by the Renderer.
 * @boardier-since 0.5.1
 */
import type { Vec2, Bounds } from '../core/types';

// ─── Types ──────────────────────────────────────────────────────────

/** Guide type discriminant. */
export type SmartGuideType = 'align' | 'spacing' | 'size';

/** A single smart guide line (horizontal or vertical). */
export interface SmartGuide {
  type: SmartGuideType;
  axis: 'x' | 'y';
  /** World coordinate of the guide line. */
  position: number;
  /** Start of the line on the perpendicular axis. */
  from: number;
  /** End of the line on the perpendicular axis. */
  to: number;
  /** Optional distance label (e.g. "40px"). */
  label?: string;
  /** Where to draw the label (world coords). */
  labelPosition?: Vec2;
}

/** A gap indicator between two elements (for equal-spacing guides). */
export interface SpacingGap {
  axis: 'x' | 'y';
  /** Position on the gap's axis (center of the gap). */
  center: number;
  /** Start of the gap on the perpendicular axis. */
  perpStart: number;
  /** End of the gap on the perpendicular axis. */
  perpEnd: number;
  /** Gap size in world units. */
  size: number;
  /** Label text. */
  label: string;
}

/** Result from the smart guide computation. */
export interface SmartGuideResult {
  guides: SmartGuide[];
  gaps: SpacingGap[];
  snapDx: number;
  snapDy: number;
}

// ─── Reference Edge Cache ───────────────────────────────────────────

/** Pre-computed edges from non-moving elements. */
export interface RefEdgeCache {
  /** Sorted x-edges (left, center, right of each element). */
  xEdges: { value: number; elementIdx: number; type: 'left' | 'center' | 'right' }[];
  /** Sorted y-edges (top, center, bottom of each element). */
  yEdges: { value: number; elementIdx: number; type: 'top' | 'center' | 'bottom' }[];
  /** Bounds of every reference element. */
  bounds: Bounds[];
  /** Global extents. */
  xMin: number; xMax: number; yMin: number; yMax: number;
}

export function buildRefEdgeCache(refBounds: Bounds[]): RefEdgeCache {
  const xEdges: RefEdgeCache['xEdges'] = [];
  const yEdges: RefEdgeCache['yEdges'] = [];
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

  for (let i = 0; i < refBounds.length; i++) {
    const b = refBounds[i];
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    xEdges.push(
      { value: b.x, elementIdx: i, type: 'left' },
      { value: cx, elementIdx: i, type: 'center' },
      { value: b.x + b.width, elementIdx: i, type: 'right' },
    );
    yEdges.push(
      { value: b.y, elementIdx: i, type: 'top' },
      { value: cy, elementIdx: i, type: 'center' },
      { value: b.y + b.height, elementIdx: i, type: 'bottom' },
    );
    if (b.x < xMin) xMin = b.x;
    if (b.x + b.width > xMax) xMax = b.x + b.width;
    if (b.y < yMin) yMin = b.y;
    if (b.y + b.height > yMax) yMax = b.y + b.height;
  }

  xEdges.sort((a, b) => a.value - b.value);
  yEdges.sort((a, b) => a.value - b.value);

  return { xEdges, yEdges, bounds: refBounds, xMin, xMax, yMin, yMax };
}

// ─── Alignment Guides ───────────────────────────────────────────────

function computeAlignGuides(
  movingBounds: Bounds[],
  cache: RefEdgeCache,
  threshold: number,
): { guides: SmartGuide[]; snapDx: number; snapDy: number } {
  const guides: SmartGuide[] = [];
  let bestSnapX = Infinity;
  let bestSnapY = Infinity;
  let snapDx = 0;
  let snapDy = 0;

  for (const b of movingBounds) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const movX = [b.x, cx, b.x + b.width];
    const movY = [b.y, cy, b.y + b.height];

    // X-axis alignment (vertical guide lines)
    for (const mx of movX) {
      for (const edge of cache.xEdges) {
        const diff = mx - edge.value;
        const absDiff = Math.abs(diff);
        if (absDiff < threshold) {
          const refB = cache.bounds[edge.elementIdx];
          const lo = Math.min(b.y, refB.y) - 15;
          const hi = Math.max(b.y + b.height, refB.y + refB.height) + 15;
          guides.push({
            type: 'align',
            axis: 'x',
            position: edge.value,
            from: lo,
            to: hi,
          });
          if (absDiff < bestSnapX) {
            bestSnapX = absDiff;
            snapDx = -diff;
          }
        }
      }
    }

    // Y-axis alignment (horizontal guide lines)
    for (const my of movY) {
      for (const edge of cache.yEdges) {
        const diff = my - edge.value;
        const absDiff = Math.abs(diff);
        if (absDiff < threshold) {
          const refB = cache.bounds[edge.elementIdx];
          const lo = Math.min(b.x, refB.x) - 15;
          const hi = Math.max(b.x + b.width, refB.x + refB.width) + 15;
          guides.push({
            type: 'align',
            axis: 'y',
            position: edge.value,
            from: lo,
            to: hi,
          });
          if (absDiff < bestSnapY) {
            bestSnapY = absDiff;
            snapDy = -diff;
          }
        }
      }
    }
  }

  return { guides, snapDx, snapDy };
}

// ─── Equal Spacing Guides ───────────────────────────────────────────

interface SortedElement {
  bounds: Bounds;
  center: number;
}

/**
 * Detect equal-spacing opportunities on a single axis.
 * When the moving element can be placed so that the gap between it and
 * its nearest neighbours matches an existing gap between those neighbours,
 * we emit spacing guides + gap indicators.
 */
function computeSpacingGuides(
  movingBounds: Bounds[],
  cache: RefEdgeCache,
  threshold: number,
  patternTracker: PatternTracker | null,
): { guides: SmartGuide[]; gaps: SpacingGap[]; snapDx: number; snapDy: number } {
  const guides: SmartGuide[] = [];
  const gapIndicators: SpacingGap[] = [];
  let snapDx = 0;
  let snapDy = 0;
  let bestSnapX = Infinity;
  let bestSnapY = Infinity;

  if (cache.bounds.length < 2) return { guides, gaps: gapIndicators, snapDx, snapDy };

  // For each axis, sort reference elements by position, find gaps, check if moving element can match
  for (const axis of ['x', 'y'] as const) {
    const sorted: SortedElement[] = cache.bounds
      .map(b => ({
        bounds: b,
        center: axis === 'x' ? b.x + b.width / 2 : b.y + b.height / 2,
      }))
      .sort((a, b) => a.center - b.center);

    // Collect existing gaps between consecutive reference elements
    const existingGaps: { from: Bounds; to: Bounds; gap: number }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromB = sorted[i].bounds;
      const toB = sorted[i + 1].bounds;
      const gap = axis === 'x'
        ? toB.x - (fromB.x + fromB.width)
        : toB.y - (fromB.y + fromB.height);
      if (gap > 2) { // Only consider positive, non-trivial gaps
        existingGaps.push({ from: fromB, to: toB, gap });
      }
    }

    // Check learned pattern gaps if available
    const patternGaps = patternTracker ? patternTracker.getCommonSpacings(axis) : [];

    for (const mb of movingBounds) {
      const mStart = axis === 'x' ? mb.x : mb.y;
      const mEnd = axis === 'x' ? mb.x + mb.width : mb.y + mb.height;
      const mSize = mEnd - mStart;

      // Check if placing the moving element creates equal gaps with neighbours
      for (const eg of existingGaps) {
        const refGap = eg.gap;

        // Try placing moving element BEFORE eg.from with same gap
        const beforePos = axis === 'x'
          ? eg.from.x - refGap - mSize
          : eg.from.y - refGap - mSize;
        const beforeDiff = mStart - beforePos;
        const beforeAbs = Math.abs(beforeDiff);

        if (beforeAbs < threshold) {
          if (axis === 'x' && beforeAbs < bestSnapX) {
            bestSnapX = beforeAbs;
            snapDx = -beforeDiff;
          } else if (axis === 'y' && beforeAbs < bestSnapY) {
            bestSnapY = beforeAbs;
            snapDy = -beforeDiff;
          }
          addSpacingGuidesAndGaps(guides, gapIndicators, axis, mb, eg.from, eg.to, refGap, 'before');
        }

        // Try placing moving element AFTER eg.to with same gap
        const afterPos = axis === 'x'
          ? eg.to.x + eg.to.width + refGap
          : eg.to.y + eg.to.height + refGap;
        const afterDiff = mStart - afterPos;
        const afterAbs = Math.abs(afterDiff);

        if (afterAbs < threshold) {
          if (axis === 'x' && afterAbs < bestSnapX) {
            bestSnapX = afterAbs;
            snapDx = -afterDiff;
          } else if (axis === 'y' && afterAbs < bestSnapY) {
            bestSnapY = afterAbs;
            snapDy = -afterDiff;
          }
          addSpacingGuidesAndGaps(guides, gapIndicators, axis, mb, eg.from, eg.to, refGap, 'after');
        }

        // Try placing moving element BETWEEN eg.from and eg.to at equal spacing
        if (refGap > mSize + 4) {
          const halfGap = (refGap - mSize) / 2;
          const betweenPos = axis === 'x'
            ? eg.from.x + eg.from.width + halfGap
            : eg.from.y + eg.from.height + halfGap;
          const betweenDiff = mStart - betweenPos;
          const betweenAbs = Math.abs(betweenDiff);

          if (betweenAbs < threshold) {
            if (axis === 'x' && betweenAbs < bestSnapX) {
              bestSnapX = betweenAbs;
              snapDx = -betweenDiff;
            } else if (axis === 'y' && betweenAbs < bestSnapY) {
              bestSnapY = betweenAbs;
              snapDy = -betweenDiff;
            }
            // Gap indicators on both sides
            const gapSize = halfGap;
            const perpMin = axis === 'x'
              ? Math.min(mb.y, eg.from.y, eg.to.y) + 5
              : Math.min(mb.x, eg.from.x, eg.to.x) + 5;
            const perpMax = axis === 'x'
              ? Math.max(mb.y + mb.height, eg.from.y + eg.from.height, eg.to.y + eg.to.height) - 5
              : Math.max(mb.x + mb.width, eg.from.x + eg.from.width, eg.to.x + eg.to.width) - 5;
            const perpCenter = (perpMin + perpMax) / 2;

            if (axis === 'x') {
              gapIndicators.push({
                axis: 'x',
                center: eg.from.x + eg.from.width + gapSize / 2,
                perpStart: perpCenter - 4,
                perpEnd: perpCenter + 4,
                size: gapSize,
                label: `${Math.round(gapSize)}`,
              });
              gapIndicators.push({
                axis: 'x',
                center: betweenPos + mSize + gapSize / 2,
                perpStart: perpCenter - 4,
                perpEnd: perpCenter + 4,
                size: gapSize,
                label: `${Math.round(gapSize)}`,
              });
            } else {
              gapIndicators.push({
                axis: 'y',
                center: eg.from.y + eg.from.height + gapSize / 2,
                perpStart: perpCenter - 4,
                perpEnd: perpCenter + 4,
                size: gapSize,
                label: `${Math.round(gapSize)}`,
              });
              gapIndicators.push({
                axis: 'y',
                center: betweenPos + mSize + gapSize / 2,
                perpStart: perpCenter - 4,
                perpEnd: perpCenter + 4,
                size: gapSize,
                label: `${Math.round(gapSize)}`,
              });
            }
          }
        }
      }

      // Check learned pattern spacings
      for (const pg of patternGaps) {
        // Find nearest reference elements on each side
        for (const refB of cache.bounds) {
          const refEnd = axis === 'x' ? refB.x + refB.width : refB.y + refB.height;
          const refStart = axis === 'x' ? refB.x : refB.y;

          // Moving element after ref
          const afterPos = refEnd + pg;
          const afterDiff = mStart - afterPos;
          if (Math.abs(afterDiff) < threshold) {
            if (axis === 'x' && Math.abs(afterDiff) < bestSnapX) {
              bestSnapX = Math.abs(afterDiff);
              snapDx = -afterDiff;
            } else if (axis === 'y' && Math.abs(afterDiff) < bestSnapY) {
              bestSnapY = Math.abs(afterDiff);
              snapDy = -afterDiff;
            }
            const perpMin = axis === 'x'
              ? Math.min(mb.y, refB.y) : Math.min(mb.x, refB.x);
            const perpMax = axis === 'x'
              ? Math.max(mb.y + mb.height, refB.y + refB.height) : Math.max(mb.x + mb.width, refB.x + refB.width);
            gapIndicators.push({
              axis,
              center: refEnd + pg / 2,
              perpStart: (perpMin + perpMax) / 2 - 4,
              perpEnd: (perpMin + perpMax) / 2 + 4,
              size: pg,
              label: `${Math.round(pg)}`,
            });
          }

          // Moving element before ref
          const beforePos = refStart - pg - (axis === 'x' ? mb.width : mb.height);
          const beforeDiff = mStart - beforePos;
          if (Math.abs(beforeDiff) < threshold) {
            if (axis === 'x' && Math.abs(beforeDiff) < bestSnapX) {
              bestSnapX = Math.abs(beforeDiff);
              snapDx = -beforeDiff;
            } else if (axis === 'y' && Math.abs(beforeDiff) < bestSnapY) {
              bestSnapY = Math.abs(beforeDiff);
              snapDy = -beforeDiff;
            }
            const perpMin = axis === 'x'
              ? Math.min(mb.y, refB.y) : Math.min(mb.x, refB.x);
            const perpMax = axis === 'x'
              ? Math.max(mb.y + mb.height, refB.y + refB.height) : Math.max(mb.x + mb.width, refB.x + refB.width);
            gapIndicators.push({
              axis,
              center: refStart - pg / 2,
              perpStart: (perpMin + perpMax) / 2 - 4,
              perpEnd: (perpMin + perpMax) / 2 + 4,
              size: pg,
              label: `${Math.round(pg)}`,
            });
          }
        }
      }
    }
  }

  return { guides, gaps: gapIndicators, snapDx, snapDy };
}

function addSpacingGuidesAndGaps(
  guides: SmartGuide[],
  gaps: SpacingGap[],
  axis: 'x' | 'y',
  moving: Bounds,
  fromB: Bounds,
  toB: Bounds,
  gap: number,
  placement: 'before' | 'after',
): void {
  const perpMin = axis === 'x'
    ? Math.min(moving.y, fromB.y, toB.y) + 5
    : Math.min(moving.x, fromB.x, toB.x) + 5;
  const perpMax = axis === 'x'
    ? Math.max(moving.y + moving.height, fromB.y + fromB.height, toB.y + toB.height) - 5
    : Math.max(moving.x + moving.width, fromB.x + fromB.width, toB.x + toB.width) - 5;
  const perpCenter = (perpMin + perpMax) / 2;
  const label = `${Math.round(gap)}`;

  // The existing gap between fromB and toB
  if (axis === 'x') {
    const existCenter = fromB.x + fromB.width + gap / 2;
    gaps.push({ axis, center: existCenter, perpStart: perpCenter - 4, perpEnd: perpCenter + 4, size: gap, label });

    if (placement === 'before') {
      const newCenter = fromB.x - gap / 2;
      gaps.push({ axis, center: newCenter, perpStart: perpCenter - 4, perpEnd: perpCenter + 4, size: gap, label });
    } else {
      const newCenter = toB.x + toB.width + gap / 2;
      gaps.push({ axis, center: newCenter, perpStart: perpCenter - 4, perpEnd: perpCenter + 4, size: gap, label });
    }
  } else {
    const existCenter = fromB.y + fromB.height + gap / 2;
    gaps.push({ axis, center: existCenter, perpStart: perpCenter - 4, perpEnd: perpCenter + 4, size: gap, label });

    if (placement === 'before') {
      const newCenter = fromB.y - gap / 2;
      gaps.push({ axis, center: newCenter, perpStart: perpCenter - 4, perpEnd: perpCenter + 4, size: gap, label });
    } else {
      const newCenter = toB.y + toB.height + gap / 2;
      gaps.push({ axis, center: newCenter, perpStart: perpCenter - 4, perpEnd: perpCenter + 4, size: gap, label });
    }
  }
}

// ─── Size-Match Guides ──────────────────────────────────────────────

function computeSizeGuides(
  movingBounds: Bounds[],
  cache: RefEdgeCache,
  threshold: number,
): SmartGuide[] {
  const guides: SmartGuide[] = [];

  for (const mb of movingBounds) {
    for (const refB of cache.bounds) {
      // Width match
      if (Math.abs(mb.width - refB.width) < threshold) {
        const yPos = Math.max(mb.y + mb.height, refB.y + refB.height) + 8;
        // Guide under moving element
        guides.push({
          type: 'size',
          axis: 'y',
          position: yPos,
          from: mb.x,
          to: mb.x + mb.width,
          label: `W ${Math.round(mb.width)}`,
          labelPosition: { x: mb.x + mb.width / 2, y: yPos + 4 },
        });
        // Guide under reference element
        guides.push({
          type: 'size',
          axis: 'y',
          position: yPos,
          from: refB.x,
          to: refB.x + refB.width,
          label: `W ${Math.round(refB.width)}`,
          labelPosition: { x: refB.x + refB.width / 2, y: yPos + 4 },
        });
      }

      // Height match
      if (Math.abs(mb.height - refB.height) < threshold) {
        const xPos = Math.max(mb.x + mb.width, refB.x + refB.width) + 8;
        guides.push({
          type: 'size',
          axis: 'x',
          position: xPos,
          from: mb.y,
          to: mb.y + mb.height,
          label: `H ${Math.round(mb.height)}`,
          labelPosition: { x: xPos + 4, y: mb.y + mb.height / 2 },
        });
        guides.push({
          type: 'size',
          axis: 'x',
          position: xPos,
          from: refB.y,
          to: refB.y + refB.height,
          label: `H ${Math.round(refB.height)}`,
          labelPosition: { x: xPos + 4, y: refB.y + refB.height / 2 },
        });
      }
    }
  }

  return guides;
}

// ─── Distance Labels ────────────────────────────────────────────────

function addDistanceLabels(guides: SmartGuide[]): void {
  for (const g of guides) {
    if (g.type !== 'align' || g.label) continue;
    const len = Math.abs(g.to - g.from);
    if (len > 30) {
      const mid = (g.from + g.to) / 2;
      if (g.axis === 'x') {
        g.labelPosition = { x: g.position, y: mid };
      } else {
        g.labelPosition = { x: mid, y: g.position };
      }
    }
  }
}

// ─── Deduplication ──────────────────────────────────────────────────

function dedupeGuides(guides: SmartGuide[]): SmartGuide[] {
  const seen = new Set<string>();
  const result: SmartGuide[] = [];
  for (const g of guides) {
    const key = `${g.type}:${g.axis}:${Math.round(g.position * 2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(g);
    }
  }
  return result;
}

function dedupeGaps(gaps: SpacingGap[]): SpacingGap[] {
  const seen = new Set<string>();
  const result: SpacingGap[] = [];
  for (const g of gaps) {
    const key = `${g.axis}:${Math.round(g.center * 2)}:${Math.round(g.size)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(g);
    }
  }
  return result;
}

// ─── Pattern Tracker ────────────────────────────────────────────────

/** Maximum number of recent observations to keep per category. */
const MAX_HISTORY = 50;
/** Minimum occurrences to be considered a "common" pattern. */
const MIN_FREQ = 2;
/** Tolerance when bucketing similar values together. */
const BUCKET_TOLERANCE = 3;

/**
 * Learns the user's spacing and sizing patterns from their actions.
 * Tracks recently used gaps between element edges and common element dimensions.
 */
export class PatternTracker {
  private spacingsX: number[] = [];
  private spacingsY: number[] = [];
  private widths: number[] = [];
  private heights: number[] = [];

  /** Record a finalized element placement for pattern extraction. */
  recordPlacement(bounds: Bounds, neighbourBounds: Bounds[]): void {
    for (const nb of neighbourBounds) {
      // Horizontal gap: moving element right of neighbour
      const gapRight = bounds.x - (nb.x + nb.width);
      if (gapRight > 2 && gapRight < 500) this.pushCapped(this.spacingsX, gapRight);
      // Horizontal gap: moving element left of neighbour
      const gapLeft = nb.x - (bounds.x + bounds.width);
      if (gapLeft > 2 && gapLeft < 500) this.pushCapped(this.spacingsX, gapLeft);
      // Vertical gap
      const gapBelow = bounds.y - (nb.y + nb.height);
      if (gapBelow > 2 && gapBelow < 500) this.pushCapped(this.spacingsY, gapBelow);
      const gapAbove = nb.y - (bounds.y + bounds.height);
      if (gapAbove > 2 && gapAbove < 500) this.pushCapped(this.spacingsY, gapAbove);
    }

    if (bounds.width > 5) this.pushCapped(this.widths, bounds.width);
    if (bounds.height > 5) this.pushCapped(this.heights, bounds.height);
  }

  /** Get common spacings the user tends to use on a given axis. */
  getCommonSpacings(axis: 'x' | 'y'): number[] {
    const data = axis === 'x' ? this.spacingsX : this.spacingsY;
    return this.findCommonValues(data);
  }

  /** Get common widths the user tends to create. */
  getCommonWidths(): number[] {
    return this.findCommonValues(this.widths);
  }

  /** Get common heights the user tends to create. */
  getCommonHeights(): number[] {
    return this.findCommonValues(this.heights);
  }

  private pushCapped(arr: number[], val: number): void {
    arr.push(val);
    if (arr.length > MAX_HISTORY) arr.shift();
  }

  private findCommonValues(data: number[]): number[] {
    if (data.length < MIN_FREQ) return [];

    // Bucket values within tolerance
    const buckets: { center: number; count: number }[] = [];
    for (const v of data) {
      let placed = false;
      for (const bucket of buckets) {
        if (Math.abs(v - bucket.center) < BUCKET_TOLERANCE) {
          bucket.center = (bucket.center * bucket.count + v) / (bucket.count + 1);
          bucket.count++;
          placed = true;
          break;
        }
      }
      if (!placed) buckets.push({ center: v, count: 1 });
    }

    return buckets
      .filter(b => b.count >= MIN_FREQ)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(b => Math.round(b.center));
  }
}

// ─── Main API ───────────────────────────────────────────────────────

/**
 * Compute smart alignment guides, equal-spacing indicators, and dimension-match
 * guides for a set of moving bounds against a prebuilt reference cache.
 *
 * @param movingBounds — Bounds of all elements currently being moved/resized/created.
 * @param cache — Pre-built reference edges from `buildRefEdgeCache()`.
 * @param zoom — Current viewport zoom (snap threshold is zoom-responsive).
 * @param patternTracker — Optional learned-pattern tracker for smarter snap suggestions.
 */
export function computeSmartGuides(
  movingBounds: Bounds[],
  cache: RefEdgeCache,
  zoom: number,
  patternTracker?: PatternTracker | null,
): SmartGuideResult {
  const threshold = 5 / zoom;
  const sizeThreshold = 3 / zoom;

  // 1. Alignment guides (edge + center snapping)
  const align = computeAlignGuides(movingBounds, cache, threshold);

  // 2. Equal-spacing guides
  const spacing = computeSpacingGuides(movingBounds, cache, threshold, patternTracker ?? null);

  // 3. Size-match guides
  const sizeGuides = computeSizeGuides(movingBounds, cache, sizeThreshold);

  // Merge snap deltas — alignment takes priority, then spacing
  let snapDx = align.snapDx;
  let snapDy = align.snapDy;
  if (snapDx === 0 && spacing.snapDx !== 0) snapDx = spacing.snapDx;
  if (snapDy === 0 && spacing.snapDy !== 0) snapDy = spacing.snapDy;

  // Combine and deduplicate guides
  const allGuides = dedupeGuides([...align.guides, ...spacing.guides, ...sizeGuides]);
  const allGaps = dedupeGaps(spacing.gaps);

  // Add distance labels to alignment guides
  addDistanceLabels(allGuides);

  return { guides: allGuides, gaps: allGaps, snapDx, snapDy };
}
