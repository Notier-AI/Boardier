import type { FreehandElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { distanceToPolyline } from '../utils/math';

function render(ctx: CanvasRenderingContext2D, el: FreehandElement): void {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hasPressure = el.pressures && el.pressures.length >= el.points.length;

  if (hasPressure) {
    // Variable-width stroke: draw each segment individually with pressure-scaled width
    const pressures = el.pressures!;
    const baseWidth = el.strokeWidth;

    for (let i = 1; i < el.points.length; i++) {
      const p0 = el.points[i - 1];
      const p1 = el.points[i];
      // Average pressure between adjacent points
      const pressure = (pressures[i - 1] + pressures[i]) / 2;
      const width = Math.max(0.5, baseWidth * pressure * 2);

      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(el.x + p0.x, el.y + p0.y);
      ctx.lineTo(el.x + p1.x, el.y + p1.y);
      ctx.stroke();
    }
  } else {
    // Uniform stroke width (original path)
    ctx.lineWidth = el.strokeWidth;
    ctx.beginPath();
    ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);

    if (el.points.length === 2) {
      ctx.lineTo(el.x + el.points[1].x, el.y + el.points[1].y);
    } else {
      for (let i = 1; i < el.points.length - 1; i++) {
        const curr = el.points[i];
        const next = el.points[i + 1];
        const mx = (curr.x + next.x) / 2;
        const my = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(el.x + curr.x, el.y + curr.y, el.x + mx, el.y + my);
      }
      const last = el.points[el.points.length - 1];
      ctx.lineTo(el.x + last.x, el.y + last.y);
    }

    ctx.stroke();
  }

  ctx.restore();
}

function hitTest(el: FreehandElement, point: Vec2, tolerance: number): boolean {
  if (el.points.length < 2) return false;
  const abs = el.points.map(p => ({ x: p.x + el.x, y: p.y + el.y }));
  return distanceToPolyline(point, abs) <= el.strokeWidth / 2 + tolerance + 2;
}

function getBounds(el: FreehandElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('freehand', render as any, hitTest as any, getBounds as any);
