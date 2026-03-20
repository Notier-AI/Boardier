/**
 * @boardier-module elements/arrow
 * @boardier-category Elements
 * @boardier-description Renderer, hit-tester, and bounds-getter for arrows. Extends line rendering with configurable arrowheads at start and/or end. Supports bézier curves and element binding.
 * @boardier-since 0.1.0
 */
import type { ArrowElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline, distanceToBezier } from '../utils/math';
import { roughPolyline, roughBezier, mulberry32, roughLineTo } from '../utils/roughDraw';
import { applyStrokeStyle } from '../utils/renderHelpers';

const ARROWHEAD_LEN = 14;
const ARROWHEAD_ANGLE = Math.PI / 7;

function drawArrowhead(ctx: CanvasRenderingContext2D, tip: Vec2, angle: number, seed: number, roughness: number) {
  const la = { x: tip.x - ARROWHEAD_LEN * Math.cos(angle - ARROWHEAD_ANGLE), y: tip.y - ARROWHEAD_LEN * Math.sin(angle - ARROWHEAD_ANGLE) };
  const lb = { x: tip.x - ARROWHEAD_LEN * Math.cos(angle + ARROWHEAD_ANGLE), y: tip.y - ARROWHEAD_LEN * Math.sin(angle + ARROWHEAD_ANGLE) };

  if (roughness > 0) {
    const rng = mulberry32(seed + 99);
    ctx.beginPath();
    ctx.moveTo(la.x, la.y);
    roughLineTo(ctx, la.x, la.y, tip.x, tip.y, rng, roughness);
    roughLineTo(ctx, tip.x, tip.y, lb.x, lb.y, rng, roughness);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(la.x, la.y);
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(lb.x, lb.y);
    ctx.stroke();
  }
}

/** Get tangent angle at endpoint of a quadratic bézier. */
function bezierEndAngle(p0: Vec2, cp: Vec2, p1: Vec2, atEnd: boolean): number {
  if (atEnd) return Math.atan2(p1.y - cp.y, p1.x - cp.x);
  return Math.atan2(cp.y - p0.y, cp.x - p0.x);
}

function render(ctx: CanvasRenderingContext2D, el: ArrowElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);

  const p0: Vec2 = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
  const p1: Vec2 = { x: el.x + el.points[1].x, y: el.y + el.points[1].y };

  if (el.controlPoint) {
    const cp: Vec2 = { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y };
    if (el.roughness > 0) {
      roughBezier(ctx, p0, cp, p1, el.seed, el.roughness);
    } else {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y);
      ctx.stroke();
    }
    // Arrowheads use tangent at bezier endpoints
    if (el.arrowheadEnd) drawArrowhead(ctx, p1, bezierEndAngle(p0, cp, p1, true), el.seed, el.roughness);
    if (el.arrowheadStart) drawArrowhead(ctx, p0, bezierEndAngle(p0, cp, p1, false) + Math.PI, el.seed + 50, el.roughness);
  } else {
    if (el.roughness > 0) {
      roughPolyline(ctx, [p0, p1], el.seed, el.roughness);
    } else {
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    if (el.arrowheadEnd) {
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      drawArrowhead(ctx, p1, angle, el.seed, el.roughness);
    }
    if (el.arrowheadStart) {
      const angle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
      drawArrowhead(ctx, p0, angle, el.seed + 50, el.roughness);
    }
  }

  ctx.restore();
}

function hitTest(el: ArrowElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const p0: Vec2 = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
  const p1: Vec2 = { x: el.x + el.points[1].x, y: el.y + el.points[1].y };
  const tol = el.strokeWidth / 2 + tolerance + 4;

  if (el.controlPoint) {
    const cp: Vec2 = { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y };
    return distanceToBezier(point, p0, cp, p1) <= tol;
  }
  return distanceToPolyline(point, [p0, p1]) <= tol;
}

function getBounds(el: ArrowElement): Bounds {
  if (el.points.length === 0) return { x: el.x, y: el.y, width: 0, height: 0 };
  const allPts = el.points.map(p => ({ x: el.x + p.x, y: el.y + p.y }));
  if (el.controlPoint) allPts.push({ x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX - ARROWHEAD_LEN,
    y: minY - ARROWHEAD_LEN,
    width: Math.max(maxX - minX, 1) + ARROWHEAD_LEN * 2,
    height: Math.max(maxY - minY, 1) + ARROWHEAD_LEN * 2,
  };
}

registerElement('arrow', render as any, hitTest as any, getBounds as any);
