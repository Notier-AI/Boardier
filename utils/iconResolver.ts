/**
 * @boardier-module utils/iconResolver
 * @boardier-category Utilities
 * @boardier-description Resolves react-icons names (e.g. FiCheck, LuStar) to SVG markup strings
 * for rendering on canvas. Lazy-loads icon sets on demand, caches results, and provides
 * fuzzy matching when an exact icon name is not found. When the IconPicker has already
 * loaded icon sets, its cache is shared so icons resolve instantly.
 * @boardier-since 0.4.5
 */

import { createElement } from 'react';

type RenderFn = (element: React.ReactElement) => string;
let _renderToStaticMarkup: RenderFn | null | undefined; // undefined = not loaded yet

async function getRender(): Promise<RenderFn | null> {
  if (_renderToStaticMarkup !== undefined) return _renderToStaticMarkup;
  try {
    const mod = await import('react-dom/server');
    _renderToStaticMarkup = mod.renderToStaticMarkup as RenderFn;
  } catch {
    _renderToStaticMarkup = null;
  }
  return _renderToStaticMarkup;
}

// Eagerly start loading renderToStaticMarkup
getRender();

type IconModule = Record<string, React.ComponentType<{ size?: number; color?: string }>>;

/** Explicit dynamic import loaders for each react-icons set (keeps bundlers happy). */
const SET_LOADERS: Record<string, () => Promise<IconModule>> = {
  fi:  () => import('react-icons/fi') as any,
  hi2: () => import('react-icons/hi2') as any,
  lu:  () => import('react-icons/lu') as any,
  md:  () => import('react-icons/md') as any,
  bi:  () => import('react-icons/bi') as any,
  ai:  () => import('react-icons/ai') as any,
  bs:  () => import('react-icons/bs') as any,
  fa6: () => import('react-icons/fa6') as any,
  io5: () => import('react-icons/io5') as any,
  ri:  () => import('react-icons/ri') as any,
  tb:  () => import('react-icons/tb') as any,
  pi:  () => import('react-icons/pi') as any,
  vsc: () => import('react-icons/vsc') as any,
  go:  () => import('react-icons/go') as any,
  ci:  () => import('react-icons/ci') as any,
  cg:  () => import('react-icons/cg') as any,
  gr:  () => import('react-icons/gr') as any,
  rx:  () => import('react-icons/rx') as any,
  si:  () => import('react-icons/si') as any,
  sl:  () => import('react-icons/sl') as any,
  ti:  () => import('react-icons/ti') as any,
  wi:  () => import('react-icons/wi') as any,
};

/** Map icon-name prefix → set id used by SET_LOADERS. */
const PREFIX_TO_SET: Record<string, string> = {
  Vsc: 'vsc', Cg: 'cg', Gr: 'gr', Sl: 'sl',       // 3-char first
  Fi: 'fi', Hi: 'hi2', Lu: 'lu', Md: 'md', Bi: 'bi',
  Ai: 'ai', Bs: 'bs', Fa: 'fa6', Io: 'io5', Ri: 'ri',
  Tb: 'tb', Pi: 'pi', Go: 'go', Ci: 'ci', Rx: 'rx',
  Si: 'si', Ti: 'ti', Wi: 'wi',
};

/** Prefixes sorted longest-first so "Vsc" matches before "Vs". */
const SORTED_PREFIXES = Object.keys(PREFIX_TO_SET).sort((a, b) => b.length - a.length);

/** Sets to search when the icon name has no recognised prefix. */
const PREFERRED_SETS: { prefix: string; set: string }[] = [
  { prefix: 'Lu', set: 'lu' },
  { prefix: 'Fi', set: 'fi' },
  { prefix: 'Tb', set: 'tb' },
  { prefix: 'Md', set: 'md' },
  { prefix: 'Ri', set: 'ri' },
];

// ─── Caches ──────────────────────────────────────────────────────

const svgCache  = new Map<string, string>();
const moduleCache = new Map<string, IconModule>();
const pendingLoads = new Set<string>();
const failedNames  = new Set<string>();

let _onResolve: (() => void) | null = null;

/** Register a callback that fires after an icon set loads (typically triggers a canvas re-render). */
export function setIconResolveCallback(cb: () => void): void { _onResolve = cb; }

/**
 * Feed pre-loaded icon modules into the resolver cache.
 * Called by IconPicker when it loads icon sets, so the text renderer
 * can resolve icons instantly without triggering its own dynamic imports.
 */
export function feedIconModule(setId: string, mod: IconModule): void {
  moduleCache.set(setId, mod);
}

// ─── Helpers ─────────────────────────────────────────────────────

function extractPrefix(name: string): string | null {
  for (const prefix of SORTED_PREFIXES) {
    if (name.length > prefix.length && name.startsWith(prefix) && /[A-Z0-9]/.test(name[prefix.length])) {
      return prefix;
    }
  }
  return null;
}

