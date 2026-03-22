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

/**
 * Detect whether a prompt requests a complex visual layout (landing page, dashboard, etc.)
 * that should use HTML generation mode instead of raw element JSON.
 */
export function isComplexLayoutRequest(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return /\b(landing\s*page|website|webpage|web\s*page|dashboard|app\s*design|ui\s*design|layout|homepage|hero\s*section|signup\s*page|login\s*page|profile\s*page|pricing\s*page|blog\s*page|portfolio|mobile\s*app|screen\s*design|wireframe|mockup|prototype|sidebar|navbar|footer|header|card\s*layout|form\s*design|settings\s*page|checkout|e.?commerce|saas|admin\s*panel|cms|social\s*media|email\s*template|newsletter|presentation|slide|poster|banner|infographic|resume|business\s*card)\b/.test(lower);
}

/** System prompt for HTML-based generation. The AI produces HTML that gets converted to Boardier elements. */
export const HTML_GENERATION_PROMPT = `
You generate whiteboard wireframes as HTML with inline styles.

CRITICAL RULES:
1. Return ONLY a single HTML snippet (the content, no <html>/<head>/<body> wrappers).
2. Use a root container div with explicit width (usually 1200px for desktop, 375px for mobile).
3. Use ONLY inline styles (style="..."). NO <style> blocks, NO CSS classes.
4. Use semantic HTML: <nav>, <header>, <section>, <footer>, <aside>, <main>, <article>.
5. For images, use <div> placeholders with a gray background and centered text like [Hero Image].
6. Use flexbox for layouts: display:flex, flex-direction, gap, align-items, justify-content.
7. Keep it visual and wireframe-like — use clear backgrounds, borders, and spacing.
8. Use realistic placeholder text (not lorem ipsum — use real-sounding headlines and copy).
9. For icons, use emoji or text symbols (★, →, ✓, ✕, ☰, 🔍, 👤, etc.).
10. Make every element have explicit dimensions or flex properties — nothing should be 0-height.

COLOR PALETTE:
- Primaries: #1971c2, #2f9e44, #e03131, #f08c00, #6741d9
- Neutrals: #1e1e1e, #495057, #868e96, #adb5bd, #dee2e6, #f1f3f5, #f8f9fa, #ffffff
- Fills: #e7f5ff, #ebfbee, #fff5f5, #fff9db, #f3f0ff

WIREFRAME COMPONENTS to use:
- Navigation: <nav> with logo text + links + CTA button
- Hero: Large <section> with headline, subtext, CTA button, optional image placeholder
- Features: Grid of cards using flex with gap
- Cards: <div> with border, padding, icon/image, title, description
- Footer: <footer> with columns of links
- Sidebar: <aside> with vertical nav items
- Forms: <div> containers with labeled inputs (just use <div> styled as input fields)
- Stats: Numbers with labels in a row
- Testimonials: Quoted text with avatar placeholder and name
- Pricing: Cards with tier name, price, feature list, CTA

BUTTON STYLING:
- Primary: style="padding:12px 24px;background:#1971c2;color:white;border-radius:8px;font-weight:600;font-size:16px;border:none;cursor:pointer"
- Secondary: style="padding:12px 24px;background:transparent;color:#1971c2;border:2px solid #1971c2;border-radius:8px;font-weight:600;font-size:16px"
- CTA: style="padding:14px 32px;background:#2f9e44;color:white;border-radius:8px;font-weight:700;font-size:18px;border:none"

INPUT FIELD STYLING:
- style="padding:10px 14px;border:1px solid #dee2e6;border-radius:6px;background:#f8f9fa;width:100%;font-size:14px;color:#495057"

EXAMPLE — Landing Page:
<div style="width:1200px;font-family:system-ui,sans-serif">
  <nav style="display:flex;align-items:center;padding:16px 40px;border-bottom:1px solid #dee2e6">
    <div style="font-size:22px;font-weight:800;color:#1971c2">BrandName</div>
    <div style="display:flex;gap:28px;margin-left:auto;align-items:center">
      <span style="color:#495057;font-size:15px">Features</span>
      <span style="color:#495057;font-size:15px">Pricing</span>
      <span style="color:#495057;font-size:15px">About</span>
      <div style="padding:10px 22px;background:#1971c2;color:white;border-radius:8px;font-weight:600;font-size:14px">Get Started</div>
    </div>
  </nav>
  <section style="display:flex;align-items:center;padding:80px 40px;gap:60px">
    <div style="flex:1">
      <h1 style="font-size:48px;font-weight:800;color:#1e1e1e;line-height:1.1;margin-bottom:20px">Build better products faster</h1>
      <p style="font-size:18px;color:#868e96;line-height:1.6;margin-bottom:32px">The all-in-one platform that helps teams design, prototype, and ship beautiful software.</p>
      <div style="display:flex;gap:16px">
        <div style="padding:14px 32px;background:#1971c2;color:white;border-radius:8px;font-weight:700;font-size:16px">Start Free Trial</div>
        <div style="padding:14px 32px;background:transparent;color:#1971c2;border:2px solid #1971c2;border-radius:8px;font-weight:600;font-size:16px">Watch Demo →</div>
      </div>
    </div>
    <div style="width:500px;height:340px;background:#f1f3f5;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#868e96;font-size:16px">[Product Screenshot]</div>
  </section>
</div>

RESPONSE:
Return the HTML directly. No markdown fences, no explanation, just the HTML string.
`;

/** Prompt extension for modifying existing elements described by the user or context. */
export const HTML_MODIFY_PROMPT = `
The user wants to modify part of their existing whiteboard.

CONTEXT about their current canvas:
{SCENE_CONTEXT}

SELECTED ELEMENTS:
{SELECTED_DESCRIPTION}

Generate the complete updated HTML for the modified section. Apply the user's requested changes while preserving the overall structure and intent.
Return only the HTML.
`;
