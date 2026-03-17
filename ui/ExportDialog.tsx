import React, { useState } from 'react';
import type { BoardierTheme } from '../themes/types';
import type { BoardierElement, ViewState } from '../core/types';
import { exportToPNG, exportToJSON } from '../utils/export';

interface ExportDialogProps {
  elements: BoardierElement[];
  viewState: ViewState;
  backgroundColor: string;
  theme: BoardierTheme;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ elements, viewState, backgroundColor, theme, onClose }) => {
  const [exporting, setExporting] = useState(false);

  const handlePNG = async () => {
    setExporting(true);
    try {
      const blob = await exportToPNG(elements, backgroundColor);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boardier-canvas.png';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const handleJSON = () => {
    const json = exportToJSON(elements, viewState);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boardier-canvas.json';
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleCopyJSON = async () => {
    const json = exportToJSON(elements, viewState);
    await navigator.clipboard.writeText(json);
    onClose();
  };

  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: theme.borderRadius - 2,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: theme.panelText,
    fontFamily: theme.uiFontFamily,
    transition: 'background 0.1s',
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          padding: '24px 28px',
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: theme.borderRadius,
          boxShadow: theme.shadow,
          zIndex: 101,
          fontFamily: theme.uiFontFamily,
          minWidth: 280,
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: theme.panelText }}>Export Canvas</h3>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button style={btnStyle} onClick={handlePNG} disabled={exporting}>
            {exporting ? 'Exporting…' : '📷  Export as PNG'}
          </button>
          <button style={btnStyle} onClick={handleJSON}>📄  Download JSON</button>
          <button style={btnStyle} onClick={handleCopyJSON}>📋  Copy JSON to clipboard</button>
        </div>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 18,
            color: theme.panelTextSecondary,
          }}
        >
          ✕
        </button>
      </div>
    </>
  );
};
