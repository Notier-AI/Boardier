import React, { useState, useRef, useCallback } from 'react';
import type { BoardierTheme } from '../themes/types';

interface TooltipProps {
  text: string;
  shortcut?: string;
  theme: BoardierTheme;
  children: React.ReactElement;
  /** Placement: where the tooltip appears relative to the anchor */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay in ms before showing */
  delay?: number;
}

/**
 * Themed tooltip that replaces native `title` attributes.
 * Fully styleable via BoardierTheme.
 */
export const Tooltip: React.FC<TooltipProps> = React.memo(({ text, shortcut, theme, children, placement = 'right', delay = 400 }) => {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    timer.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(false);
  }, []);

  const placementStyle: React.CSSProperties = (() => {
    switch (placement) {
      case 'top': return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 };
      case 'bottom': return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 };
      case 'left': return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 };
      case 'right': return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 };
    }
  })();

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onPointerDown={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            ...placementStyle,
            zIndex: 100,
            padding: '4px 8px',
            borderRadius: Math.max(4, theme.borderRadius - 4),
            background: theme.tooltipBackground,
            color: theme.tooltipText,
            border: `1px solid ${theme.tooltipBorder}`,
            boxShadow: theme.tooltipShadow,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: theme.uiFontFamily,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {text}
          {shortcut && (
            <kbd style={{
              fontSize: 10,
              padding: '1px 4px',
              borderRadius: 3,
              background: `${theme.tooltipText}15`,
              border: `1px solid ${theme.tooltipText}25`,
              fontFamily: 'system-ui, monospace',
            }}>
              {shortcut}
            </kbd>
          )}
        </span>
      )}
    </span>
  );
});

Tooltip.displayName = 'Tooltip';
