/**
 * @boardier-module ui/ExportDialog
 * @boardier-category UI
 * @boardier-description Modal dialog for exporting and importing the scene. Supports PNG, SVG, HTML, Boardier (.boardier), and JSON formats with file download and clipboard copy. Also provides import from Boardier and JSON files.
 * @boardier-since 0.1.0
 * @boardier-changed 0.4.2 Mobile-responsive dialog sizing with fluid width
 * @boardier-changed 0.3.2 Added light/dark mode export option with current, light, and dark background modes
 * @boardier-changed 0.4.0 Full rehaul — tabbed format picker, HTML/SVG/Boardier export, import from Boardier/JSON, clipboard copy for all text formats
 */
import React, { useState, useCallback } from 'react';
import type { BoardierTheme } from '../themes/types';
import type { BoardierElement, ViewState } from '../core/types';
import {
  exportToPNG,
  exportToJSON,
  exportToSVG,
  exportToHTML,
  exportToBoardier,
  importFromBoardier,
  importFromJSON,
  copyToClipboard,
  copyImageToClipboard,
  downloadString,
  downloadBlob,
  openFilePicker,
} from '../utils/export';

type ExportFormat = 'png' | 'svg' | 'html' | 'boardier' | 'json';
type DialogTab = 'export' | 'import';

interface ExportDialogProps {
  elements: BoardierElement[];
  viewState: ViewState;
  backgroundColor: string;
  altBackgroundColor: string;
  isDark: boolean;
  theme: BoardierTheme;
  onClose: () => void;
  onImport?: (elements: BoardierElement[], viewState?: ViewState) => void;
}

// ─── Icons ────────────────────────────────────────────────────────

const DownloadIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
);
const ClipboardIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
);
const CloseIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);
const UploadIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
);
const CheckIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
);

const FORMAT_INFO: Record<ExportFormat, { label: string; ext: string; mime: string; supportsClipboard: boolean; description: string }> = {
  png: { label: 'PNG', ext: '.png', mime: 'image/png', supportsClipboard: true, description: 'Raster image — best for sharing' },
  svg: { label: 'SVG', ext: '.svg', mime: 'image/svg+xml', supportsClipboard: true, description: 'Vector graphic — scalable, editable' },
  html: { label: 'HTML', ext: '.html', mime: 'text/html', supportsClipboard: true, description: 'Standalone web page with embedded SVG' },
  boardier: { label: 'Boardier', ext: '.boardier', mime: 'application/json', supportsClipboard: true, description: 'Native format — re-importable with full fidelity' },
  json: { label: 'JSON', ext: '.json', mime: 'application/json', supportsClipboard: true, description: 'Scene data — compatible with the engine API' },
};

