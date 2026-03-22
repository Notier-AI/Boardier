/**
 * @boardier-module ai/styles
 * @boardier-category AI
 * @boardier-description Style presets and style transfer utilities for Boardier elements.
 * Provides named preset themes (e.g. "professional", "playful", "blueprint") that can be
 * applied to all elements on the canvas in a single call. Also provides style transfer —
 * copy the visual style of one element to selected elements.
 * @boardier-since 0.2.0
 */

import type { BoardierElement, FillStyle, StrokeStyle } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────

/** Style properties that can be transferred between elements. */
export interface ElementStyle {
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: FillStyle;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  roughness?: number;
  opacity?: number;
  shadow?: string;
}

/** A named style preset that transforms elements. */
export interface StylePreset {
  name: string;
  description: string;
  /** Transform element style. Pure function — returns new partial overrides. */
  apply: (element: BoardierElement) => Partial<BoardierElement>;
}

// ─── Style extraction & transfer ──────────────────────────────────

/** Extract transferable style from an element. */
export function extractStyle(element: BoardierElement): ElementStyle {
  return {
    strokeColor: element.strokeColor,
    backgroundColor: element.backgroundColor,
    fillStyle: element.fillStyle,
    strokeWidth: element.strokeWidth,
    strokeStyle: (element as any).strokeStyle,
    roughness: element.roughness,
    opacity: element.opacity,
    shadow: (element as any).shadow,
  };
}

/** Apply extracted style to elements. Returns updated elements without mutating originals. */
export function applyStyle(elements: BoardierElement[], style: ElementStyle): BoardierElement[] {
  return elements.map(el => {
    const updates: Record<string, unknown> = {};
    if (style.strokeColor !== undefined) updates.strokeColor = style.strokeColor;
    if (style.backgroundColor !== undefined) {
      updates.backgroundColor = style.backgroundColor;
      if (style.backgroundColor !== 'transparent' && el.fillStyle === 'none') {
        updates.fillStyle = 'solid';
      }
    }
    if (style.fillStyle !== undefined) updates.fillStyle = style.fillStyle;
    if (style.strokeWidth !== undefined) updates.strokeWidth = style.strokeWidth;
    if (style.roughness !== undefined) updates.roughness = style.roughness;
    if (style.opacity !== undefined) updates.opacity = style.opacity;
    if (style.strokeStyle !== undefined) updates.strokeStyle = style.strokeStyle;
    if (style.shadow !== undefined) updates.shadow = style.shadow;
    return { ...el, ...updates } as BoardierElement;
  });
}

// ─── Built-in Presets ─────────────────────────────────────────────

