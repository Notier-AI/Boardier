/**
 * @boardier-module utils/math
 * @boardier-category Utilities
 * @boardier-description Pure math helpers used throughout the engine: distance, midpoint, rotation, bounds testing, segment/polyline/bézier distance, path simplification, and polygon point-in-polygon testing. All functions are stateless and tree-shakeable.
 * @boardier-since 0.1.0
 */
import type { Vec2, Bounds } from '../core/types';

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function rotatePoint(point: Vec2, center: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: cos * dx - sin * dy + center.x,
    y: sin * dx + cos * dy + center.y,
  };
}

export function boundsContainsPoint(bounds: Bounds, point: Vec2): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

/** Distance from a point to a line segment (a→b). */
export function distanceToSegment(point: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Distance from a point to the closest segment of a polyline. */
export function distanceToPolyline(point: Vec2, points: Vec2[]): number {
  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    minDist = Math.min(minDist, distanceToSegment(point, points[i], points[i + 1]));
  }
  return minDist;
}

/** Sample a quadratic bézier (p0→cp→p1) into n segments and return min distance. */
export function distanceToBezier(point: Vec2, p0: Vec2, cp: Vec2, p1: Vec2, samples = 32): number {
  let minDist = Infinity;
  let prev = p0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const it = 1 - t;
    const cur: Vec2 = {
      x: it * it * p0.x + 2 * it * t * cp.x + t * t * p1.x,
      y: it * it * p0.y + 2 * it * t * cp.y + t * t * p1.y,
    };
    minDist = Math.min(minDist, distanceToSegment(point, prev, cur));
    prev = cur;
  }
  return minDist;
}

/** Ramer-Douglas-Peucker path simplification. */
export function simplifyPath(points: Vec2[], epsilon: number): Vec2[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = distanceToSegment(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPath(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

/** Ensure positive width/height (flip origin if user dragged backwards). */
export function normalizeBounds(x: number, y: number, w: number, h: number): Bounds {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    width: Math.abs(w),
    height: Math.abs(h),
  };
}

export function boundsCenter(b: Bounds): Vec2 {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Ray-casting point-in-polygon test. Returns true if point is inside the polygon. */
export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
