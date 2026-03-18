import type { ConnectorElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { HANDWRITTEN_FONT } from '../utils/colors';

/** Compute port position on an element bounds. */
function portPosition(b: Bounds, port: string): Vec2 {
  switch (port) {
    case 'top':    return { x: b.x + b.width / 2, y: b.y };
    case 'bottom': return { x: b.x + b.width / 2, y: b.y + b.height };
    case 'left':   return { x: b.x, y: b.y + b.height / 2 };
    case 'right':  return { x: b.x + b.width, y: b.y + b.height / 2 };
    default:       return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
}

function render(ctx: CanvasRenderingContext2D, el: ConnectorElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = el.pathPoints;
  if (pts.length < 2) { ctx.restore(); return; }

  ctx.beginPath();
  if (el.lineStyle === 'curved' && pts.length >= 3) {
    ctx.moveTo(el.x + pts[0].x, el.y + pts[0].y);
    // Use quadratic through midpoints for smooth curves
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (el.x + pts[i].x + el.x + pts[i + 1].x) / 2;
      const my = (el.y + pts[i].y + el.y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(el.x + pts[i].x, el.y + pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(el.x + last.x, el.y + last.y);
  } else {
    ctx.moveTo(el.x + pts[0].x, el.y + pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(el.x + pts[i].x, el.y + pts[i].y);
    }
  }
  ctx.stroke();

  // Arrowheads
  const drawArrowhead = (from: Vec2, to: Vec2) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 10;
    ctx.fillStyle = el.strokeColor;
    ctx.beginPath();
    ctx.moveTo(el.x + to.x, el.y + to.y);
    ctx.lineTo(el.x + to.x - size * Math.cos(angle - 0.4), el.y + to.y - size * Math.sin(angle - 0.4));
    ctx.lineTo(el.x + to.x - size * Math.cos(angle + 0.4), el.y + to.y - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  };

  if (el.arrowheadEnd && pts.length >= 2) {
    drawArrowhead(pts[pts.length - 2], pts[pts.length - 1]);
  }
  if (el.arrowheadStart && pts.length >= 2) {
    drawArrowhead(pts[1], pts[0]);
  }

  // Label
  if (el.label) {
    const mid = pts[Math.floor(pts.length / 2)];
    const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    ctx.font = `12px ${fontFamily}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(el.label, el.x + mid.x, el.y + mid.y - 4);
  }

  ctx.restore();
}

function hitTest(el: ConnectorElement, point: Vec2, tolerance: number): boolean {
  const pad = el.strokeWidth / 2 + tolerance + 4;
  for (let i = 1; i < el.pathPoints.length; i++) {
    const ax = el.x + el.pathPoints[i - 1].x;
    const ay = el.y + el.pathPoints[i - 1].y;
    const bx = el.x + el.pathPoints[i].x;
    const by = el.y + el.pathPoints[i].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    if (Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2) <= pad) return true;
  }
  return false;
}

function getBounds(el: ConnectorElement): Bounds {
  if (el.pathPoints.length === 0) return { x: el.x, y: el.y, width: el.width, height: el.height };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of el.pathPoints) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: el.x + minX, y: el.y + minY, width: maxX - minX, height: maxY - minY };
}

registerElement('connector', render as any, hitTest as any, getBounds as any);

export { portPosition };
