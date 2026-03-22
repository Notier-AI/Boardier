/**
 * @boardier-module ui/PropertyPanel
 * @boardier-category UI
 * @boardier-description Side panel that displays and edits properties of selected elements: stroke color, fill color/style, stroke width/style, opacity, roughness, font, text alignment, border radius, and element-specific fields.
 * @boardier-since 0.1.0
 */
import React, { useRef, useState } from 'react';
import type { BoardierElement, FillStyle, StrokeStyle } from '../core/types';
import type { BoardierTheme, BoardierUIStyle } from '../themes/types';
import { STROKE_COLORS, FILL_COLORS, FONT_SIZES, FONT_FAMILIES, HANDWRITTEN_FONT } from '../utils/colors';

interface PropertyPanelProps {
  elements: BoardierElement[];
  onUpdate: (updates: Partial<BoardierElement>) => void;
  onDelete: () => void;
  onCopy?: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
  theme: BoardierTheme;
}

/* ── SVG icons (16×16) ──────────────────────────────── */

const iconFillSolid = (
  <svg width={16} height={16} viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" /></svg>
);
const iconFillHachure = (
  <svg width={16} height={16} viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="4" y1="14" x2="14" y2="4" /><line x1="2" y1="11" x2="11" y2="2" /><line x1="2" y1="7" x2="7" y2="2" />
  </svg>
);
const iconFillCross = (
  <svg width={16} height={16} viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.2" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="4" y1="14" x2="14" y2="4" /><line x1="2" y1="11" x2="11" y2="2" /><line x1="2" y1="7" x2="7" y2="2" />
    <line x1="2" y1="4" x2="12" y2="14" /><line x1="5" y1="2" x2="14" y2="11" /><line x1="9" y1="2" x2="14" y2="7" />
  </svg>
);
const iconFillDots = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" strokeWidth="1.2">
    <rect x="2" y="2" width="12" height="12" rx="2" fill="none" />
    <circle cx="5" cy="5" r="1.2" stroke="none" /><circle cx="11" cy="5" r="1.2" stroke="none" />
    <circle cx="8" cy="8" r="1.2" stroke="none" /><circle cx="5" cy="11" r="1.2" stroke="none" />
    <circle cx="11" cy="11" r="1.2" stroke="none" />
  </svg>
);
const iconFillZigzag = (
  <svg width={16} height={16} viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <polyline points="3,6 6,9 9,6 12,9" /><polyline points="3,10 6,13 9,10 12,13" />
  </svg>
);
const iconFillZigzagLine = (
  <svg width={16} height={16} viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.2" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <polyline points="3,4 5,6 7,4 9,6 11,4 13,6" /><polyline points="3,8 5,10 7,8 9,10 11,8 13,10" />
  </svg>
);

const FILL_STYLE_OPTS: { v: FillStyle; icon: React.ReactNode; tip: string }[] = [
  { v: 'solid', icon: iconFillSolid, tip: 'Solid' },
  { v: 'hachure', icon: iconFillHachure, tip: 'Hachure' },
  { v: 'cross-hatch', icon: iconFillCross, tip: 'Cross-hatch' },
  { v: 'dots', icon: iconFillDots, tip: 'Dots' },
  { v: 'zigzag', icon: iconFillZigzag, tip: 'Zigzag' },
  { v: 'zigzag-line', icon: iconFillZigzagLine, tip: 'Zigzag-line' },
];

