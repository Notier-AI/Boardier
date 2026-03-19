import type { RectangleElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { rotatePoint } from '../utils/math';
import { roughRect, roughFillRect } from '../utils/roughDraw';
import { HANDWRITTEN_FONT } from '../utils/colors';
import { applyStrokeStyle, drawPatternFill } from '../utils/renderHelpers';

function render(ctx: CanvasRenderingContext2D, el: RectangleElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(el.rotation);

  const hw = el.width / 2;
  const hh = el.height / 2;

  // Determine effective border radius
  const radii = el.borderRadii || (el.borderRadius > 0 ? [el.borderRadius, el.borderRadius, el.borderRadius, el.borderRadius] : null);

  if (el.roughness > 0) {
    // Hand-drawn style
    if (el.fillStyle !== 'none' && el.backgroundColor !== 'transparent') {
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.backgroundColor;
        if (radii) {
          ctx.beginPath();
          ctx.roundRect(-hw, -hh, el.width, el.height, radii);
          ctx.fill();
        } else {
          roughFillRect(ctx, -hw, -hh, el.width, el.height, el.seed, el.roughness);
        }
      } else {
        ctx.beginPath();
        if (radii) ctx.roundRect(-hw, -hh, el.width, el.height, radii);
        else ctx.rect(-hw, -hh, el.width, el.height);
        drawPatternFill(ctx, el.fillStyle, el.backgroundColor, -hw, -hh, el.width, el.height, el.seed);
      }
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);
      if (radii) {
        // Rough strokes on rounded rect: draw with jitter offset lines along rounded path
        const r = el.roughness;
        const seed = el.seed;
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          const jx = (i: number) => (Math.sin(seed * 13.7 + i * 7.3 + pass * 31) * r * 1.2);
          const jy = (i: number) => (Math.cos(seed * 9.1 + i * 11.1 + pass * 17) * r * 1.2);
          // approximate rounded-rect with jittered points
          const [tl, tr, br, bl] = radii;
          // Top edge (after TL corner to before TR corner)
          ctx.moveTo(-hw + tl + jx(0), -hh + jy(0));
          ctx.lineTo(hw - tr + jx(1), -hh + jy(1));
          // TR corner
          ctx.arcTo(hw + jx(2), -hh + jy(2), hw + jx(3), -hh + tr + jy(3), tr);
          // Right edge
          ctx.lineTo(hw + jx(4), hh - br + jy(4));
          // BR corner
          ctx.arcTo(hw + jx(5), hh + jy(5), hw - br + jx(6), hh + jy(6), br);
          // Bottom edge
          ctx.lineTo(-hw + bl + jx(7), hh + jy(7));
          // BL corner
          ctx.arcTo(-hw + jx(8), hh + jy(8), -hw + jx(9), hh - bl + jy(9), bl);
          // Left edge
          ctx.lineTo(-hw + jx(10), -hh + tl + jy(10));
          // TL corner
          ctx.arcTo(-hw + jx(11), -hh + jy(11), -hw + tl + jx(12), -hh + jy(12), tl);
          ctx.stroke();
        }
      } else {
        roughRect(ctx, -hw, -hh, el.width, el.height, el.seed, el.roughness);
      }
    }
  } else {
    // Clean style
    ctx.beginPath();
    if (radii) {
      ctx.roundRect(-hw, -hh, el.width, el.height, radii);
    } else {
      ctx.rect(-hw, -hh, el.width, el.height);
    }
    if (el.fillStyle !== 'none' && el.backgroundColor !== 'transparent') {
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      } else {
        drawPatternFill(ctx, el.fillStyle, el.backgroundColor, -hw, -hh, el.width, el.height, el.seed);
      }
    }
    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      applyStrokeStyle(ctx, el.strokeStyle, el.strokeWidth);
      // Re-draw the path for stroke (clip may have consumed it)
      ctx.beginPath();
      if (radii) {
        ctx.roundRect(-hw, -hh, el.width, el.height, radii);
      } else {
        ctx.rect(-hw, -hh, el.width, el.height);
      }
      ctx.stroke();
    }
  }

  // Reset line dash
  ctx.setLineDash([]);

  // Render label text centered inside
  if (el.label) {
    const labelFont = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
    ctx.font = `${Math.min(el.width * 0.8, 18)}px ${labelFont}`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.label, 0, 0, el.width * 0.9);
  }
  ctx.restore();
}

function hitTest(el: RectangleElement, point: Vec2, tolerance: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = rotatePoint(point, { x: cx, y: cy }, -el.rotation);
  const pad = el.strokeWidth / 2 + tolerance;
  return (
    local.x >= el.x - pad &&
    local.x <= el.x + el.width + pad &&
    local.y >= el.y - pad &&
    local.y <= el.y + el.height + pad
  );
}

function getBounds(el: RectangleElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

registerElement('rectangle', render as any, hitTest as any, getBounds as any);
