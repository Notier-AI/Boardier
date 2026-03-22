/**
 * @boardier-module themes/defaultTheme
 * @boardier-category Themes
 * @boardier-description Ships two built-in themes: `defaultTheme` (light) and `defaultDarkTheme`. Both are complete BoardierTheme objects that can be used directly or spread into custom themes. Also exports `roughUIStyle` and `cleanUIStyle` presets.
 * @boardier-since 0.1.0
 * @boardier-usage `<BoardierCanvas theme={defaultTheme} />` or `<BoardierCanvas theme={defaultDarkTheme} />`
 */
import type { BoardierTheme, BoardierUIStyle } from './types';

// ─── UI Style Presets ───────────────────────────────────────────────

/** Sketchy, organic, hand-drawn UI — the Boardier signature look. */
export const roughUIStyle: BoardierUIStyle = {
  panelBorderRadius: '4px 16px 6px 18px / 18px 4px 14px 6px',
  panelBorderWidth: 2,
  panelBorderStyle: 'solid',
  panelShadow: '3px 3px 0px rgba(0,0,0,0.08)',

  buttonBorderRadius: '2px 12px 4px 14px / 14px 3px 12px 4px',
  buttonBorderWidth: 1.5,
  buttonShadow: '1px 1px 0px rgba(0,0,0,0.06)',
  buttonHoverShadow: '2px 2px 0px rgba(0,0,0,0.1)',

  inputBorderRadius: '3px 10px 4px 12px / 12px 4px 10px 3px',
  inputBorderWidth: 1.5,

  swatchBorderRadius: '3px 8px 4px 10px / 10px 3px 8px 4px',
  swatchSize: 24,

  sliderTrackHeight: 4,
  sliderTrackRadius: '2px 8px 2px 8px / 8px 2px 8px 2px',
  sliderThumbSize: 14,

  tooltipBorderRadius: '3px 10px 4px 12px / 12px 4px 10px 3px',

  cardBorderRadius: '4px 12px 6px 14px / 14px 4px 12px 6px',

  menuBorderRadius: '4px 14px 6px 16px / 16px 4px 14px 6px',

  separatorHeight: 1,
  separatorBorderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
};

/** Clean, polished, rounded UI — modern SaaS look. */
export const cleanUIStyle: BoardierUIStyle = {
  panelBorderRadius: '10px',
  panelBorderWidth: 1,
  panelBorderStyle: 'solid',
  panelShadow: '0 2px 12px rgba(0,0,0,0.08)',

  buttonBorderRadius: '6px',
  buttonBorderWidth: 1,
  buttonShadow: 'none',
  buttonHoverShadow: '0 1px 3px rgba(0,0,0,0.08)',

  inputBorderRadius: '6px',
  inputBorderWidth: 1,

  swatchBorderRadius: '6px',
  swatchSize: 24,

  sliderTrackHeight: 4,
  sliderTrackRadius: '4px',
  sliderThumbSize: 14,

  tooltipBorderRadius: '6px',

  cardBorderRadius: '8px',

  menuBorderRadius: '8px',

  separatorHeight: 1,
  separatorBorderRadius: '0px',
};

// ─── Themes ─────────────────────────────────────────────────────────

/** Sketchy, hand-drawn default theme (light). */
export const defaultTheme: BoardierTheme = {
  canvasBackground: '#f8f9fa',
  gridColor: 'rgba(0,0,0,0.07)',
  selectionColor: '#4f83ff',
  selectionFill: 'rgba(79,131,255,0.08)',

  guideColor: '#f06595',
  guideDash: [4, 4],
  lassoColor: '#4f83ff',
  lassoFill: 'rgba(79,131,255,0.06)',

  panelBackground: '#ffffff',
  panelBorder: '#e2e2e2',
  panelText: '#1e1e1e',
  panelTextSecondary: '#868e96',
  panelHover: '#f1f3f5',
  panelActive: '#e7f0ff',

  tooltipBackground: '#1e1e1e',
  tooltipText: '#ffffff',
  tooltipBorder: '#333333',
  tooltipShadow: '0 2px 8px rgba(0,0,0,0.25)',

  fontFamily: 'system-ui, -apple-system, sans-serif',
  uiFontFamily: 'system-ui, -apple-system, sans-serif',

  borderRadius: 8,
  shadow: '3px 3px 0px rgba(0,0,0,0.08)',

  uiStyle: roughUIStyle,

  elementDefaults: {
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'none',
    strokeWidth: 2,
    roughness: 1.5,
    fontSize: 18,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};

/** Sketchy, hand-drawn default theme (dark). */
export const defaultDarkTheme: BoardierTheme = {
  canvasBackground: '#1a1b1e',
  gridColor: 'rgba(255,255,255,0.06)',
  selectionColor: '#4f83ff',
  selectionFill: 'rgba(79,131,255,0.12)',

  guideColor: '#f06595',
  guideDash: [4, 4],
  lassoColor: '#4f83ff',
  lassoFill: 'rgba(79,131,255,0.10)',

  panelBackground: '#25262b',
  panelBorder: '#373a40',
  panelText: '#e9ecef',
  panelTextSecondary: '#868e96',
  panelHover: '#2c2e33',
  panelActive: '#2b3a52',

  tooltipBackground: '#e9ecef',
  tooltipText: '#1e1e1e',
  tooltipBorder: '#ced4da',
  tooltipShadow: '0 2px 8px rgba(0,0,0,0.35)',

  fontFamily: 'system-ui, -apple-system, sans-serif',
  uiFontFamily: 'system-ui, -apple-system, sans-serif',

  borderRadius: 8,
  shadow: '3px 3px 0px rgba(0,0,0,0.2)',

  uiStyle: roughUIStyle,

  elementDefaults: {
    strokeColor: '#e9ecef',
    backgroundColor: 'transparent',
    fillStyle: 'none',
    strokeWidth: 2,
    roughness: 1.5,
    fontSize: 18,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};
