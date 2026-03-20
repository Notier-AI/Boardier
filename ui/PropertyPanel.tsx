/**
 * @boardier-module ui/PropertyPanel
 * @boardier-category UI
 * @boardier-description Side panel that displays and edits properties of selected elements: stroke color, fill color/style, stroke width/style, opacity, roughness, font, text alignment, border radius, and element-specific fields.
 * @boardier-since 0.1.0
 */
import React, { useRef, useState } from 'react';
import type { BoardierElement, FillStyle, StrokeStyle } from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { STROKE_COLORS, FILL_COLORS, FONT_SIZES, FONT_FAMILIES, HANDWRITTEN_FONT } from '../utils/colors';

interface PropertyPanelProps {
  elements: BoardierElement[];
  onUpdate: (updates: Partial<BoardierElement>) => void;
  onDelete: () => void;
  theme: BoardierTheme;
}

/* ── tiny SVG icons ─────────────────────────────────── */
const iconFillSolid = (
  <svg width={12} height={12} viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" /></svg>
);
const iconFillHachure = (
  <svg width={12} height={12} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.6" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <line x1="3" y1="13" x2="13" y2="3" /><line x1="1" y1="10" x2="10" y2="1" /><line x1="1" y1="6" x2="6" y2="1" />
  </svg>
);
const iconFillCross = (
  <svg width={12} height={12} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.3" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <line x1="3" y1="13" x2="13" y2="3" /><line x1="1" y1="10" x2="10" y2="1" /><line x1="1" y1="6" x2="6" y2="1" />
    <line x1="1" y1="3" x2="11" y2="13" /><line x1="4" y1="1" x2="13" y2="10" /><line x1="8" y1="1" x2="13" y2="6" />
  </svg>
);
const iconFillDots = (
  <svg width={12} height={12} viewBox="0 0 14 14" fill="currentColor" stroke="currentColor" strokeWidth="1.3">
    <rect x="1" y="1" width="12" height="12" rx="2" fill="none" />
    <circle cx="4" cy="4" r="1" stroke="none" /><circle cx="10" cy="4" r="1" stroke="none" />
    <circle cx="7" cy="7" r="1" stroke="none" /><circle cx="4" cy="10" r="1" stroke="none" />
    <circle cx="10" cy="10" r="1" stroke="none" />
  </svg>
);
const iconFillZigzag = (
  <svg width={12} height={12} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <polyline points="2,5 5,8 8,5 11,8" /><polyline points="2,9 5,12 8,9 11,12" />
  </svg>
);
const iconFillZigzagLine = (
  <svg width={12} height={12} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.2" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <polyline points="2,3 4,5 6,3 8,5 10,3 12,5" /><polyline points="2,7 4,9 6,7 8,9 10,7 12,9" /><polyline points="3,11 5,13 7,11 9,13" />
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

const STROKE_STYLE_OPTS: { v: StrokeStyle; svg: React.ReactNode }[] = [
  { v: 'solid', svg: <svg width={18} height={6} viewBox="0 0 20 6"><line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" /></svg> },
  { v: 'dashed', svg: <svg width={18} height={6} viewBox="0 0 20 6"><line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" /></svg> },
  { v: 'dotted', svg: <svg width={18} height={6} viewBox="0 0 20 6"><line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5 2.5" strokeLinecap="round" /></svg> },
];

/* ── slider CSS (injected once) ─────────────────────── */
const SLIDER_CLASS = 'bdier-slider';
const sliderCSS = `
.${SLIDER_CLASS}{-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;outline:none;cursor:pointer}
.${SLIDER_CLASS}::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;border:2px solid var(--bdier-accent);background:#fff;cursor:pointer;margin-top:-3.5px}
.${SLIDER_CLASS}::-moz-range-thumb{width:10px;height:10px;border-radius:50%;border:2px solid var(--bdier-accent);background:#fff;cursor:pointer}
.${SLIDER_CLASS}::-webkit-slider-runnable-track{height:3px;border-radius:2px}
.${SLIDER_CLASS}::-moz-range-track{height:3px;border-radius:2px}
`;

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ elements, onUpdate, onDelete, theme }) => {
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

  /* ── helpers ──────────────────────────────────────── */
  const swatch = (color: string, active: boolean, onClick: () => void) => (
    <button key={color} onClick={onClick} style={{
      width: 18, height: 18, borderRadius: 3,
      border: active ? `2px solid ${theme.selectionColor}` : `1px solid ${theme.panelBorder}`,
      background: color === 'transparent'
        ? `repeating-conic-gradient(${theme.panelBorder} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
        : color,
      cursor: 'pointer', padding: 0, flexShrink: 0,
    }} />
  );

  const customPicker = (currentColor: string, onPick: (c: string) => void, ref: React.RefObject<HTMLInputElement | null>) => (
    <span style={{ position: 'relative', display: 'inline-block', width: 18, height: 18 }}>
      <input ref={ref} type="color" value={currentColor === 'transparent' ? '#000000' : currentColor}
        onChange={e => onPick(e.target.value)} tabIndex={-1}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }}
      />
      <span style={{ width: 18, height: 18, borderRadius: 3, border: `1px dashed ${theme.panelBorder}`, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.panelTextSecondary, pointerEvents: 'none' }}>
        <svg width={7} height={7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
    </span>
  );

  const sep = <div style={{ height: 1, alignSelf: 'stretch', background: theme.panelBorder, flexShrink: 0 }} />;
  const lbl: React.CSSProperties = { fontSize: 8, fontWeight: 700, color: theme.panelTextSecondary, letterSpacing: 0.3, textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' };
  const grp: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' };
  const trackBg = theme.panelBorder;

  const pill = (active: boolean, onClick: () => void, child: React.ReactNode, title?: string) => (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      border: `1px solid ${active ? theme.selectionColor : theme.panelBorder}`,
      borderRadius: 4, background: active ? theme.panelActive : 'transparent',
      cursor: 'pointer', color: theme.panelText,
    }}>{child}</button>
  );

  const slider = (value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <input className={SLIDER_CLASS} type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: 48, background: `linear-gradient(90deg, ${theme.selectionColor} ${((value - min) / (max - min)) * 100}%, ${trackBg} 0%)` }}
    />
  );

  const borderRadii = (first as any).borderRadii as [number, number, number, number] | undefined;
  const br = (first as any).borderRadius ?? 0;

  return (
    <>
      <style>{sliderCSS}</style>
      <div style={{
        position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 10px',
        background: theme.panelBackground, border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius, boxShadow: theme.shadow, zIndex: 10,
        alignItems: 'center', fontFamily: theme.uiFontFamily,
        '--bdier-accent': theme.selectionColor,
      } as React.CSSProperties}>

        {/* ── Colors (merged) ── */}
        <div style={grp}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <span style={{ ...lbl, width: 12, textAlign: 'right', fontSize: 9 }}>S</span>
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 105 }}>
              {STROKE_COLORS.map(c => swatch(c, first.strokeColor === c, () => onUpdate({ strokeColor: c })))}
              {customPicker(first.strokeColor, c => onUpdate({ strokeColor: c }), strokePickerRef)}
            </div>
          </div>
          {isNotLine && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <span style={{ ...lbl, width: 12, textAlign: 'right', fontSize: 9 }}>F</span>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 105 }}>
                {FILL_COLORS.map(c =>
                  swatch(c, first.backgroundColor === c, () =>
                    onUpdate({ backgroundColor: c, fillStyle: c === 'transparent' ? 'none' : (first.fillStyle === 'none' ? 'solid' : first.fillStyle) })))}
                {customPicker(first.backgroundColor, c => onUpdate({ backgroundColor: c, fillStyle: first.fillStyle === 'none' ? 'solid' : first.fillStyle }), fillPickerRef)}
              </div>
            </div>
          )}
        </div>

        {sep}

        {/* ── Style: fill pattern + stroke style ── */}
        <div style={grp}>
          {isNotLine && first.backgroundColor !== 'transparent' && first.fillStyle !== 'none' && (
            <div style={{ display: 'flex', gap: 3 }}>
              {FILL_STYLE_OPTS.map(f => pill(first.fillStyle === f.v, () => onUpdate({ fillStyle: f.v }), f.icon, f.tip))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 3 }}>
            {STROKE_STYLE_OPTS.map(s => pill((first.strokeStyle || 'solid') === s.v, () => onUpdate({ strokeStyle: s.v } as any), s.svg, s.v))}
          </div>
        </div>

        {sep}

        {/* ── Sliders: width, sloppiness, opacity ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={grp}>
            <span style={lbl}>{first.strokeWidth}px</span>
            {slider(first.strokeWidth, 1, 12, 1, v => onUpdate({ strokeWidth: v }))}
          </div>
          <div style={grp}>
            <span style={lbl}>{first.roughness === 0 ? 'Clean' : first.roughness <= 0.8 ? 'Sketch' : 'Rough'}</span>
            {slider(first.roughness, 0, 2, 0.1, v => onUpdate({ roughness: v }))}
          </div>
          <div style={grp}>
            <span style={lbl}>{Math.round(first.opacity * 100)}%</span>
            {slider(first.opacity, 0.1, 1, 0.05, v => onUpdate({ opacity: v }))}
          </div>
        </div>

        {/* ── Border radius ── */}
        {isRect && <>
          {sep}
          <div style={grp}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={lbl}>R</span>
              {!perCorner ? (
                <>
                  {slider(br, 0, 50, 1, v => onUpdate({ borderRadius: v, borderRadii: undefined } as any))}
                  <button onClick={() => setPerCorner(true)} title="Per-corner radius" style={{
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    border: `1px solid ${theme.panelBorder}`, borderRadius: 4, background: 'transparent',
                    cursor: 'pointer', color: theme.panelTextSecondary,
                  }}>
                    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 5V3a2 2 0 0 1 2-2h2" /><path d="M11 1h2a2 2 0 0 1 2 2v2" />
                      <path d="M15 11v2a2 2 0 0 1-2 2h-2" /><path d="M5 15H3a2 2 0 0 1-2-2v-2" />
                    </svg>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {(['TL', 'TR', 'BR', 'BL'] as const).map((corner, i) => {
                    const vals = borderRadii || [br, br, br, br];
                    return (
                      <input key={corner} type="number" min={0} max={50} value={vals[i]}
                        title={corner}
                        onChange={e => {
                          const v = Math.max(0, Math.min(50, parseInt(e.target.value) || 0));
                          const next: [number, number, number, number] = [...(borderRadii || [br, br, br, br])] as any;
                          next[i] = v;
                          onUpdate({ borderRadii: next } as any);
                        }}
                        style={{
                          width: 32, height: 20, textAlign: 'center', fontSize: 10, fontWeight: 700,
                          border: `1px solid ${theme.panelBorder}`, borderRadius: 4,
                          background: 'transparent', color: theme.panelText, outline: 'none',
                          fontFamily: 'inherit', padding: 0,
                        }}
                      />
                    );
                  })}
                  <button onClick={() => setPerCorner(false)} title="Uniform radius" style={{
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    border: `1px solid ${theme.selectionColor}`, borderRadius: 4, background: theme.panelActive,
                    cursor: 'pointer', color: theme.panelText,
                  }}>
                    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 5V3a2 2 0 0 1 2-2h2" /><path d="M11 1h2a2 2 0 0 1 2 2v2" />
                      <path d="M15 11v2a2 2 0 0 1-2 2h-2" /><path d="M5 15H3a2 2 0 0 1-2-2v-2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>}

        {sep}

        {/* ── Shadow ── */}
        <div style={grp}>
          <span style={lbl}>Shadow</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[
              { label: '—', value: '', tip: 'None' },
              { label: 'S', value: '2 2 4 rgba(0,0,0,0.2)', tip: 'Small' },
              { label: 'M', value: '4 4 10 rgba(0,0,0,0.25)', tip: 'Medium' },
              { label: 'L', value: '6 6 20 rgba(0,0,0,0.3)', tip: 'Large' },
            ].map(s => (
              <button key={s.label} onClick={() => onUpdate({ shadow: s.value || undefined } as any)} title={s.tip}
                style={{
                  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${(first.shadow || '') === s.value ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first.shadow || '') === s.value ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: theme.panelText, fontSize: 10, fontWeight: 700, padding: 0, fontFamily: 'inherit',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* ── Font size ── */}
        {hasText && <>
          {sep}
          <div style={grp}>
            <span style={lbl}>Size</span>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {FONT_SIZES.map(s => (
                <button key={s} onClick={() => onUpdate({ fontSize: s } as any)} style={{
                  width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${(first as any).fontSize === s ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first as any).fontSize === s ? theme.panelActive : 'transparent',
                  cursor: 'pointer', fontSize: 10, fontWeight: 700, color: theme.panelText, fontFamily: 'inherit', padding: 0,
                }}>{s}</button>
              ))}
              <input type="number" min={8} max={200} value={(first as any).fontSize ?? 18}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 8 && v <= 200) onUpdate({ fontSize: v } as any); }}
                style={{
                  width: 36, height: 22, textAlign: 'center', fontSize: 10, fontWeight: 700,
                  border: `1px solid ${theme.panelBorder}`, borderRadius: 4,
                  background: 'transparent', color: theme.panelText, outline: 'none', fontFamily: 'inherit', padding: 0,
                }}
              />
            </div>
          </div>
        </>}

        {/* ── Font family ── */}
        {hasTextOrLabel && <>
          {sep}
          <div style={grp}>
            <span style={lbl}>Font</span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {FONT_FAMILIES.map(f => {
                const isActive = (hasText ? (first as any).fontFamily : undefined) === f.value;
                return (
                  <button key={f.label} onClick={() => onUpdate({ fontFamily: f.value } as any)} style={{
                    padding: '3px 6px', fontSize: 10, fontWeight: 600,
                    border: `1px solid ${isActive ? theme.selectionColor : theme.panelBorder}`,
                    borderRadius: 4, background: isActive ? theme.panelActive : 'transparent',
                    cursor: 'pointer', color: theme.panelText, fontFamily: f.value,
                  }}>{f.label}</button>
                );
              })}
              {first.roughness > 0 && (
                <button onClick={() => onUpdate({ fontFamily: HANDWRITTEN_FONT } as any)} style={{
                  padding: '3px 6px', fontSize: 10, fontWeight: 600,
                  border: `1px solid ${(first as any).fontFamily === HANDWRITTEN_FONT ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first as any).fontFamily === HANDWRITTEN_FONT ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: theme.panelText, fontFamily: HANDWRITTEN_FONT,
                }}>Hand</button>
              )}
            </div>
          </div>
        </>}

        {/* ── Align ── */}
        {hasText && <>
          {sep}
          <div style={{ display: 'flex', gap: 1 }}>
            {(['left', 'center', 'right'] as const).map(a => pill(
              (first as any).textAlign === a,
              () => onUpdate({ textAlign: a } as any),
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                {a === 'left' && <><path d="M3 6h18" /><path d="M3 12h12" /><path d="M3 18h16" /></>}
                {a === 'center' && <><path d="M3 6h18" /><path d="M6 12h12" /><path d="M4 18h16" /></>}
                {a === 'right' && <><path d="M3 6h18" /><path d="M9 12h12" /><path d="M5 18h16" /></>}
              </svg>,
              a,
            ))}
          </div>
        </>}

        {/* ── Embed URL ── */}
        {isEmbed && <>
          {sep}
          <input type="text" placeholder="URL..." value={(first as any).url || ''}
            onChange={e => onUpdate({ url: e.target.value } as any)}
            style={{
              width: 90, height: 18, fontSize: 8,
              border: `1px solid ${theme.panelBorder}`, borderRadius: 3,
              background: 'transparent', color: theme.panelText,
              padding: '0 3px', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </>}

        {sep}

        {/* ── Lock + Delete ── */}
        <button onClick={() => onUpdate({ locked: !first.locked })} title={first.locked ? 'Unlock' : 'Lock'}
          style={{
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${first.locked ? theme.selectionColor : theme.panelBorder}`,
            borderRadius: 3, background: first.locked ? theme.panelActive : 'transparent',
            cursor: 'pointer', color: theme.panelText, padding: 0,
          }}
        >
          {first.locked ? (
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          )}
        </button>
        <button onClick={onDelete} title="Delete"
          style={{
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${theme.panelBorder}`, borderRadius: 3, background: 'transparent',
            cursor: 'pointer', color: '#e03131', padding: 0,
          }}
        >
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </>
  );
};
