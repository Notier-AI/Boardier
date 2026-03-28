/**
 * @boardier-module ui/IconPicker
 * @boardier-category UI
 * @boardier-description Searchable icon picker dialog that renders icons from react-icons sets (Feather, Material Design, Font Awesome, etc.). Supports lazy loading, search filtering, and set tabs.
 * @boardier-since 0.1.0
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BoardierTheme } from '../themes/types';
import { feedIconModule } from '../utils/iconResolver';

interface IconPickerProps {
  theme: BoardierTheme;
  onPick: (iconName: string, iconSet: string, svgMarkup: string) => void;
  onClose: () => void;
}

interface IconEntry {
  name: string;
  set: string;
  component: React.ComponentType<{ size?: number; color?: string }>;
}

// Icon set loaders — lazily import each set
const ICON_SETS: { id: string; label: string; loader: () => Promise<Record<string, any>> }[] = [
  { id: 'fi', label: 'Feather', loader: () => import('react-icons/fi') },
  { id: 'hi2', label: 'Hero', loader: () => import('react-icons/hi2') },
  { id: 'lu', label: 'Lucide', loader: () => import('react-icons/lu') },
  { id: 'md', label: 'Material', loader: () => import('react-icons/md') },
  { id: 'bi', label: 'Bootstrap', loader: () => import('react-icons/bi') },
  { id: 'ai', label: 'Ant Design', loader: () => import('react-icons/ai') },
  { id: 'bs', label: 'Bootstrap', loader: () => import('react-icons/bs') },
  { id: 'fa6', label: 'Font Awesome', loader: () => import('react-icons/fa6') },
  { id: 'io5', label: 'Ionicons', loader: () => import('react-icons/io5') },
  { id: 'ri', label: 'Remix', loader: () => import('react-icons/ri') },
  { id: 'tb', label: 'Tabler', loader: () => import('react-icons/tb') },
  { id: 'pi', label: 'Phosphor', loader: () => import('react-icons/pi') },
  { id: 'vsc', label: 'VS Code', loader: () => import('react-icons/vsc') },
  { id: 'go', label: 'Octicons', loader: () => import('react-icons/go') },
  { id: 'ci', label: 'Circum', loader: () => import('react-icons/ci') },
  { id: 'cg', label: 'CSS.gg', loader: () => import('react-icons/cg') },
  { id: 'gr', label: 'Grommet', loader: () => import('react-icons/gr') },
  { id: 'rx', label: 'Radix', loader: () => import('react-icons/rx') },
  { id: 'si', label: 'Simple', loader: () => import('react-icons/si') },
  { id: 'sl', label: 'Simple Line', loader: () => import('react-icons/sl') },
  { id: 'ti', label: 'Typicons', loader: () => import('react-icons/ti') },
  { id: 'wi', label: 'Weather', loader: () => import('react-icons/wi') },
];

function iconToSvg(Component: React.ComponentType<{ size?: number; color?: string }>): string {
  const markup = renderToStaticMarkup(React.createElement(Component, { size: 24, color: 'currentColor' }));
  // Ensure it has xmlns for standalone SVG rendering
  if (markup.includes('xmlns')) return markup;
  return markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

const GRID_SIZE = 200; // Show 200 icons at a time for performance

// Cache for already-loaded icon sets (survives across picker open/close)
const allIconsCache = new Map<string, IconEntry[]>();

export const IconPicker: React.FC<IconPickerProps> = ({ theme, onPick, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeSet, setActiveSet] = useState('all');
  const [icons, setIcons] = useState<IconEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search for the "All" tab to avoid expensive filtering on every keystroke
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (activeSet === 'all') {
      searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 200);
    } else {
      setDebouncedSearch(search);
    }
    return () => clearTimeout(searchTimerRef.current);
  }, [search, activeSet]);

  // Load icon set (or all sets)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);

    if (activeSet === 'all') {
      // Load all icon sets in parallel
      const cachedEntries: IconEntry[] = [];
      const toLoad: typeof ICON_SETS = [];
      for (const setDef of ICON_SETS) {
        const cached = allIconsCache.get(setDef.id);
        if (cached) { cachedEntries.push(...cached); } else { toLoad.push(setDef); }
      }

      if (toLoad.length === 0) {
        if (!cancelled) { setIcons(cachedEntries); setLoading(false); }
        return () => { cancelled = true; };
      }

      // Show cached icons immediately, then progressively add more
      if (cachedEntries.length > 0 && !cancelled) {
        setIcons(cachedEntries);
        setLoading(true); // still loading more
      }

      Promise.all(
        toLoad.map(setDef =>
          setDef.loader().then(mod => {
            const entries: IconEntry[] = [];
            for (const [name, comp] of Object.entries(mod)) {
              if (typeof comp === 'function' && name !== 'default') {
                entries.push({ name, set: setDef.id, component: comp as any });
              }
            }
            allIconsCache.set(setDef.id, entries);
            feedIconModule(setDef.id, mod as any);
            return entries;
          }).catch(() => [] as IconEntry[])
        )
      ).then(results => {
        if (cancelled) return;
        const allEntries: IconEntry[] = [];
        for (const setDef of ICON_SETS) {
          const cached = allIconsCache.get(setDef.id);
          if (cached) allEntries.push(...cached);
        }
        setIcons(allEntries);
        setLoading(false);
      });

      return () => { cancelled = true; };
    }

    // Single set
    const setDef = ICON_SETS.find(s => s.id === activeSet);
    if (!setDef) return;

    const cached = allIconsCache.get(activeSet);
    if (cached) {
      if (!cancelled) { setIcons(cached); setLoading(false); }
      return () => { cancelled = true; };
    }

    setDef.loader().then(mod => {
      if (cancelled) return;
      const entries: IconEntry[] = [];
      for (const [name, comp] of Object.entries(mod)) {
        if (typeof comp === 'function' && name !== 'default') {
          entries.push({ name, set: activeSet, component: comp as any });
        }
      }
      allIconsCache.set(activeSet, entries);
      feedIconModule(activeSet, mod as any);
      setIcons(entries);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setIcons([]); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [activeSet]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return icons;
    const q = debouncedSearch.toLowerCase();
    return icons.filter(i => i.name.toLowerCase().includes(q));
  }, [icons, debouncedSearch]);

  const paged = useMemo(() => filtered.slice(0, (page + 1) * GRID_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setPage(p => p + 1);
    }
  }, [hasMore]);

  const handlePick = useCallback((entry: IconEntry) => {
    const svg = iconToSvg(entry.component);
    onPick(entry.name, entry.set, svg);
  }, [onPick]);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 520,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: theme.panelBackground,
          border: `${theme.uiStyle.panelBorderWidth}px ${theme.uiStyle.panelBorderStyle} ${theme.panelBorder}`,
          borderRadius: theme.uiStyle.panelBorderRadius,
          boxShadow: theme.uiStyle.panelShadow,
          zIndex: 101,
          fontFamily: theme.uiFontFamily,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.panelBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.panelText, flex: 1 }}>Icons</h3>
          <span style={{ fontSize: 11, color: theme.panelTextSecondary }}>{filtered.length} icons</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.panelTextSecondary, padding: 4 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 16px' }}>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search icons..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 13,
              border: `${theme.uiStyle.inputBorderWidth}px solid ${theme.panelBorder}`,
              borderRadius: theme.uiStyle.inputBorderRadius,
              background: 'transparent',
              color: theme.panelText,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Icon set tabs */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', padding: '0 16px', borderBottom: `1px solid ${theme.panelBorder}` }}>
          <button
            onClick={() => setActiveSet('all')}
            style={{
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: activeSet === 'all' ? 700 : 500,
              color: activeSet === 'all' ? theme.selectionColor : theme.panelTextSecondary,
              background: 'transparent',
              border: 'none',
              borderBottom: activeSet === 'all' ? `2px solid ${theme.selectionColor}` : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            All
          </button>
          {ICON_SETS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSet(s.id)}
              style={{
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: activeSet === s.id ? 700 : 500,
                color: activeSet === s.id ? theme.selectionColor : theme.panelTextSecondary,
                background: 'transparent',
                border: 'none',
                borderBottom: activeSet === s.id ? `2px solid ${theme.selectionColor}` : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Icon grid */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            alignContent: 'flex-start',
            minHeight: 200,
          }}
        >
          {loading && (
            <div style={{ width: '100%', textAlign: 'center', padding: 40, color: theme.panelTextSecondary, fontSize: 13 }}>
              Loading icons...
            </div>
          )}
          {!loading && paged.length === 0 && (
            <div style={{ width: '100%', textAlign: 'center', padding: 40, color: theme.panelTextSecondary, fontSize: 13 }}>
              No icons found
            </div>
          )}
          {paged.map(entry => (
            <button
              key={entry.name}
              onClick={() => handlePick(entry)}
              title={entry.name}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid transparent`,
                borderRadius: theme.uiStyle.buttonBorderRadius,
                background: 'transparent',
                cursor: 'pointer',
                color: theme.panelText,
                padding: 0,
                transition: 'background 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.panelHover;
                e.currentTarget.style.borderColor = theme.panelBorder;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {React.createElement(entry.component, { size: 20 })}
            </button>
          ))}
          {hasMore && !loading && (
            <div style={{ width: '100%', textAlign: 'center', padding: 8, color: theme.panelTextSecondary, fontSize: 11 }}>
              Scroll for more...
            </div>
          )}
        </div>
      </div>
    </>
  );
};
