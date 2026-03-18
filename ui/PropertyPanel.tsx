import React, { useRef } from 'react';
import type { BoardierElement } from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { STROKE_COLORS, FILL_COLORS, FONT_SIZES, FONT_FAMILIES, HANDWRITTEN_FONT } from '../utils/colors';

interface PropertyPanelProps {
  elements: BoardierElement[];
  onUpdate: (updates: Partial<BoardierElement>) => void;
  onDelete: () => void;
  theme: BoardierTheme;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = React.memo(({ elements, onUpdate, onDelete, theme }) => {
  if (elements.length === 0) return null;
  const strokePickerRef = useRef<HTMLInputElement>(null);
  const fillPickerRef = useRef<HTMLInputElement>(null);

  const first = elements[0];
  const hasText = elements.some(e => e.type === 'text');
  const hasLabel = elements.some(e => 'label' in e);
  const hasTextOrLabel = hasText || hasLabel;
  const isNotLine = elements.every(e => e.type !== 'line' && e.type !== 'arrow' && e.type !== 'freehand');

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
    <span style={{ position: 'relative' }}>
      <button
        onClick={() => pickerRef.current?.click()}
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1px dashed ${theme.panelBorder}`,
          background: 'transparent', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.panelTextSecondary, fontSize: 12,
        }}
      >
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <input
        ref={pickerRef}
        type="color"
        value={currentColor === 'transparent' ? '#000000' : currentColor}
        onChange={e => onPick(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />
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
                onUpdate({ backgroundColor: c, fillStyle: c === 'transparent' ? 'none' : 'solid' }),
              ),
            )}
            {customColorBtn(first.backgroundColor, c => onUpdate({ backgroundColor: c, fillStyle: 'solid' }), fillPickerRef)}
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

      {/* Font size for text */}
      {hasText && (
        <div style={sectionStyle}>
          <span>Size</span>
          <div style={{ display: 'flex', gap: 4 }}>
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

      {/* Roughness */}
      <div style={sectionStyle}>
        <span>Style</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[{ v: 0, label: 'Clean' }, { v: 1, label: 'Sketch' }].map(r => (
            <button
              key={r.v}
              onClick={() => onUpdate({ roughness: r.v })}
              style={{
                padding: '2px 6px', fontSize: 10, fontWeight: 600,
                border: `1px solid ${first.roughness === r.v ? theme.selectionColor : theme.panelBorder}`,
                borderRadius: 4, background: first.roughness === r.v ? theme.panelActive : 'transparent',
                cursor: 'pointer', color: theme.panelText, fontFamily: 'inherit',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete"
        style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${theme.panelBorder}`, borderRadius: 4, background: 'transparent',
          cursor: 'pointer', color: '#e03131', alignSelf: 'center', fontFamily: 'inherit',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
});

PropertyPanel.displayName = 'PropertyPanel';
