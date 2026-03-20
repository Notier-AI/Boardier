/**
 * @boardier-module utils/colors
 * @boardier-category Utilities
 * @boardier-description Colour palettes, stroke widths, font sizes, and font families used as defaults throughout the UI and element creation. All are exported as `readonly` arrays.
 * @boardier-since 0.1.0
 */
/** Stroke / border color palette. */
export const STROKE_COLORS = [
  '#1e1e1e',
  '#e03131',
  '#2f9e44',
  '#1971c2',
  '#f08c00',
  '#6741d9',
  '#0c8599',
  '#e8590c',
  '#d6336c',
  '#868e96',
] as const;

/** Fill / background color palette. */
export const FILL_COLORS = [
  'transparent',
  '#ffc9c9',
  '#b2f2bb',
  '#a5d8ff',
  '#ffe8cc',
  '#d0bfff',
  '#99e9f2',
  '#ffd8a8',
  '#fcc2d7',
  '#dee2e6',
] as const;

/** Canvas background options (used in theme). */
export const CANVAS_BACKGROUNDS = [
  '#ffffff',
  '#f8f9fa',
  '#fff3bf',
  '#d3f9d8',
  '#d0ebff',
  '#e5dbff',
  '#1e1e1e',
  '#212529',
] as const;

/** Stroke width options. */
export const STROKE_WIDTHS = [1, 2, 4] as const;

/** Font size options for text elements. */
export const FONT_SIZES = [14, 18, 24, 32] as const;

/** Font family options. */
export const FONT_FAMILIES = [
  { value: 'system-ui, -apple-system, sans-serif', label: 'Sans' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
  { value: '"Courier New", Courier, monospace', label: 'Mono' },
] as const;

/** Handwritten font used when roughness > 0. */
export const HANDWRITTEN_FONT = '"Segoe Print", "Bradley Hand", Chilanka, TSCu_Comic, casual, cursive';