export const ExportDialog: React.FC<ExportDialogProps> = ({ elements, viewState, backgroundColor, altBackgroundColor, isDark, theme, onClose, onImport }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [tab, setTab] = useState<DialogTab>('export');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transparentBg, setTransparentBg] = useState(false);
  const [exportMode, setExportMode] = useState<'current' | 'light' | 'dark'>('current');
  const [importError, setImportError] = useState<string | null>(null);

  const resolvedBg = exportMode === 'current'
    ? backgroundColor
    : exportMode === 'dark'
      ? (isDark ? backgroundColor : altBackgroundColor)
      : (isDark ? altBackgroundColor : backgroundColor);

  const generateContent = useCallback(async (): Promise<{ text?: string; blob?: Blob }> => {
    switch (format) {
      case 'png': {
        const blob = await exportToPNG(elements, resolvedBg, 40, 2, transparentBg);
        return { blob };
      }
      case 'svg':
        return { text: exportToSVG(elements, resolvedBg, 40) };
      case 'html':
        return { text: exportToHTML(elements, resolvedBg, 40) };
      case 'boardier':
        return { text: exportToBoardier(elements, viewState) };
      case 'json':
        return { text: exportToJSON(elements, viewState) };
    }
  }, [format, elements, viewState, resolvedBg, transparentBg]);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const { text, blob } = await generateContent();
      const info = FORMAT_INFO[format];
      if (blob) {
        downloadBlob(blob, `boardier-export${info.ext}`);
      } else if (text) {
        downloadString(text, `boardier-export${info.ext}`, info.mime);
      }
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const handleCopy = async () => {
    setExporting(true);
    try {
      const { text, blob } = await generateContent();
      if (format === 'png' && blob) {
        await copyImageToClipboard(blob);
      } else if (text) {
        await copyToClipboard(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (importFormat: 'boardier' | 'json') => {
    setImportError(null);
    try {
      const accept = importFormat === 'boardier' ? '.boardier,.json' : '.json';
      const content = await openFilePicker(accept);
      const result = importFormat === 'boardier'
        ? importFromBoardier(content)
        : importFromJSON(content);
      if (result.elements.length === 0) {
        setImportError('File contains no elements');
        return;
      }
      onImport?.(result.elements, result.viewState);
      onClose();
    } catch (e: any) {
      setImportError(e.message || 'Failed to import file');
    }
  };

  // ─── Styles ──────────────────────────────────────

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    border: 'none',
    borderBottom: `2px solid ${active ? theme.selectionColor : 'transparent'}`,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? theme.selectionColor : theme.panelTextSecondary,
    fontFamily: theme.uiFontFamily,
    transition: 'all 0.15s',
  });

  const formatBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    border: `${theme.uiStyle.buttonBorderWidth}px solid ${active ? theme.selectionColor : theme.panelBorder}`,
    borderRadius: theme.uiStyle.buttonBorderRadius,
    background: active ? theme.panelActive : 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    color: active ? theme.selectionColor : theme.panelText,
    fontFamily: theme.uiFontFamily,
    transition: 'all 0.15s',
  });

  const actionBtnStyle: React.CSSProperties = {
    padding: '9px 18px',
    border: `${theme.uiStyle.buttonBorderWidth}px solid ${theme.panelBorder}`,
    borderRadius: theme.uiStyle.buttonBorderRadius,
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
    flex: 1,
    justifyContent: 'center',
  };

  const importBtnStyle: React.CSSProperties = {
    ...actionBtnStyle,
    flex: 'none',
    width: '100%',
    justifyContent: 'center',
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
          background: theme.panelBackground,
          border: `${theme.uiStyle.panelBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
          borderRadius: theme.uiStyle.panelBorderRadius,
          boxShadow: theme.uiStyle.panelShadow,
          zIndex: 101,
          fontFamily: theme.uiFontFamily,
          minWidth: 320,
          maxWidth: 440,
          width: '95vw',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 0', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.panelText, flex: 1 }}>Export / Import</h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.panelTextSecondary, padding: 4 }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${theme.panelBorder}`, margin: '12px 0 0' }}>
          <button style={tabStyle(tab === 'export')} onClick={() => setTab('export')}>Export</button>
          <button style={tabStyle(tab === 'import')} onClick={() => setTab('import')}>Import</button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px 20px' }}>
          {tab === 'export' ? (
            <>
              {/* Format picker */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {(Object.keys(FORMAT_INFO) as ExportFormat[]).map(f => (
                  <button key={f} style={formatBtnStyle(format === f)} onClick={() => setFormat(f)}>
                    {FORMAT_INFO[f].label}
                  </button>
                ))}
              </div>

              {/* Format description */}
              <p style={{ fontSize: 11, color: theme.panelTextSecondary, margin: '0 0 14px', lineHeight: 1.4 }}>
                {FORMAT_INFO[format].description}
              </p>

              {/* PNG-specific options */}
              {format === 'png' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.panelText, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={e => setTransparentBg(e.target.checked)}
                      style={{ accentColor: theme.selectionColor }}
                    />
                    Transparent background
                  </label>
                </div>
              )}

              {/* Light/dark mode (for visual formats) */}
              {(format === 'png' || format === 'svg' || format === 'html') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.panelText, marginBottom: 14 }}>
                  <span style={{ fontWeight: 600 }}>Mode:</span>
                  {(['current', 'light', 'dark'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setExportMode(m)}
                      style={{
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: exportMode === m ? 700 : 500,
                        border: `${theme.uiStyle.buttonBorderWidth}px solid ${exportMode === m ? theme.selectionColor : theme.panelBorder}`,
                        borderRadius: theme.uiStyle.buttonBorderRadius,
                        background: exportMode === m ? theme.panelActive : 'transparent',
                        color: exportMode === m ? theme.selectionColor : theme.panelText,
                        cursor: 'pointer',
                        fontFamily: theme.uiFontFamily,
                        transition: 'all 0.1s',
                      }}
                    >
                      {m === 'current' ? (isDark ? '● Dark' : '○ Light') : m === 'light' ? '○ Light' : '● Dark'}
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={actionBtnStyle} onClick={handleDownload} disabled={exporting}>
                  <DownloadIcon /> {exporting ? 'Exporting...' : `Download ${FORMAT_INFO[format].ext}`}
                </button>
                {FORMAT_INFO[format].supportsClipboard && (
                  <button style={actionBtnStyle} onClick={handleCopy} disabled={exporting}>
                    {copied ? <CheckIcon /> : <ClipboardIcon />} {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>

              {/* Element count */}
              <p style={{ fontSize: 10, color: theme.panelTextSecondary, margin: '10px 0 0', textAlign: 'center' }}>
                {elements.length} element{elements.length !== 1 ? 's' : ''} will be exported
              </p>
            </>
          ) : (
            <>
              {/* Import tab */}
              <p style={{ fontSize: 12, color: theme.panelTextSecondary, margin: '0 0 14px', lineHeight: 1.5 }}>
                Import elements from a Boardier or JSON file. Elements will be added to the current canvas.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button style={importBtnStyle} onClick={() => handleImport('boardier')}>
                  <UploadIcon /> Import Boardier file (.boardier)
                </button>
                <button style={importBtnStyle} onClick={() => handleImport('json')}>
                  <UploadIcon /> Import JSON file (.json)
                </button>
              </div>

              {importError && (
                <p style={{ fontSize: 12, color: '#e03131', margin: '10px 0 0', fontWeight: 500 }}>
                  {importError}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
