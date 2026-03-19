import React, { useRef } from 'react';
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
  <svg width={14} height={14} viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" /></svg>
);
const iconFillHachure = (
  <svg width={14} height={14} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <line x1="3" y1="13" x2="13" y2="3" /><line x1="1" y1="10" x2="10" y2="1" /><line x1="1" y1="6" x2="6" y2="1" />
  </svg>
);
const iconFillCross = (
  <svg width={14} height={14} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.2" fill="none">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <line x1="3" y1="13" x2="13" y2="3" /><line x1="1" y1="10" x2="10" y2="1" /><line x1="1" y1="6" x2="6" y2="1" />
    <line x1="1" y1="3" x2="11" y2="13" /><line x1="4" y1="1" x2="13" y2="10" /><line x1="8" y1="1" x2="13" y2="6" />
  </svg>
);
const iconFillDots = (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor" stroke="currentColor" strokeWidth="1.2">
    <rect x="1" y="1" width="12" height="12" rx="2" fill="none" />
    <circle cx="4" cy="4" r="1" stroke="none" /><circle cx="10" cy="4" r="1" stroke="none" />
    <circle cx="7" cy="7" r="1" stroke="none" /><circle cx="4" cy="10" r="1" stroke="none" />
    <circle cx="10" cy="10" r="1" stroke="none" />
  </svg>
);

const FILL_STYLE_OPTS: { v: FillStyle; icon: React.ReactNode; tip: string }[] = [
  { v: 'solid', icon: iconFillSolid, tip: 'Solid' },
  { v: 'hachure', icon: iconFillHachure, tip: 'Hachure' },
  { v: 'cross-hatch', icon: iconFillCross, tip: 'Cross-hatch' },
  { v: 'dots', icon: iconFillDots, tip: 'Dots' },
];

