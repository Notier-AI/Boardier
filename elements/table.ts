import type { TableElement, Vec2, Bounds } from '../core/types';
import { registerElement } from './base';
import { HANDWRITTEN_FONT } from '../utils/colors';

function render(ctx: CanvasRenderingContext2D, el: TableElement): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const x = el.x, y = el.y;

  // Compute cumulative positions
  const colX: number[] = [0];
  for (let c = 0; c < el.cols; c++) colX.push(colX[c] + el.colWidths[c]);
  const rowY: number[] = [0];
  for (let r = 0; r < el.rows; r++) rowY.push(rowY[r] + el.rowHeights[r]);

  const totalW = colX[colX.length - 1];
  const totalH = rowY[rowY.length - 1];

  // Background
  ctx.fillStyle = el.backgroundColor;
  ctx.fillRect(x, y, totalW, totalH);

  // Header row
  if (el.showHeader && el.rows > 0) {
    ctx.fillStyle = el.headerBackground || 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, totalW, el.rowHeights[0]);
  }

  // Cell text
  const fontFamily = el.roughness > 0 ? HANDWRITTEN_FONT : 'system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const padding = 6;

  for (let r = 0; r < el.rows; r++) {
    for (let c = 0; c < el.cols; c++) {
      const text = el.cells[r]?.[c] || '';
      if (!text) continue;
      const isHeader = el.showHeader && r === 0;
      ctx.font = `${isHeader ? 'bold ' : ''}13px ${fontFamily}`;
      ctx.fillStyle = el.strokeColor;
      const cx = x + colX[c] + padding;
      const cy = y + rowY[r] + el.rowHeights[r] / 2;
      const maxW = el.colWidths[c] - padding * 2;
      ctx.fillText(text, cx, cy, maxW);
    }
  }

  // Grid lines
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;

  // Outer border
  ctx.strokeRect(x, y, totalW, totalH);

  // Vertical lines
  for (let c = 1; c < el.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(x + colX[c], y);
    ctx.lineTo(x + colX[c], y + totalH);
    ctx.stroke();
  }

  // Horizontal lines
  for (let r = 1; r < el.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + rowY[r]);
    ctx.lineTo(x + totalW, y + rowY[r]);
    ctx.stroke();
  }

  ctx.restore();
}

function hitTest(el: TableElement, point: Vec2, _tolerance: number): boolean {
  const totalW = el.colWidths.reduce((a, b) => a + b, 0);
  const totalH = el.rowHeights.reduce((a, b) => a + b, 0);
  return point.x >= el.x && point.x <= el.x + totalW &&
         point.y >= el.y && point.y <= el.y + totalH;
}

function getBounds(el: TableElement): Bounds {
  const totalW = el.colWidths.reduce((a, b) => a + b, 0);
  const totalH = el.rowHeights.reduce((a, b) => a + b, 0);
  return { x: el.x, y: el.y, width: totalW, height: totalH };
}

registerElement('table', render as any, hitTest as any, getBounds as any);
