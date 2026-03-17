import type { BoardierTheme } from './types';

/** Clean, modern default theme (light). */
export const defaultTheme: BoardierTheme = {
  canvasBackground: '#f8f9fa',
  gridColor: 'rgba(0,0,0,0.07)',
  selectionColor: '#4f83ff',
  selectionFill: 'rgba(79,131,255,0.08)',

  panelBackground: '#ffffff',
  panelBorder: '#e2e2e2',
  panelText: '#1e1e1e',
  panelTextSecondary: '#868e96',
  panelHover: '#f1f3f5',
  panelActive: '#e7f0ff',

  fontFamily: 'system-ui, -apple-system, sans-serif',
  uiFontFamily: 'system-ui, -apple-system, sans-serif',

  borderRadius: 8,
  shadow: '0 2px 12px rgba(0,0,0,0.08)',

  elementDefaults: {
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'none',
    strokeWidth: 2,
    fontSize: 18,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};

/** Clean, modern default theme (dark). */
export const defaultDarkTheme: BoardierTheme = {
  canvasBackground: '#1a1b1e',
  gridColor: 'rgba(255,255,255,0.06)',
  selectionColor: '#4f83ff',
  selectionFill: 'rgba(79,131,255,0.12)',

  panelBackground: '#25262b',
  panelBorder: '#373a40',
  panelText: '#e9ecef',
  panelTextSecondary: '#868e96',
  panelHover: '#2c2e33',
  panelActive: '#2b3a52',

  fontFamily: 'system-ui, -apple-system, sans-serif',
  uiFontFamily: 'system-ui, -apple-system, sans-serif',

  borderRadius: 8,
  shadow: '0 2px 12px rgba(0,0,0,0.25)',

  elementDefaults: {
    strokeColor: '#e9ecef',
    backgroundColor: 'transparent',
    fillStyle: 'none',
    strokeWidth: 2,
    fontSize: 18,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};
