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

const CameraIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const FileIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
);
const ClipboardIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>
);
const CloseIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
);

export const ExportDialog: React.FC<ExportDialogProps> = ({ elements, viewState, backgroundColor, theme, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [transparentBg, setTransparentBg] = useState(false);

  const handlePNG = async () => {
    setExporting(true);
    try {
      const blob = await exportToPNG(elements, backgroundColor, 40, 2, transparentBg);
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
    display: 'flex',
    alignItems: 'center',
    gap: 8,
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
          {/* Transparent background option */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: theme.panelText,
              cursor: 'pointer',
              marginBottom: 4,
            }}
          >
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={e => setTransparentBg(e.target.checked)}
              style={{ accentColor: theme.selectionColor }}
            />
            Transparent background (PNG)
          </label>
          <button style={btnStyle} onClick={handlePNG} disabled={exporting}>
            <CameraIcon /> {exporting ? 'Exporting...' : 'Export as PNG'}
          </button>
          <button style={btnStyle} onClick={handleJSON}><FileIcon /> Download JSON</button>
          <button style={btnStyle} onClick={handleCopyJSON}><ClipboardIcon /> Copy JSON to clipboard</button>
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
            color: theme.panelTextSecondary,
            padding: 4,
          }}
        >
          <CloseIcon />
        </button>
      </div>
    </>
  );
};