const STROKE_STYLE_OPTS: { v: StrokeStyle; svg: React.ReactNode }[] = [
  { v: 'solid', svg: <svg width={20} height={6} viewBox="0 0 20 6"><line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" /></svg> },
  { v: 'dashed', svg: <svg width={20} height={6} viewBox="0 0 20 6"><line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" /></svg> },
  { v: 'dotted', svg: <svg width={20} height={6} viewBox="0 0 20 6"><line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5 2.5" strokeLinecap="round" /></svg> },
];

/* ── slider CSS (injected once) ─────────────────────── */
const SLIDER_CLASS = 'bdier-slider';
const sliderCSS = `
.${SLIDER_CLASS}{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;outline:none;cursor:pointer}
.${SLIDER_CLASS}::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;border:2px solid var(--bdier-accent);background:#fff;cursor:pointer;margin-top:-4px}
.${SLIDER_CLASS}::-moz-range-thumb{width:12px;height:12px;border-radius:50%;border:2px solid var(--bdier-accent);background:#fff;cursor:pointer}
.${SLIDER_CLASS}::-webkit-slider-runnable-track{height:4px;border-radius:2px}
.${SLIDER_CLASS}::-moz-range-track{height:4px;border-radius:2px}
`;

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ elements, onUpdate, onDelete, theme }) => {
  if (elements.length === 0) return null;
  const strokePickerRef = useRef<HTMLInputElement>(null);
  const fillPickerRef = useRef<HTMLInputElement>(null);

  const first = elements[0];
  const hasText = elements.some(e => e.type === 'text');
  const hasLabel = elements.some(e => 'label' in e);
  const hasTextOrLabel = hasText || hasLabel;
  const isNotLine = elements.every(e => e.type !== 'line' && e.type !== 'arrow' && e.type !== 'freehand');
  const isRect = elements.some(e => e.type === 'rectangle');
  const isEmbed = elements.some(e => e.type === 'embed');

  /* ── helpers ──────────────────────────────────────── */
  const swatch = (color: string, active: boolean, onClick: () => void) => (
    <button
      key={color}
      onClick={onClick}
      style={{
        width: 16, height: 16, borderRadius: 3,
        border: active ? `2px solid ${theme.selectionColor}` : `1px solid ${theme.panelBorder}`,
        background: color === 'transparent'
          ? `repeating-conic-gradient(${theme.panelBorder} 0% 25%, transparent 0% 50%) 50% / 6px 6px`
          : color,
        cursor: 'pointer', padding: 0, flexShrink: 0,
      }}
    />
  );

  const customColorBtn = (currentColor: string, onPick: (c: string) => void, ref: React.RefObject<HTMLInputElement | null>) => (
    <span style={{ position: 'relative', display: 'inline-block', width: 16, height: 16 }}>
      <input ref={ref} type="color" value={currentColor === 'transparent' ? '#000000' : currentColor}
        onChange={e => onPick(e.target.value)} tabIndex={-1}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }}
      />
      <span style={{ width: 16, height: 16, borderRadius: 3, border: `1px dashed ${theme.panelBorder}`, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.panelTextSecondary, pointerEvents: 'none' }}>
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
    </span>
  );

  const sep = <div style={{ width: 1, alignSelf: 'stretch', background: theme.panelBorder, margin: '0 2px', flexShrink: 0 }} />;

  const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: theme.panelTextSecondary, letterSpacing: 0.3, textTransform: 'uppercase', lineHeight: 1 };

  const grp: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' };

  const pillBtn = (active: boolean, onClick: () => void, child: React.ReactNode, title?: string, extra?: React.CSSProperties) => (
    <button onClick={onClick} title={title} style={{
      width: 24, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      border: `1px solid ${active ? theme.selectionColor : theme.panelBorder}`,
      borderRadius: 4, background: active ? theme.panelActive : 'transparent',
      cursor: 'pointer', color: theme.panelText, ...extra,
    }}>{child}</button>
  );

  const sliderTrackBg = theme.panelBorder;

  return (
    <>
      <style>{sliderCSS}</style>
      <div
        style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, padding: '6px 10px',
          background: theme.panelBackground, border: `1px solid ${theme.panelBorder}`,
          borderRadius: theme.borderRadius, boxShadow: theme.shadow, zIndex: 10,
          alignItems: 'center', fontFamily: theme.uiFontFamily,
          '--bdier-accent': theme.selectionColor,
        } as React.CSSProperties}
      >
        {/* ── Stroke color ── */}
        <div style={grp}>
          <span style={lbl}>Stroke</span>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 96, alignItems: 'center' }}>
            {STROKE_COLORS.map(c => swatch(c, first.strokeColor === c, () => onUpdate({ strokeColor: c })))}
            {customColorBtn(first.strokeColor, c => onUpdate({ strokeColor: c }), strokePickerRef)}
          </div>
        </div>

        {/* ── Fill color ── */}
        {isNotLine && <>
          {sep}
          <div style={grp}>
            <span style={lbl}>Fill</span>
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 96, alignItems: 'center' }}>
              {FILL_COLORS.map(c =>
                swatch(c, first.backgroundColor === c, () =>
                  onUpdate({ backgroundColor: c, fillStyle: c === 'transparent' ? 'none' : (first.fillStyle === 'none' ? 'solid' : first.fillStyle) })))}
              {customColorBtn(first.backgroundColor, c => onUpdate({ backgroundColor: c, fillStyle: first.fillStyle === 'none' ? 'solid' : first.fillStyle }), fillPickerRef)}
            </div>
          </div>
        </>}

        {/* ── Fill style (icons) ── */}
        {isNotLine && first.backgroundColor !== 'transparent' && first.fillStyle !== 'none' && <>
          {sep}
          <div style={grp}>
            <span style={lbl}>Pattern</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {FILL_STYLE_OPTS.map(f => pillBtn(first.fillStyle === f.v, () => onUpdate({ fillStyle: f.v }), f.icon, f.tip))}
            </div>
          </div>
        </>}

        {sep}

        {/* ── Stroke style (line icons) ── */}
        <div style={grp}>
          <span style={lbl}>Line</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {STROKE_STYLE_OPTS.map(s => pillBtn((first.strokeStyle || 'solid') === s.v, () => onUpdate({ strokeStyle: s.v } as any), s.svg, s.v))}
          </div>
        </div>

        {sep}

        {/* ── Width slider ── */}
        <div style={grp}>
          <span style={lbl}>{first.strokeWidth}px</span>
          <input className={SLIDER_CLASS} type="range" min={1} max={12} step={1}
            value={first.strokeWidth} onChange={e => onUpdate({ strokeWidth: parseInt(e.target.value) })}
            style={{ width: 44, background: `linear-gradient(90deg, ${theme.selectionColor} ${((first.strokeWidth - 1) / 11) * 100}%, ${sliderTrackBg} 0%)` }}
          />
        </div>

        {/* ── Sloppiness slider ── */}
        <div style={grp}>
          <span style={lbl}>{first.roughness === 0 ? 'Clean' : first.roughness <= 0.8 ? 'Sketchy' : 'Rough'}</span>
          <input className={SLIDER_CLASS} type="range" min={0} max={2} step={0.1}
            value={first.roughness} onChange={e => onUpdate({ roughness: parseFloat(e.target.value) })}
            style={{ width: 44, background: `linear-gradient(90deg, ${theme.selectionColor} ${(first.roughness / 2) * 100}%, ${sliderTrackBg} 0%)` }}
          />
        </div>

        {/* ── Opacity slider ── */}
        <div style={grp}>
          <span style={lbl}>{Math.round(first.opacity * 100)}%</span>
          <input className={SLIDER_CLASS} type="range" min={0.1} max={1} step={0.05}
            value={first.opacity} onChange={e => onUpdate({ opacity: parseFloat(e.target.value) })}
            style={{ width: 44, background: `linear-gradient(90deg, ${theme.selectionColor} ${((first.opacity - 0.1) / 0.9) * 100}%, ${sliderTrackBg} 0%)` }}
          />
        </div>

        {/* ── Border radius ── */}
        {isRect && <>
          {sep}
          <div style={grp}>
            <span style={lbl}>R {(first as any).borderRadius ?? 0}</span>
            <input className={SLIDER_CLASS} type="range" min={0} max={50} step={1}
              value={(first as any).borderRadius ?? 0} onChange={e => onUpdate({ borderRadius: parseInt(e.target.value) } as any)}
              style={{ width: 44, background: `linear-gradient(90deg, ${theme.selectionColor} ${(((first as any).borderRadius ?? 0) / 50) * 100}%, ${sliderTrackBg} 0%)` }}
            />
          </div>
        </>}

        {sep}

        {/* ── Shadow ── */}
        <div style={grp}>
          <span style={lbl}>Shadow</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { label: '—', value: '', tip: 'None' },
              { label: 'S', value: '2 2 4 rgba(0,0,0,0.2)', tip: 'Small' },
              { label: 'M', value: '4 4 10 rgba(0,0,0,0.25)', tip: 'Medium' },
              { label: 'L', value: '6 6 20 rgba(0,0,0,0.3)', tip: 'Large' },
            ].map(s => {
              const active = (first.shadow || '') === s.value;
              return (
                <button key={s.label} onClick={() => onUpdate({ shadow: s.value || undefined } as any)} title={s.tip}
                  style={{
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${active ? theme.selectionColor : theme.panelBorder}`,
                    borderRadius: 4, background: active ? theme.panelActive : 'transparent',
                    cursor: 'pointer', color: theme.panelText, fontSize: 9, fontWeight: 700, padding: 0, fontFamily: 'inherit',
                  }}
                >{s.label}</button>
              );
            })}
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
                  width: 22, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${(first as any).fontSize === s ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first as any).fontSize === s ? theme.panelActive : 'transparent',
                  cursor: 'pointer', fontSize: 9, fontWeight: 700, color: theme.panelText, fontFamily: 'inherit', padding: 0,
                }}>{s}</button>
              ))}
              <input type="number" min={8} max={200} value={(first as any).fontSize ?? 18}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 8 && v <= 200) onUpdate({ fontSize: v } as any); }}
                style={{
                  width: 32, height: 20, textAlign: 'center', fontSize: 9, fontWeight: 700,
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
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {FONT_FAMILIES.map(f => {
                const isActive = (hasText ? (first as any).fontFamily : undefined) === f.value;
                return (
                  <button key={f.label} onClick={() => onUpdate({ fontFamily: f.value } as any)} style={{
                    padding: '1px 4px', fontSize: 9, fontWeight: 600,
                    border: `1px solid ${isActive ? theme.selectionColor : theme.panelBorder}`,
                    borderRadius: 4, background: isActive ? theme.panelActive : 'transparent',
                    cursor: 'pointer', color: theme.panelText, fontFamily: f.value,
                  }}>{f.label}</button>
                );
              })}
              {first.roughness > 0 && (
                <button onClick={() => onUpdate({ fontFamily: HANDWRITTEN_FONT } as any)} style={{
                  padding: '1px 4px', fontSize: 9, fontWeight: 600,
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
          <div style={grp}>
            <span style={lbl}>Align</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['left', 'center', 'right'] as const).map(a => pillBtn(
                (first as any).textAlign === a,
                () => onUpdate({ textAlign: a } as any),
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  {a === 'left' && <><path d="M3 6h18" /><path d="M3 12h12" /><path d="M3 18h16" /></>}
                  {a === 'center' && <><path d="M3 6h18" /><path d="M6 12h12" /><path d="M4 18h16" /></>}
                  {a === 'right' && <><path d="M3 6h18" /><path d="M9 12h12" /><path d="M5 18h16" /></>}
                </svg>,
                a,
              ))}
            </div>
          </div>
        </>}

        {/* ── Embed URL ── */}
        {isEmbed && <>
          {sep}
          <div style={grp}>
            <span style={lbl}>URL</span>
            <input type="text" placeholder="https://..." value={(first as any).url || ''}
              onChange={e => onUpdate({ url: e.target.value } as any)}
              style={{
                width: 100, height: 20, fontSize: 9,
                border: `1px solid ${theme.panelBorder}`, borderRadius: 4,
                background: 'transparent', color: theme.panelText,
                padding: '0 3px', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </>}

        {sep}

        {/* ── Lock ── */}
        <button onClick={() => onUpdate({ locked: !first.locked })} title={first.locked ? 'Unlock' : 'Lock'}
          style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${first.locked ? theme.selectionColor : theme.panelBorder}`,
            borderRadius: 4, background: first.locked ? theme.panelActive : 'transparent',
            cursor: 'pointer', color: theme.panelText, padding: 0,
          }}
        >
          {first.locked ? (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          )}
        </button>

        {/* ── Delete ── */}
        <button onClick={onDelete} title="Delete"
          style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${theme.panelBorder}`, borderRadius: 4, background: 'transparent',
            cursor: 'pointer', color: '#e03131', padding: 0,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </>
  );
};
