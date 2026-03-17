/**
 * Lightweight hand-drawn rendering helpers.
 * Uses a seeded PRNG so jitter is stable across renders for the same element.
 * No external dependencies.
 */

// Mulberry32 PRNG — fast, deterministic, good distribution
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function jitter(rng: () => number, amplitude: number): number {
  return (rng() - 0.5) * 2 * amplitude;
}

/**
 * Draw a hand-drawn line between two points.
 * Does NOT call beginPath/stroke — caller manages path context.
 */
export function roughLineTo(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  rng: () => number, roughness: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const amp = roughness * Math.min(2.5, len * 0.02 + 0.5);
  const segments = Math.max(2, Math.ceil(len / 25));

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t + (i < segments ? jitter(rng, amp) : 0);
    const py = y1 + dy * t + (i < segments ? jitter(rng, amp) : 0);
    ctx.lineTo(px, py);
  }
}

/**
 * Draw a hand-drawn rectangle. Strokes the path (does not fill).
 */
export function roughRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  seed: number, roughness: number,
): void {
  const rng = mulberry32(seed);
  const amp = roughness * 1.5;
  const jx = () => jitter(rng, amp);
  const jy = () => jitter(rng, amp);

  ctx.beginPath();
  ctx.moveTo(x + jx(), y + jy());
  roughLineTo(ctx, x, y, x + w, y, rng, roughness);
  roughLineTo(ctx, x + w, y, x + w, y + h, rng, roughness);
  roughLineTo(ctx, x + w, y + h, x, y + h, rng, roughness);
  roughLineTo(ctx, x, y + h, x, y, rng, roughness);
  ctx.stroke();
}

/**
 * Draw a hand-drawn ellipse. Strokes the path (does not fill).
 */
export function roughEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  seed: number, roughness: number,
): void {
  const rng = mulberry32(seed);
  const steps = Math.max(16, Math.ceil(Math.max(rx, ry) * 0.8));
  const amp = roughness * 1.2;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const r_jx = i < steps ? jitter(rng, amp) : 0;
    const r_jy = i < steps ? jitter(rng, amp) : 0;
    const px = cx + Math.cos(angle) * rx + r_jx;
    const py = cy + Math.sin(angle) * ry + r_jy;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

/**
 * Draw a hand-drawn diamond. Strokes the path (does not fill).
 */
export function roughDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, hw: number, hh: number,
  seed: number, roughness: number,
): void {
  const rng = mulberry32(seed);

  ctx.beginPath();
  ctx.moveTo(cx, cy - hh + jitter(rng, roughness));
  roughLineTo(ctx, cx, cy - hh, cx + hw, cy, rng, roughness);
  roughLineTo(ctx, cx + hw, cy, cx, cy + hh, rng, roughness);
  roughLineTo(ctx, cx, cy + hh, cx - hw, cy, rng, roughness);
  roughLineTo(ctx, cx - hw, cy, cx, cy - hh, rng, roughness);
  ctx.closePath();
  ctx.stroke();
}

/**
 * Fill a hand-drawn shape by filling the current path.
 * Call after roughRect/roughEllipse/roughDiamond (which leave a path).
 * Since we re-use the path from stroke, call fill BEFORE stroke,
 * or re-trace a simpler fill path.
 */
export function roughFillRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  seed: number, roughness: number,
): void {
  // Use a slightly inset clean rect for the fill to avoid bleeding
  const rng = mulberry32(seed + 1);
  const amp = roughness * 1.5;

  ctx.beginPath();
  ctx.moveTo(x + jitter(rng, amp * 0.3), y + jitter(rng, amp * 0.3));
  roughLineTo(ctx, x, y, x + w, y, rng, roughness * 0.5);
  roughLineTo(ctx, x + w, y, x + w, y + h, rng, roughness * 0.5);
  roughLineTo(ctx, x + w, y + h, x, y + h, rng, roughness * 0.5);
  roughLineTo(ctx, x, y + h, x, y, rng, roughness * 0.5);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a hand-drawn line (polyline) through multiple points.
 */
export function roughPolyline(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  seed: number, roughness: number,
): void {
  if (points.length < 2) return;
  const rng = mulberry32(seed);

  ctx.beginPath();
  ctx.moveTo(
    points[0].x + jitter(rng, roughness * 0.5),
    points[0].y + jitter(rng, roughness * 0.5),
  );
  for (let i = 0; i < points.length - 1; i++) {
    roughLineTo(ctx, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, rng, roughness);
  }
  ctx.stroke();
}
