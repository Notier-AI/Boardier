/**
 * @boardier-module ai/schema
 * @boardier-category AI
 * @boardier-description Element schema definitions for LLM-based diagram generation.
 * Provides structured JSON schemas that describe all BoardierElement types,
 * their properties and valid ranges. LLM providers use these schemas to produce
 * valid element arrays when generating diagrams from natural language.
 * @boardier-since 0.2.0
 */

import type { BoardierElement, BoardierElementType } from '../core/types';

// ─── Public schema for LLM structured output ──────────────────────

/** Compact schema description suitable for injection into LLM system prompts. */
export const ELEMENT_SCHEMA_PROMPT = `
You generate Boardier whiteboard elements as JSON arrays.

ELEMENT TYPES & REQUIRED FIELDS:
- rectangle: {x, y, width, height, label?, borderRadius?:0-50}
- ellipse: {x, y, width, height, label?}
- diamond: {x, y, width, height, label?}
- text: {x, y, width, height, text, fontSize?:14-48, fontFamily?:"system-ui"|"Georgia"|"Courier New", textAlign?:"left"|"center"|"right"}
- line: {x, y, width:0, height:0, points:[{x,y},{x,y}], controlPoint?:{x,y}|null}
- arrow: {x, y, width:0, height:0, points:[{x,y},{x,y}], controlPoint?:{x,y}|null}
- frame: {x, y, width, height, label?, childIds?:[]}
- table: {x, y, width, height, cols, rows, cells:string[][], colWidths:number[], rowHeights:number[]}
- checkbox: {x, y, width:140, height:28, label, checked?:false}
- image: {x, y, width, height, src:"url", alt?}
- embed: {x, y, width:280, height:60, url?}
- comment: {x, y, width:32, height:32, text, author?}
- icon: {x, y, width:32, height:32, iconName, iconSet?:"lucide"}

ALL ELEMENTS share these optional fields:
- strokeColor: hex (default "#1e1e1e")
- backgroundColor: hex or "transparent"
- fillStyle: "none"|"solid"|"hachure"|"cross-hatch"|"dots"
- strokeWidth: 1-12 (default 2)
- opacity: 0.1-1 (default 1)
- roughness: 0-2 (0=clean, 1=sketchy, 2=rough)
- strokeStyle: "solid"|"dashed"|"dotted"
- shadow: "" | "2 2 4 rgba(0,0,0,0.2)" | "4 4 10 rgba(0,0,0,0.25)"
- groupIds: string[] (elements sharing a groupId are grouped)

COLORS:
Stroke: #1e1e1e, #e03131, #2f9e44, #1971c2, #f08c00, #6741d9, #0c8599, #e8590c, #d6336c, #868e96
Fill: transparent, #ffc9c9, #b2f2bb, #a5d8ff, #ffe8cc, #d0bfff, #99e9f2, #ffd8a8, #fcc2d7, #dee2e6

LAYOUT RULES:
- Position elements in a logical grid. Standard spacing: 200px horizontal, 150px vertical.
- Rectangles default: 160x80. Ellipses: 140x80. Diamonds: 140x100.
- For flowcharts: use arrows with startBindingId/endBindingId set to connected element IDs.
- For mind maps: radiate from center, increasing radius per level.
- For org charts: top-down tree layout.
- Frame elements: set childIds to IDs of elements inside the frame.

RESPONSE FORMAT:
Return a JSON object: { "elements": [...], "zoomToFit": true }
Each element MUST have a unique "id" field (use format "ai_<index>" like "ai_0", "ai_1", ...).
`;

/** Color palette for AI to reference. */
export const AI_COLOR_MAP: Record<string, string> = {
  red: '#e03131', blue: '#1971c2', green: '#2f9e44', yellow: '#f08c00',
  orange: '#e8590c', purple: '#6741d9', pink: '#d6336c', black: '#1e1e1e',
  white: '#e9ecef', gray: '#868e96', grey: '#868e96', cyan: '#0c8599',
  teal: '#0ca678', indigo: '#3b5bdb', lime: '#66a80f', amber: '#f59f00',
  brown: '#995e38', navy: '#1c3d7a', maroon: '#862e2e', olive: '#6e7a2a',
  coral: '#ff6b6b', salmon: '#fa8072', magenta: '#c2255c', violet: '#7950f2',
};

