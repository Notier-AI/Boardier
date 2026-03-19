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

  const swatch = (color: string, active: boolean, onClick: () => void) => (
    <button
      key={color}
      onClick={onClick}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: active ? `2px solid ${theme.selectionColor}` : `1px solid ${theme.panelBorder}`,
        background: color === 'transparent'
          ? `repeating-conic-gradient(${theme.panelBorder} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
          : color,
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    />
  );

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: theme.panelTextSecondary,
    fontFamily: theme.uiFontFamily,
  };

  const customColorBtn = (currentColor: string, onPick: (c: string) => void, pickerRef: React.RefObject<HTMLInputElement | null>) => (
    <span style={{ position: 'relative', display: 'inline-block', width: 18, height: 18 }}>
      <input
        ref={pickerRef}
        type="color"
        value={currentColor === 'transparent' ? '#000000' : currentColor}
        onChange={e => onPick(e.target.value)}
        tabIndex={-1}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', border: 'none', padding: 0,
        }}
      />
      <span
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1px dashed ${theme.panelBorder}`,
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.panelTextSecondary, fontSize: 12,
          pointerEvents: 'none',
        }}
      >
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
    </span>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 14,
        padding: '8px 14px',
        background: theme.panelBackground,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadow,
        zIndex: 10,
        alignItems: 'flex-start',
        fontFamily: theme.uiFontFamily,
      }}
    >
      {/* Stroke color */}
      <div style={sectionStyle}>
        <span>Stroke</span>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 108, alignItems: 'center' }}>
          {STROKE_COLORS.map(c => swatch(c, first.strokeColor === c, () => onUpdate({ strokeColor: c })))}
          {customColorBtn(first.strokeColor, c => onUpdate({ strokeColor: c }), strokePickerRef)}
        </div>
      </div>

      {/* Fill color */}
      {isNotLine && (
        <div style={sectionStyle}>
          <span>Fill</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 108, alignItems: 'center' }}>
            {FILL_COLORS.map(c =>
              swatch(c, first.backgroundColor === c, () =>
                onUpdate({ backgroundColor: c, fillStyle: c === 'transparent' ? 'none' : (first.fillStyle === 'none' ? 'solid' : first.fillStyle) }),
              ),
            )}
            {customColorBtn(first.backgroundColor, c => onUpdate({ backgroundColor: c, fillStyle: first.fillStyle === 'none' ? 'solid' : first.fillStyle }), fillPickerRef)}
          </div>
        </div>
      )}

      {/* Fill style */}
      {isNotLine && first.backgroundColor !== 'transparent' && first.fillStyle !== 'none' && (
        <div style={sectionStyle}>
          <span>Fill style</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {([
              { v: 'solid' as FillStyle, label: 'Solid' },
              { v: 'hachure' as FillStyle, label: 'Hachure' },
              { v: 'cross-hatch' as FillStyle, label: 'Cross' },
              { v: 'dots' as FillStyle, label: 'Dots' },
            ]).map(f => (
              <button
                key={f.v}
                onClick={() => onUpdate({ fillStyle: f.v })}
                style={{
                  padding: '2px 6px', fontSize: 10, fontWeight: 600,
                  border: `1px solid ${first.fillStyle === f.v ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: first.fillStyle === f.v ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: theme.panelText, fontFamily: 'inherit',
                }}
              >{f.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke width */}
      <div style={sectionStyle}>
        <span>Width</span>
        <input
          type="range"
          min={1}
          max={12}
          step={1}
          value={first.strokeWidth}
          onChange={e => onUpdate({ strokeWidth: parseInt(e.target.value) })}
          style={{ width: 60, accentColor: theme.selectionColor }}
        />
        <span style={{ fontSize: 10, textAlign: 'center', color: theme.panelText }}>{first.strokeWidth}px</span>
      </div>

      {/* Stroke style */}
      <div style={sectionStyle}>
        <span>Stroke</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {([
            { v: 'solid' as StrokeStyle, svg: <svg width={22} height={8} viewBox="0 0 22 8"><line x1="1" y1="4" x2="21" y2="4" stroke="currentColor" strokeWidth="2" /></svg> },
            { v: 'dashed' as StrokeStyle, svg: <svg width={22} height={8} viewBox="0 0 22 8"><line x1="1" y1="4" x2="21" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" /></svg> },
            { v: 'dotted' as StrokeStyle, svg: <svg width={22} height={8} viewBox="0 0 22 8"><line x1="1" y1="4" x2="21" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5 2.5" strokeLinecap="round" /></svg> },
          ]).map(s => (
            <button
              key={s.v}
              onClick={() => onUpdate({ strokeStyle: s.v } as any)}
              style={{
                width: 32, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${(first.strokeStyle || 'solid') === s.v ? theme.selectionColor : theme.panelBorder}`,
                borderRadius: 4, background: (first.strokeStyle || 'solid') === s.v ? theme.panelActive : 'transparent',
                cursor: 'pointer', color: theme.panelText, padding: 0,
              }}
            >{s.svg}</button>
          ))}
        </div>
      </div>

      {/* Font size for text */}
      {hasText && (
        <div style={sectionStyle}>
          <span>Size</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {FONT_SIZES.map(s => (
              <button
                key={s}
                onClick={() => onUpdate({ fontSize: s } as any)}
                style={{
                  width: 28, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${(first as any).fontSize === s ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first as any).fontSize === s ? theme.panelActive : 'transparent',
                  cursor: 'pointer', fontSize: 10, fontWeight: 700, color: theme.panelText, fontFamily: 'inherit',
                }}
              >
                {s}
              </button>
            ))}
            <input
              type="number"
              min={8}
              max={200}
              value={(first as any).fontSize ?? 18}
              onChange={e => { const v = parseInt(e.target.value); if (v >= 8 && v <= 200) onUpdate({ fontSize: v } as any); }}
              style={{
                width: 38, height: 24, textAlign: 'center', fontSize: 10, fontWeight: 700,
                border: `1px solid ${theme.panelBorder}`, borderRadius: 4,
                background: 'transparent', color: theme.panelText,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}

      {/* Font family for text / shapes with labels */}
      {hasTextOrLabel && (
        <div style={sectionStyle}>
          <span>Font</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {FONT_FAMILIES.map(f => {
              const currentFont = hasText ? (first as any).fontFamily : undefined;
              const isActive = currentFont === f.value;
              return (
                <button
                  key={f.label}
                  onClick={() => onUpdate({ fontFamily: f.value } as any)}
                  style={{
                    padding: '2px 6px', fontSize: 10, fontWeight: 600,
                    border: `1px solid ${isActive ? theme.selectionColor : theme.panelBorder}`,
                    borderRadius: 4, background: isActive ? theme.panelActive : 'transparent',
                    cursor: 'pointer', color: theme.panelText,
                    fontFamily: f.value,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
            {first.roughness > 0 && (
              <button
                onClick={() => onUpdate({ fontFamily: HANDWRITTEN_FONT } as any)}
                style={{
                  padding: '2px 6px', fontSize: 10, fontWeight: 600,
                  border: `1px solid ${(first as any).fontFamily === HANDWRITTEN_FONT ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first as any).fontFamily === HANDWRITTEN_FONT ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: theme.panelText,
                  fontFamily: HANDWRITTEN_FONT,
                }}
              >
                Hand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Text alignment */}
      {hasText && (
        <div style={sectionStyle}>
          <span>Align</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                onClick={() => onUpdate({ textAlign: a } as any)}
                style={{
                  width: 26, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${(first as any).textAlign === a ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: (first as any).textAlign === a ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: theme.panelText, padding: 0,
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {a === 'left' && <><path d="M3 6h18" /><path d="M3 12h12" /><path d="M3 18h16" /></>}
                  {a === 'center' && <><path d="M3 6h18" /><path d="M6 12h12" /><path d="M4 18h16" /></>}
                  {a === 'right' && <><path d="M3 6h18" /><path d="M9 12h12" /><path d="M5 18h16" /></>}
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sloppiness */}
      <div style={sectionStyle}>
        <span>Sloppiness</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={first.roughness}
          onChange={e => onUpdate({ roughness: parseFloat(e.target.value) })}
          style={{ width: 60, accentColor: theme.selectionColor }}
        />
        <span style={{ fontSize: 9, textAlign: 'center', color: theme.panelTextSecondary }}>
          {first.roughness === 0 ? 'Clean' : first.roughness <= 0.8 ? 'Sketch' : 'Rough'}
        </span>
      </div>

      {/* Border radius (rectangles) */}
      {isRect && (
        <div style={sectionStyle}>
          <span>Radius</span>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={(first as any).borderRadius ?? 0}
            onChange={e => onUpdate({ borderRadius: parseInt(e.target.value) } as any)}
            style={{ width: 60, accentColor: theme.selectionColor }}
          />
          <span style={{ fontSize: 10, textAlign: 'center', color: theme.panelText }}>{(first as any).borderRadius ?? 0}px</span>
        </div>
      )}

      {/* Opacity */}
      <div style={sectionStyle}>
        <span>Opacity</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={first.opacity}
          onChange={e => onUpdate({ opacity: parseFloat(e.target.value) })}
          style={{ width: 55, accentColor: theme.selectionColor }}
        />
      </div>

      {/* Shadow */}
      <div style={sectionStyle}>
        <span>Shadow</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[
            { label: 'None', value: '' },
            { label: 'S', value: '2 2 4 rgba(0,0,0,0.2)' },
            { label: 'M', value: '4 4 10 rgba(0,0,0,0.25)' },
            { label: 'L', value: '6 6 20 rgba(0,0,0,0.3)' },
          ].map(s => {
            const current = first.shadow || '';
            const isActive = current === s.value;
            return (
              <button
                key={s.label}
                onClick={() => onUpdate({ shadow: s.value || undefined } as any)}
                style={{
                  padding: '2px 6px', fontSize: 10, fontWeight: 600,
                  border: `1px solid ${isActive ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4, background: isActive ? theme.panelActive : 'transparent',
                  cursor: 'pointer', color: theme.panelText, fontFamily: 'inherit',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lock / Unlock */}
      <button
        onClick={() => onUpdate({ locked: !first.locked })}
        title={first.locked ? 'Unlock element' : 'Lock element'}
        style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${first.locked ? theme.selectionColor : theme.panelBorder}`,
          borderRadius: 4, background: first.locked ? theme.panelActive : 'transparent',
          cursor: 'pointer', color: theme.panelText, alignSelf: 'center', fontFamily: 'inherit',
        }}
      >
        {first.locked ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        )}
      </button>

      {/* Embed URL */}
      {isEmbed && (
        <div style={sectionStyle}>
          <span>URL</span>
          <input
            type="text"
            placeholder="https://..."
            value={(first as any).url || ''}
            onChange={e => onUpdate({ url: e.target.value } as any)}
            style={{
              width: 120, height: 22, fontSize: 10,
              border: `1px solid ${theme.panelBorder}`, borderRadius: 4,
              background: 'transparent', color: theme.panelText,
              padding: '0 4px', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', height: 28,
          border: `1px solid ${theme.panelBorder}`, borderRadius: 4,
          background: 'transparent', cursor: 'pointer',
          color: '#e03131', alignSelf: 'center', fontFamily: 'inherit',
          fontSize: 11, fontWeight: 600,
        }}
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  );
};