export const STYLE_PRESETS: StylePreset[] = [
  {
    name: 'professional',
    description: 'Clean, solid lines with subtle shadows. Blue and gray palette.',
    apply: (el) => ({
      strokeColor: el.type === 'arrow' || el.type === 'line' ? '#495057' : '#1971c2',
      backgroundColor: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
        ? '#e7f5ff' : el.backgroundColor,
      fillStyle: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
        ? 'solid' as any : el.fillStyle,
      strokeWidth: 2,
      roughness: 0,
      opacity: 1,
      strokeStyle: 'solid',
      shadow: '2 2 6 rgba(0,0,0,0.12)',
    }),
  },
  {
    name: 'playful',
    description: 'Hand-drawn sketch style with warm colors and rough edges.',
    apply: (el) => {
      const colors = ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#6741d9', '#e8590c'];
      const fills = ['#ffc9c9', '#ffe8cc', '#b2f2bb', '#a5d8ff', '#d0bfff', '#ffd8a8'];
      const hash = el.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const idx = hash % colors.length;
      return {
        strokeColor: colors[idx],
        backgroundColor: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
          ? fills[idx] : el.backgroundColor,
        fillStyle: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
          ? 'hachure' as any : el.fillStyle,
        strokeWidth: 2,
        roughness: 1.5,
        opacity: 1,
        shadow: '',
      };
    },
  },
  {
    name: 'blueprint',
    description: 'Technical blueprint style with white-on-blue.',
    apply: (el) => ({
      strokeColor: '#e9ecef',
      backgroundColor: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
        ? '#1864ab' : el.backgroundColor,
      fillStyle: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
        ? 'solid' as any : el.fillStyle,
      strokeWidth: 1,
      roughness: 0,
      opacity: 1,
      strokeStyle: 'solid',
      shadow: '',
    }),
  },
  {
    name: 'minimal',
    description: 'Thin black strokes, no fill, no shadows. Clean and minimal.',
    apply: () => ({
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'none' as any,
      strokeWidth: 1,
      roughness: 0,
      opacity: 1,
      shadow: '',
      strokeStyle: 'solid',
    }),
  },
  {
    name: 'neon',
    description: 'Bright neon colors on dark background with glow shadows.',
    apply: (el) => {
      const neons = ['#ff6b6b', '#51cf66', '#339af0', '#ffd43b', '#cc5de8', '#20c997'];
      const hash = el.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const color = neons[hash % neons.length];
      return {
        strokeColor: color,
        backgroundColor: 'transparent',
        fillStyle: 'none' as any,
        strokeWidth: 2,
        roughness: 0,
        opacity: 1,
        shadow: `0 0 8 ${color}66`,
      };
    },
  },
  {
    name: 'pastel',
    description: 'Soft pastel fills with light gray strokes.',
    apply: (el) => {
      const pastels = ['#ffc9c9', '#b2f2bb', '#a5d8ff', '#d0bfff', '#ffd8a8', '#fcc2d7', '#99e9f2'];
      const hash = el.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const fill = pastels[hash % pastels.length];
      return {
        strokeColor: '#ced4da',
        backgroundColor: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
          ? fill : el.backgroundColor,
        fillStyle: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
          ? 'solid' as any : el.fillStyle,
        strokeWidth: 1,
        roughness: 0,
        opacity: 0.9,
        shadow: '',
      };
    },
  },
  {
    name: 'whiteboard',
    description: 'Classic whiteboard marker look with rough hand-drawn style.',
    apply: () => ({
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'none' as any,
      strokeWidth: 3,
      roughness: 2,
      opacity: 1,
      shadow: '',
      strokeStyle: 'solid',
    }),
  },
  {
    name: 'dark',
    description: 'Dark mode palette with gray strokes and deep fills.',
    apply: (el) => ({
      strokeColor: '#adb5bd',
      backgroundColor: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
        ? '#343a40' : el.backgroundColor,
      fillStyle: (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
        ? 'solid' as any : el.fillStyle,
      strokeWidth: 2,
      roughness: 0,
      opacity: 1,
      shadow: '2 2 8 rgba(0,0,0,0.4)',
    }),
  },
];

/** Get a preset by name. Case-insensitive. */
export function getPreset(name: string): StylePreset | undefined {
  return STYLE_PRESETS.find(p => p.name.toLowerCase() === name.toLowerCase());
}

/** Get all preset names and descriptions. */
export function listPresets(): { name: string; description: string }[] {
  return STYLE_PRESETS.map(p => ({ name: p.name, description: p.description }));
}

/**
 * Apply a named preset to elements. Returns updated elements without mutating originals.
 * Returns null if the preset is not found.
 */
export function applyPreset(elements: BoardierElement[], presetName: string): BoardierElement[] | null {
  const preset = getPreset(presetName);
  if (!preset) return null;
  return elements.map(el => ({ ...el, ...preset.apply(el) }) as BoardierElement);
}

/**
 * Detect style preset from a prompt string.
 * Returns preset name or null.
 */
export function detectStylePreset(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  const patterns: [string, RegExp][] = [
    ['professional', /\b(professional|corporate|business|formal|clean)\b/],
    ['playful', /\b(playful|fun|sketchy|hand.?drawn|casual|creative)\b/],
    ['blueprint', /\b(blueprint|technical|engineering|schematic)\b/],
    ['minimal', /\b(minimal|minimalist|simple|bare|stripped)\b/],
    ['neon', /\b(neon|glow|electric|cyber|futuristic)\b/],
    ['pastel', /\b(pastel|soft|gentle|muted|light)\b/],
    ['whiteboard', /\b(whiteboard|marker|freehand|rough)\b/],
    ['dark', /\b(dark|night|midnight|moody)\b/],
  ];
  for (const [name, regex] of patterns) {
    if (regex.test(lower)) return name;
  }
  return null;
}