/** Fill color palette. */
export const AI_FILL_MAP: Record<string, string> = {
  red: '#ffc9c9', blue: '#a5d8ff', green: '#b2f2bb', yellow: '#ffe8cc',
  orange: '#ffd8a8', purple: '#d0bfff', pink: '#fcc2d7', cyan: '#99e9f2',
  gray: '#dee2e6', grey: '#dee2e6',
};

/** Diagram type hints injected when the orchestrator detects a diagram request. */
export const DIAGRAM_HINTS: Record<string, string> = {
  flowchart: `Create a flowchart using rectangles for processes, diamonds for decisions, and arrows connecting them. Flow top-to-bottom or left-to-right. Use labels inside shapes. Color-code: start/end in green, decisions in yellow, processes in blue.`,

  architecture: `Create a system architecture diagram. Use rectangles for services/components, with labels. Group related services in frames. Connect with arrows showing data flow. Color-code by layer: frontend (blue), backend (green), database (purple), external (orange).`,

  mindmap: `Create a mind map radiating from a central node. The central topic is a large ellipse. First-level branches are rectangles connected by arrows. Sub-branches are smaller. Color each branch family differently. Spread nodes radially with 200-300px between levels.`,

  orgchart: `Create an org chart as a top-down tree. Each person/role is a rectangle with their name as label. Connect parent to children with arrows. Indent each level 150px down. Center children under their parent.`,

  kanban: `Create a Kanban board with 3 column frames: "To Do", "In Progress", "Done". Each frame is 250px wide. Place card rectangles (200x60) inside each column, stacked vertically with 10px gaps.`,

  swot: `Create a 2x2 SWOT matrix. Four rectangles side by side in a grid: Strengths (green fill, top-left), Weaknesses (red fill, top-right), Opportunities (blue fill, bottom-left), Threats (orange fill, bottom-right). Add a text label in each.`,

  timeline: `Create a horizontal timeline. Draw a long horizontal arrow as the baseline. Place event markers (small circles or diamonds) along the line at regular intervals. Add text labels above/below alternating. Connect markers to the line with short vertical lines.`,

  wireframe: `Create a wireframe mockup. Use a large frame as the browser/device. Inside: a top rectangle for nav bar, rectangles with labels for content blocks, placeholder image rectangles. Keep everything gray/minimal with thin strokes.`,

  er: `Create an ER (entity-relationship) diagram. Entities are rectangles with bold title labels. Attributes branch off as smaller connected ellipses. Relationships between entities use diamonds with connecting arrows.`,

  sequence: `Create a sequence diagram. Participants are rectangles across the top. Draw vertical dashed lines down from each. Horizontal arrows between lifelines show messages, labeled with the message name. Time flows top to bottom.`,
};

/**
 * Resolve a color name to hex. Accepts hex pass-through.
 */
export function resolveColor(name: string): string | null {
  if (name.startsWith('#')) return name;
  return AI_COLOR_MAP[name.toLowerCase()] ?? null;
}

/**
 * Resolve a fill color name to a light hex.
 */
export function resolveFillColor(name: string): string | null {
  if (name.startsWith('#')) return name;
  return AI_FILL_MAP[name.toLowerCase()] ?? AI_COLOR_MAP[name.toLowerCase()] ?? null;
}

/**
 * Detect diagram type from a prompt string.
 * Returns the type key or null if no specific diagram type is detected.
 */
export function detectDiagramType(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  const patterns: [string, RegExp][] = [
    ['flowchart', /\b(flowchart|flow\s*chart|process\s*flow|decision\s*tree|workflow)\b/],
    ['architecture', /\b(architecture|system\s*design|microservice|infrastructure|deployment)\b/],
    ['mindmap', /\b(mind\s*map|brainstorm|concept\s*map|idea\s*map)\b/],
    ['orgchart', /\b(org\s*chart|organization|hierarchy|reporting\s*structure|team\s*structure)\b/],
    ['kanban', /\b(kanban|board|task\s*board|sprint\s*board|project\s*board)\b/],
    ['swot', /\b(swot|strengths?\s*(and|&)\s*weakness|swot\s*analysis)\b/],
    ['timeline', /\b(timeline|roadmap|mileston|gantt|schedule)\b/],
    ['wireframe', /\b(wireframe|mockup|prototype|ui\s*design|layout\s*design|screen\s*design)\b/],
    ['er', /\b(er\s*diagram|entity.?relation|database\s*schema|data\s*model)\b/],
    ['sequence', /\b(sequence\s*diagram|message\s*flow|interaction\s*diagram)\b/],
  ];
  for (const [type, regex] of patterns) {
    if (regex.test(lower)) return type;
  }
  return null;
}
