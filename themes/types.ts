/**
 * @boardier-module themes/types
 * @boardier-category Themes
 * @boardier-description The complete BoardierTheme interface. Every visual aspect of the engine — canvas background, grid, selection, panels, tooltips, fonts, and element defaults — is configurable through a single theme object. The `uiStyle` section provides full CSS-level control over UI component shapes.
 * @boardier-since 0.1.0
 * @boardier-usage `const myTheme: BoardierTheme = { ...defaultTheme, canvasBackground: '#1e1e1e' };`
 */

/**
 * @boardier-type BoardierUIStyle
 * @boardier-description CSS-level control over the look and shape of every UI component.
 * Developers can make the UI look sketchy/organic, perfectly clean, or anything in between.
 * All `borderRadius` values accept any valid CSS border-radius string.
 * @boardier-since 0.2.0
 */
export interface BoardierUIStyle {
  // ── Panel (the main floating containers: property panel, toolbar, zoom, etc.) ──
  /** CSS border-radius for panel containers. Use organic values for a hand-drawn feel.
   * @example '8px' — clean
   * @example '2px 12px 4px 16px / 16px 3px 14px 4px' — organic */
  panelBorderRadius: string;
  /** Panel border width in px */
  panelBorderWidth: number;
  /** Panel border style */
  panelBorderStyle: string;
  /** Panel box-shadow */
  panelShadow: string;

  // ── Buttons ──
  /** CSS border-radius for buttons / pills / toggles */
  buttonBorderRadius: string;
  /** Button border width in px */
  buttonBorderWidth: number;
  /** Button box-shadow (idle state) */
  buttonShadow: string;
  /** Button box-shadow on hover */
  buttonHoverShadow: string;

  // ── Inputs (text fields, number inputs) ──
  /** CSS border-radius for text/number inputs */
  inputBorderRadius: string;
  /** Input border width in px */
  inputBorderWidth: number;

  // ── Color swatches ──
  /** CSS border-radius for color swatch circles */
  swatchBorderRadius: string;
  /** Swatch size in px */
  swatchSize: number;

  // ── Sliders ──
  /** Slider track height in px */
  sliderTrackHeight: number;
  /** Slider track border-radius */
  sliderTrackRadius: string;
  /** Slider thumb diameter in px */
  sliderThumbSize: number;

  // ── Tooltips ──
  /** CSS border-radius for tooltips */
  tooltipBorderRadius: string;

  // ── Section cards (grouped areas inside panels) ──
  /** CSS border-radius for section card groupings */
  cardBorderRadius: string;

  // ── Context menu ──
  /** CSS border-radius for context menus */
  menuBorderRadius: string;

  // ── Separator lines ──
  /** Separator thickness in px */
  separatorHeight: number;
  /** CSS border-radius for separator lines */
  separatorBorderRadius: string;
}

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
  /** @deprecated Use uiStyle.panelBorderRadius instead for full control. Kept for backwards compat. */
  borderRadius: number;
  shadow: string;

  /**
   * Full CSS-level control over UI component shapes and sizing.
   * @boardier-since 0.2.0
   */
  uiStyle: BoardierUIStyle;

  // Element defaults (applied to newly created elements)
  elementDefaults: {
    strokeColor: string;
    backgroundColor: string;
    fillStyle: 'none' | 'solid';
    strokeWidth: number;
    roughness: number;
    fontSize: number;
    fontFamily: string;
  };
}
