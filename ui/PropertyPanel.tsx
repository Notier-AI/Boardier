import React from 'react';
import type { BoardierElement } from '../core/types';
import type { BoardierTheme } from '../themes/types';
import { STROKE_COLORS, FILL_COLORS, STROKE_WIDTHS, FONT_SIZES } from '../utils/colors';

interface PropertyPanelProps {
  elements: BoardierElement[];
  onUpdate: (updates: Partial<BoardierElement>) => void;
  onDelete: () => void;
  theme: BoardierTheme;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ elements, onUpdate, onDelete, theme }) => {
  if (elements.length === 0) return null;

  const first = elements[0];
  const hasText = elements.some(e => e.type === 'text');
  const isNotLine = elements.every(e => e.type !== 'line' && e.type !== 'arrow' && e.type !== 'freehand');

  const swatch = (color: string, active: boolean, onClick: () => void) => (
    <button
      key={color}
      onClick={onClick}
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        border: active ? `2px solid ${theme.selectionColor}` : `1px solid ${theme.panelBorder}`,
        background: color === 'transparent'
          ? `repeating-conic-gradient(${theme.panelBorder} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
          : color,
        cursor: 'pointer',
        padding: 0,
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

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 16,
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
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 120 }}>
          {STROKE_COLORS.map(c => swatch(c, first.strokeColor === c, () => onUpdate({ strokeColor: c })))}
        </div>
      </div>

      {/* Fill color (not for lines/freehand) */}
      {isNotLine && (
        <div style={sectionStyle}>
          <span>Fill</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 120 }}>
            {FILL_COLORS.map(c =>
              swatch(c, first.backgroundColor === c, () =>
                onUpdate({ backgroundColor: c, fillStyle: c === 'transparent' ? 'none' : 'solid' }),
              ),
            )}
          </div>
        </div>
      )}

      {/* Stroke width */}
      <div style={sectionStyle}>
        <span>Width</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => onUpdate({ strokeWidth: w })}
              style={{
                width: 28,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${first.strokeWidth === w ? theme.selectionColor : theme.panelBorder}`,
                borderRadius: 4,
                background: first.strokeWidth === w ? theme.panelActive : 'transparent',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                color: theme.panelText,
                fontFamily: 'inherit',
              }}
            >
              {w}
            </button>
          ))}
        </div>
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
                  width: 28,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${(first as any).fontSize === s ? theme.selectionColor : theme.panelBorder}`,
                  borderRadius: 4,
                  background: (first as any).fontSize === s ? theme.panelActive : 'transparent',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.panelText,
                  fontFamily: 'inherit',
                }}
              >
                {s}
              </button>
            ))}
          </div>
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
          style={{ width: 70, accentColor: theme.selectionColor }}
        />
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete"
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: 4,
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 14,
          color: '#e03131',
          alignSelf: 'center',
          fontFamily: 'inherit',
        }}
      >
        ✕
      </button>
    </div>
  );
};