const STROKE_STYLE_OPTS: { v: StrokeStyle; label: string; svg: React.ReactNode }[] = [
  { v: 'solid', label: 'Solid', svg: <svg width={28} height={6} viewBox="0 0 28 6"><line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="2" /></svg> },
  { v: 'dashed', label: 'Dashed', svg: <svg width={28} height={6} viewBox="0 0 28 6"><line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" /></svg> },
  { v: 'dotted', label: 'Dotted', svg: <svg width={28} height={6} viewBox="0 0 28 6"><line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5 3" strokeLinecap="round" /></svg> },
];

/* ── slider CSS (injected once) ─────────────────────── */
const SLIDER_CLASS = 'bdier-slider';
const NUM_INPUT_CLASS = 'bdier-numinput';
const getSliderCSS = (ui: BoardierUIStyle) => `
.${SLIDER_CLASS}{-webkit-appearance:none;appearance:none;height:${ui.sliderTrackHeight}px;border-radius:${ui.sliderTrackRadius};outline:none;cursor:pointer;width:100%}
.${SLIDER_CLASS}::-webkit-slider-thumb{-webkit-appearance:none;width:${ui.sliderThumbSize}px;height:${ui.sliderThumbSize}px;border-radius:50%;border:2px solid var(--bdier-accent);background:#fff;cursor:pointer;margin-top:${-(ui.sliderThumbSize - ui.sliderTrackHeight) / 2}px;box-shadow:0 1px 3px rgba(0,0,0,0.12)}
.${SLIDER_CLASS}::-moz-range-thumb{width:${ui.sliderThumbSize}px;height:${ui.sliderThumbSize}px;border-radius:50%;border:2px solid var(--bdier-accent);background:#fff;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.12)}
.${SLIDER_CLASS}::-webkit-slider-runnable-track{height:${ui.sliderTrackHeight}px;border-radius:${ui.sliderTrackRadius}}
.${SLIDER_CLASS}::-moz-range-track{height:${ui.sliderTrackHeight}px;border-radius:${ui.sliderTrackRadius}}
.${NUM_INPUT_CLASS}{width:44px;height:26px;text-align:center;font-size:11px;font-weight:600;border-radius:${ui.inputBorderRadius};outline:none;padding:0;font-family:inherit;-moz-appearance:textfield}
.${NUM_INPUT_CLASS}::-webkit-inner-spin-button,.${NUM_INPUT_CLASS}::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.${NUM_INPUT_CLASS}:focus{border-color:var(--bdier-accent) !important}
`;

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ elements, onUpdate, onDelete, onCopy, onDuplicate, onClose, theme }) => {
  if (elements.length === 0) return null;
  const strokePickerRef = useRef<HTMLInputElement>(null);
  const fillPickerRef = useRef<HTMLInputElement>(null);
  const [perCorner, setPerCorner] = useState(false);

  const first = elements[0];
  const hasText = elements.some(e => e.type === 'text');
  const hasLabel = elements.some(e => 'label' in e);
  const hasTextOrLabel = hasText || hasLabel;
  const isNotLine = elements.every(e => e.type !== 'line' && e.type !== 'arrow' && e.type !== 'freehand');
  const isRect = elements.some(e => e.type === 'rectangle');
  const isEmbed = elements.some(e => e.type === 'embed');

  const trackBg = theme.panelBorder;
  const ui = theme.uiStyle;

  /* ── re-usable style helpers ──────────────────────── */
  const SWATCH_SIZE = ui.swatchSize;

  const swatch = (color: string, active: boolean, onClick: () => void) => (
    <button key={color} onClick={onClick} title={color} style={{
      width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: ui.swatchBorderRadius,
      border: active ? `2px solid ${theme.selectionColor}` : `${ui.inputBorderWidth}px solid ${theme.panelBorder}`,
      background: color === 'transparent'
        ? `repeating-conic-gradient(${theme.panelBorder} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
        : color,
      cursor: 'pointer', padding: 0, flexShrink: 0,
      boxShadow: active ? `0 0 0 2px ${theme.panelBackground}, 0 0 0 3.5px ${theme.selectionColor}` : 'none',
      transition: 'transform 0.1s, box-shadow 0.12s',
    }} />
  );

  const customPicker = (currentColor: string, onPick: (c: string) => void, ref: React.RefObject<HTMLInputElement | null>) => (
    <span style={{ position: 'relative', display: 'inline-block', width: SWATCH_SIZE, height: SWATCH_SIZE }}>
      <input ref={ref} type="color" value={currentColor === 'transparent' ? '#000000' : currentColor}
        onChange={e => onPick(e.target.value)} tabIndex={-1}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }}
      />
      <span style={{ width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: ui.swatchBorderRadius, border: `${ui.inputBorderWidth}px dashed ${theme.panelBorder}`, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.panelTextSecondary, pointerEvents: 'none' }}>
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
    </span>
  );

  /** Section card with subtle background grouping — our own flavor, not Excalidraw's flat list */
  const card = (children: React.ReactNode) => (
    <div style={{
      padding: '10px 10px', borderRadius: ui.cardBorderRadius,
      background: theme.panelHover, display: 'flex', flexDirection: 'column', gap: 8, width: '100%',
    }}>{children}</div>
  );

  const sectionTitle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: theme.panelTextSecondary,
    letterSpacing: 0.6, textTransform: 'uppercase', lineHeight: 1,
  };

  const pill = (active: boolean, onClick: () => void, child: React.ReactNode, title?: string) => (
    <button onClick={onClick} title={title} style={{
      height: 30, minWidth: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
      border: `${ui.buttonBorderWidth}px solid ${active ? theme.selectionColor : 'transparent'}`,
      borderRadius: ui.buttonBorderRadius, background: active ? theme.panelActive : 'transparent',
      cursor: 'pointer', color: active ? theme.selectionColor : theme.panelText,
      transition: 'all 0.1s ease',
    }}>{child}</button>
  );

  const numInput = (value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <input className={NUM_INPUT_CLASS} type="number" min={min} max={max} step={step}
        value={step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= min && v <= max) onChange(v); }}
        style={{ border: `${ui.inputBorderWidth}px solid ${theme.panelBorder}`, background: theme.panelBackground, color: theme.panelText }}
      />
      {unit && <span style={{ fontSize: 9, color: theme.panelTextSecondary, fontWeight: 600 }}>{unit}</span>}
    </div>
  );

  const slider = (value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <input className={SLIDER_CLASS} type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))}
      style={{ background: `linear-gradient(90deg, ${theme.selectionColor} ${((value - min) / (max - min)) * 100}%, ${trackBg} 0%)` }}
    />
  );

  /** Compact row: label left, slider center, number input right */
  const compactSlider = (
    label: string, value: number, min: number, max: number, step: number,
    onChange: (v: number) => void, unit?: string,
  ) => (
    <div>
      <span style={sectionTitle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ flex: 1 }}>
          {slider(value, min, max, step, onChange)}
        </div>
        {numInput(value, min, max, step, onChange, unit)}
      </div>
    </div>
  );

  const borderRadii = (first as any).borderRadii as [number, number, number, number] | undefined;
  const br = (first as any).borderRadius ?? 0;

  return (
    <>
      <style>{getSliderCSS(ui)}</style>
      <div style={{
        position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 6, padding: 8,
        background: theme.panelBackground, border: `${ui.panelBorderWidth}px ${ui.panelBorderStyle} ${theme.panelBorder}`,
        borderRadius: ui.panelBorderRadius, boxShadow: ui.panelShadow, zIndex: 10,
        width: 224, fontFamily: theme.uiFontFamily,
        '--bdier-accent': theme.selectionColor,
        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
      } as React.CSSProperties}>

        {/* ── Stroke ── */}
        {card(<>
          <span style={sectionTitle}>Stroke</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {STROKE_COLORS.map(c => swatch(c, first.strokeColor === c, () => onUpdate({ strokeColor: c })))}
            {customPicker(first.strokeColor, c => onUpdate({ strokeColor: c }), strokePickerRef)}
          </div>
          {/* Hex input for precise color */}
          <input type="text" value={first.strokeColor} spellCheck={false}
            onChange={e => { const v = e.target.value; if (/^#[0-9a-f]{0,6}$/i.test(v) || v === '') onUpdate({ strokeColor: v }); }}
            onBlur={e => { if (!/^#[0-9a-f]{6}$/i.test(e.target.value)) onUpdate({ strokeColor: first.strokeColor }); }}
            style={{
              width: '100%', height: 24, fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
              border: `${ui.inputBorderWidth}px solid ${theme.panelBorder}`, borderRadius: ui.inputBorderRadius,
              background: theme.panelBackground, color: theme.panelText,
              padding: '0 8px', outline: 'none',
            }}
          />
        </>)}

        {/* ── Background ── */}
        {isNotLine && card(<>
          <span style={sectionTitle}>Background</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {FILL_COLORS.map(c =>
              swatch(c, first.backgroundColor === c, () =>
                onUpdate({ backgroundColor: c, fillStyle: c === 'transparent' ? 'none' : (first.fillStyle === 'none' ? 'solid' : first.fillStyle) })))}
            {customPicker(first.backgroundColor, c => onUpdate({ backgroundColor: c, fillStyle: first.fillStyle === 'none' ? 'solid' : first.fillStyle }), fillPickerRef)}
          </div>
          {/* Fill style toggles — show when fill is active */}
          {first.backgroundColor !== 'transparent' && first.fillStyle !== 'none' && (
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {FILL_STYLE_OPTS.map(f => pill(first.fillStyle === f.v, () => onUpdate({ fillStyle: f.v }), f.icon, f.tip))}
            </div>
          )}
        </>)}

        {/* ── Stroke width + style ── */}
        {card(<>
          <span style={sectionTitle}>Stroke width</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {([1, 2, 4] as const).map(w => pill(
                first.strokeWidth === w,
                () => onUpdate({ strokeWidth: w }),
                <svg width={24} height={6} viewBox="0 0 24 6"><line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth={w} strokeLinecap="round" /></svg>,
                `${w}px`,
              ))}
            </div>
            <div style={{ borderLeft: `1px solid ${theme.panelBorder}`, height: 20, flexShrink: 0 }} />
            {numInput(first.strokeWidth, 1, 20, 1, v => onUpdate({ strokeWidth: v }), 'px')}
          </div>

          <span style={{ ...sectionTitle, marginTop: 4 }}>Stroke style</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {STROKE_STYLE_OPTS.map(s => pill(
              (first.strokeStyle || 'solid') === s.v,
              () => onUpdate({ strokeStyle: s.v } as any),
              s.svg,
              s.label,
            ))}
          </div>
        </>)}

        {/* ── Sloppiness + Opacity — continuous sliders with number input ── */}
        {card(<>
          {compactSlider(
            'Sloppiness',
            first.roughness, 0, 3, 0.1,
            v => onUpdate({ roughness: v }),
          )}
          {compactSlider(
            'Opacity',
            Math.round(first.opacity * 100), 0, 100, 1,
            v => onUpdate({ opacity: v / 100 }),
            '%',
          )}
        </>)}

        {/* ── Border radius ── */}
        {isRect && card(<>
          <span style={sectionTitle}>Edges</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!perCorner ? (
              <>
                <div style={{ flex: 1 }}>
                  {slider(br, 0, 50, 1, v => onUpdate({ borderRadius: v, borderRadii: undefined } as any))}
                </div>
                {numInput(br, 0, 50, 1, v => onUpdate({ borderRadius: v, borderRadii: undefined } as any), 'px')}
                <button onClick={() => setPerCorner(true)} title="Per-corner radius" style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  border: `${ui.buttonBorderWidth}px solid ${theme.panelBorder}`, borderRadius: ui.buttonBorderRadius, background: 'transparent',
                  cursor: 'pointer', color: theme.panelTextSecondary, flexShrink: 0,
                }}>
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 5V3a2 2 0 0 1 2-2h2" /><path d="M11 1h2a2 2 0 0 1 2 2v2" />
                    <path d="M15 11v2a2 2 0 0 1-2 2h-2" /><path d="M5 15H3a2 2 0 0 1-2-2v-2" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                  {(['TL', 'TR', 'BR', 'BL'] as const).map((corner, i) => {
                    const vals = borderRadii || [br, br, br, br];
                    return (
                      <input key={corner} className={NUM_INPUT_CLASS} type="number" min={0} max={50} value={vals[i]}
                        title={corner}
                        onChange={e => {
                          const v = Math.max(0, Math.min(50, parseInt(e.target.value) || 0));
                          const next: [number, number, number, number] = [...(borderRadii || [br, br, br, br])] as any;
                          next[i] = v;
                          onUpdate({ borderRadii: next } as any);
                        }}
                        style={{ width: 36, border: `${ui.inputBorderWidth}px solid ${theme.panelBorder}`, background: theme.panelBackground, color: theme.panelText }}
                      />
                    );
                  })}
                </div>
                <button onClick={() => setPerCorner(false)} title="Uniform radius" style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  border: `${ui.buttonBorderWidth}px solid ${theme.selectionColor}`, borderRadius: ui.buttonBorderRadius, background: theme.panelActive,
                  cursor: 'pointer', color: theme.panelText, flexShrink: 0,
                }}>
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 5V3a2 2 0 0 1 2-2h2" /><path d="M11 1h2a2 2 0 0 1 2 2v2" />
                    <path d="M15 11v2a2 2 0 0 1-2 2h-2" /><path d="M5 15H3a2 2 0 0 1-2-2v-2" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </>)}

        {/* ── Shadow ── */}
        {card(<>
          <span style={sectionTitle}>Shadow</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { label: '—', value: '', tip: 'None' },
              { label: 'S', value: '2 2 4 rgba(0,0,0,0.2)', tip: 'Small' },
              { label: 'M', value: '4 4 10 rgba(0,0,0,0.25)', tip: 'Medium' },
              { label: 'L', value: '6 6 20 rgba(0,0,0,0.3)', tip: 'Large' },
            ].map(s => pill(
              (first.shadow || '') === s.value,
              () => onUpdate({ shadow: s.value || undefined } as any),
              <span style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</span>,
              s.tip,
            ))}
          </div>
        </>)}

        {/* ── Font ── */}
        {hasTextOrLabel && card(<>
          <span style={sectionTitle}>Font</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {FONT_FAMILIES.map(f => {
              const isActive = (hasText ? (first as any).fontFamily : undefined) === f.value;
              return (
                <button key={f.label} onClick={() => onUpdate({ fontFamily: f.value } as any)} style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  border: `${ui.buttonBorderWidth}px solid ${isActive ? theme.selectionColor : 'transparent'}`,
                  borderRadius: ui.buttonBorderRadius, background: isActive ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: isActive ? theme.selectionColor : theme.panelText, fontFamily: f.value,
                  transition: 'all 0.1s',
                }}>{f.label}</button>
              );
            })}
            {first.roughness > 0 && (() => {
              const isActive = (first as any).fontFamily === HANDWRITTEN_FONT;
              return (
                <button onClick={() => onUpdate({ fontFamily: HANDWRITTEN_FONT } as any)} style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  border: `${ui.buttonBorderWidth}px solid ${isActive ? theme.selectionColor : 'transparent'}`,
                  borderRadius: ui.buttonBorderRadius, background: isActive ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: isActive ? theme.selectionColor : theme.panelText, fontFamily: HANDWRITTEN_FONT,
                  transition: 'all 0.1s',
                }}>Hand</button>
              );
            })()}
          </div>

          {/* Align */}
          {hasText && (
            <div style={{ display: 'flex', gap: 2 }}>
              {(['left', 'center', 'right'] as const).map(a => pill(
                (first as any).textAlign === a,
                () => onUpdate({ textAlign: a } as any),
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {a === 'left' && <><path d="M3 6h18" /><path d="M3 12h12" /><path d="M3 18h16" /></>}
                  {a === 'center' && <><path d="M3 6h18" /><path d="M6 12h12" /><path d="M4 18h16" /></>}
                  {a === 'right' && <><path d="M3 6h18" /><path d="M9 12h12" /><path d="M5 18h16" /></>}
                </svg>,
                a,
              ))}
            </div>
          )}

          {/* Font size — presets + custom input */}
          {hasText && (<>
            <span style={{ ...sectionTitle, marginTop: 2 }}>Size</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {FONT_SIZES.map(s => pill(
                (first as any).fontSize === s,
                () => onUpdate({ fontSize: s } as any),
                <span style={{ fontSize: 11, fontWeight: 700 }}>{s}</span>,
              ))}
              <div style={{ borderLeft: `1px solid ${theme.panelBorder}`, height: 18, flexShrink: 0 }} />
              {numInput((first as any).fontSize ?? 18, 8, 200, 1, v => onUpdate({ fontSize: v } as any), 'px')}
            </div>
          </>)}
        </>)}

        {/* ── Embed URL ── */}
        {isEmbed && card(<>
          <span style={sectionTitle}>Embed URL</span>
          <input type="text" placeholder="https://..." value={(first as any).url || ''}
            onChange={e => onUpdate({ url: e.target.value } as any)}
            style={{
              width: '100%', height: 28, fontSize: 11,
              border: `${ui.inputBorderWidth}px solid ${theme.panelBorder}`, borderRadius: ui.inputBorderRadius,
              background: theme.panelBackground, color: theme.panelText,
              padding: '0 8px', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </>)}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 4, padding: '2px 6px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          {onCopy && (
            <button onClick={onCopy} title="Copy"
              style={{
                width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `${ui.buttonBorderWidth}px solid transparent`, borderRadius: ui.buttonBorderRadius, background: 'transparent',
                cursor: 'pointer', color: theme.panelText, padding: 0, transition: 'all 0.1s',
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          )}
          {onDuplicate && (
            <button onClick={onDuplicate} title="Duplicate"
              style={{
                width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `${ui.buttonBorderWidth}px solid transparent`, borderRadius: ui.buttonBorderRadius, background: 'transparent',
                cursor: 'pointer', color: theme.panelText, padding: 0, transition: 'all 0.1s',
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="8" width="14" height="14" rx="2" /><path d="M4 16V4a2 2 0 0 1 2-2h12" />
              </svg>
            </button>
          )}
          <button onClick={() => onUpdate({ locked: !first.locked })} title={first.locked ? 'Unlock' : 'Lock'}
            style={{
              width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `${ui.buttonBorderWidth}px solid ${first.locked ? theme.selectionColor : 'transparent'}`,
              borderRadius: ui.buttonBorderRadius, background: first.locked ? theme.panelActive : 'transparent',
              cursor: 'pointer', color: theme.panelText, padding: 0, transition: 'all 0.1s',
            }}
          >
            {first.locked ? (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </button>
          <button onClick={onDelete} title="Delete"
            style={{
              width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `${ui.buttonBorderWidth}px solid transparent`, borderRadius: ui.buttonBorderRadius, background: 'transparent',
              cursor: 'pointer', color: '#e03131', padding: 0, transition: 'all 0.1s',
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          {onClose && (
            <button onClick={onClose} title="Close panel"
              style={{
                width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `${ui.buttonBorderWidth}px solid transparent`, borderRadius: ui.buttonBorderRadius, background: 'transparent',
                cursor: 'pointer', color: theme.panelTextSecondary, padding: 0, transition: 'all 0.1s',
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
