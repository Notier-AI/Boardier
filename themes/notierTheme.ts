import type { BoardierTheme } from './types';

/**
 * Create a BoardierTheme that matches a Notier app theme.
 * @param style  - 'elegant' | 'whiteboard' | 'playful'
 * @param dark   - dark-mode flag
 */
export function createNotierTheme(
  style: 'elegant' | 'whiteboard' | 'playful',
  dark: boolean,
): BoardierTheme {
  const isWhiteboard = style === 'whiteboard';
  const isElegant = style === 'elegant';

  const fontFamily = isWhiteboard
    ? '"Permanent Marker", "Caveat", cursive'
    : isElegant
      ? '"Inter", "Segoe UI", system-ui, sans-serif'
      : 'system-ui, -apple-system, sans-serif';

  if (dark) {
    return {
      canvasBackground: isElegant ? '#0f1117' : '#1a1b1e',
      gridColor: 'rgba(255,255,255,0.05)',
      selectionColor: '#6366f1',
      selectionFill: 'rgba(99,102,241,0.12)',

      guideColor: '#f06595',
      guideDash: [4, 4],
      lassoColor: '#6366f1',
      lassoFill: 'rgba(99,102,241,0.10)',

      panelBackground: isElegant ? '#1a1b26' : '#25262b',
      panelBorder: isElegant ? '#2a2b3d' : '#373a40',
      panelText: '#e9ecef',
      panelTextSecondary: '#868e96',
      panelHover: isElegant ? '#22243a' : '#2c2e33',
      panelActive: '#312e81',

      fontFamily,
      uiFontFamily: isWhiteboard ? fontFamily : 'system-ui, sans-serif',

      borderRadius: isElegant ? 12 : isWhiteboard ? 14 : 8,
      shadow: isElegant
        ? '0 4px 20px rgba(0,0,0,0.3)'
        : isWhiteboard
          ? '4px 4px 0 0 rgba(255,255,255,0.05)'
          : '0 2px 12px rgba(0,0,0,0.25)',

      elementDefaults: {
        strokeColor: '#e9ecef',
        backgroundColor: 'transparent',
        fillStyle: 'none',
        strokeWidth: isWhiteboard ? 3 : 2,
        fontSize: isWhiteboard ? 20 : 18,
        fontFamily,
      },
    };
  }

  // Light mode
  return {
    canvasBackground: isElegant ? '#fafafa' : isWhiteboard ? '#fffdf7' : '#f8f9fa',
    gridColor: isWhiteboard ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.07)',
    selectionColor: '#6366f1',
    selectionFill: 'rgba(99,102,241,0.08)',

    guideColor: '#f06595',
    guideDash: [4, 4],
    lassoColor: '#6366f1',
    lassoFill: 'rgba(99,102,241,0.06)',

    panelBackground: '#ffffff',
    panelBorder: isWhiteboard ? '#1e1e1e' : isElegant ? '#e5e7eb' : '#e2e2e2',
    panelText: '#1e1e1e',
    panelTextSecondary: '#6b7280',
    panelHover: isElegant ? '#f5f5f5' : '#f1f3f5',
    panelActive: '#eef2ff',

    fontFamily,
    uiFontFamily: isWhiteboard ? fontFamily : 'system-ui, sans-serif',

    borderRadius: isElegant ? 12 : isWhiteboard ? 14 : 8,
    shadow: isElegant
      ? '0 4px 20px rgba(0,0,0,0.06)'
      : isWhiteboard
        ? '4px 4px 0 0 rgba(0,0,0,1)'
        : '0 2px 12px rgba(0,0,0,0.08)',

    elementDefaults: {
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'none',
      strokeWidth: isWhiteboard ? 3 : 2,
      fontSize: isWhiteboard ? 20 : 18,
      fontFamily,
    },
  };
}