/** Serialize a React element tree to SVG markup (fallback when renderToStaticMarkup unavailable) */
function reactElementToSvg(el: any): string {
  if (!el || typeof el !== 'object') return typeof el === 'string' ? el : '';
  if (Array.isArray(el)) return el.map(reactElementToSvg).join('');
  const tag = el.type;
  if (typeof tag !== 'string') return '';
  const props = el.props || {};
  let attrs = '';
  for (const [k, v] of Object.entries(props)) {
    if (k === 'children' || v == null || typeof v === 'function') continue;
    const attr = k === 'className' ? 'class' : k.replace(/([A-Z])/g, '-$1').toLowerCase();
    attrs += ` ${attr}="${String(v)}"`;
  }
  const children = props.children;
  const inner = children ? reactElementToSvg(children) : '';
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

function componentToSvg(Comp: React.ComponentType<{ size?: number; color?: string }>): string {
  try {
    if (_renderToStaticMarkup) {
      const markup = _renderToStaticMarkup(createElement(Comp, { size: 24, color: 'currentColor' }));
      if (markup.includes('xmlns')) return markup;
      return markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Fallback: render the React element tree manually
    const el = (Comp as any)({ size: 24, color: 'currentColor' });
    if (!el) return '';
    let svg = reactElementToSvg(el);
    if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    return svg;
  } catch {
    return '';
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

/** Find the best matching icon component in a loaded module. */
function findInModule(name: string, prefix: string, mod: IconModule): React.ComponentType<any> | null {
  // Exact
  if (mod[name] && typeof mod[name] === 'function') return mod[name];

  // Fuzzy: compare suffixes (part after prefix)
  const querySuffix = name.slice(prefix.length).toLowerCase();
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const key of Object.keys(mod)) {
    if (key === 'default' || typeof mod[key] !== 'function') continue;
    const keySuffix = key.slice(prefix.length).toLowerCase();
    // Quick: exact suffix (case-insensitive)
    if (keySuffix === querySuffix) return mod[key] as any;
    // Substring containment scored lower than edit distance
    if (keySuffix.includes(querySuffix) || querySuffix.includes(keySuffix)) {
      const d = Math.abs(keySuffix.length - querySuffix.length);
      if (d < bestDist) { bestDist = d; bestKey = key; }
    } else {
      const d = levenshtein(querySuffix, keySuffix);
      if (d < bestDist) { bestDist = d; bestKey = key; }
    }
  }
  // Accept if distance is reasonable (at most 40% of query or 3 chars)
  if (bestKey && bestDist <= Math.max(3, querySuffix.length * 0.4)) {
    return mod[bestKey] as any;
  }
  return null;
}

function loadSet(setId: string): void {
  if (pendingLoads.has(setId) || moduleCache.has(setId)) return;
  const loader = SET_LOADERS[setId];
  if (!loader) return;
  pendingLoads.add(setId);
  loader()
    .then(mod => { moduleCache.set(setId, mod); _onResolve?.(); })
    .catch(() => { /* react-icons not installed — silently skip */ })
    .finally(() => { pendingLoads.delete(setId); });
}

/** Pre-load the most common icon sets so bracket icons resolve quickly. */
export function preloadIconSets(): void {
  for (const { set } of PREFERRED_SETS) { loadSet(set); }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Synchronously resolve a react-icons name to SVG markup.
 * Returns cached SVG immediately, or `null` while the icon set loads asynchronously.
 * When the icon becomes available the resolve-callback fires to trigger a re-render.
 *
 * Supports:
 * - Prefixed names: `FiCheck`, `LuStar`, `MdHome`
 * - Unprefixed names: `Check`, `Star` → searches Lucide, Feather, Tabler, Material, Remix
 * - Fuzzy match: `FiCheckmark` → closest match in Feather set
 */
export function resolveIconSvg(name: string): string | null {
  if (svgCache.has(name)) return svgCache.get(name)!;
  if (failedNames.has(name)) return null;

  const prefix = extractPrefix(name);

  if (prefix) {
    const setId = PREFIX_TO_SET[prefix];
    const mod = moduleCache.get(setId);
    if (mod) {
      const comp = findInModule(name, prefix, mod);
      if (comp) {
        const svg = componentToSvg(comp);
        if (svg) { svgCache.set(name, svg); return svg; }
      }
      failedNames.add(name);
      return null;
    }
    loadSet(setId);
    return null;
  }

  // No recognised prefix — search preferred sets for a matching suffix
  let allLoaded = true;
  for (const { prefix: p, set } of PREFERRED_SETS) {
    const mod = moduleCache.get(set);
    if (!mod) { loadSet(set); allLoaded = false; continue; }
    for (const key of Object.keys(mod)) {
      if (key === 'default' || typeof mod[key] !== 'function') continue;
      if (key.slice(p.length).toLowerCase() === name.toLowerCase()) {
        const svg = componentToSvg(mod[key] as any);
        if (svg) { svgCache.set(name, svg); return svg; }
      }
    }
  }

  // If all preferred sets loaded and no match, try fuzzy across them
  if (allLoaded) {
    for (const { prefix: p, set } of PREFERRED_SETS) {
      const mod = moduleCache.get(set)!;
      const comp = findInModule(p + name, p, mod);
      if (comp) {
        const svg = componentToSvg(comp);
        if (svg) { svgCache.set(name, svg); return svg; }
      }
    }
    failedNames.add(name);
  }

  return null;
}
