/** Complete visual theme for the Boardier engine. */
export interface BoardierTheme {
  // Canvas
  canvasBackground: string;
  gridColor: string;
  selectionColor: string;
  selectionFill: string;

  // Smart guides (alignment lines shown during drag)
  guideColor: string;
  guideDash: number[];

  // Lasso selection
  lassoColor: string;
  lassoFill: string;

  // UI panels
  panelBackground: string;
  panelBorder: string;
  panelText: string;
  panelTextSecondary: string;
  panelHover: string;
  panelActive: string;

  // Tooltips
  tooltipBackground: string;
  tooltipText: string;
  tooltipBorder: string;
  tooltipShadow: string;

  // Fonts
  fontFamily: string;
  uiFontFamily: string;

  // Misc
  borderRadius: number;
  shadow: string;

  // Element defaults (applied to newly created elements)
  elementDefaults: {
    strokeColor: string;
    backgroundColor: string;
    fillStyle: 'none' | 'solid';
    strokeWidth: number;
    fontSize: number;
    fontFamily: string;
  };
}
