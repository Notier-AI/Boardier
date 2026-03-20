/**
 * @boardier-module utils/mermaidParser
 * @boardier-category Utilities
 * @boardier-description Converts Mermaid diagram syntax into Boardier elements. parseMermaid() parses text into a graph structure; mermaidToBoardier() converts that into positioned BoardierElement arrays.
 * @boardier-since 0.1.0
 * @boardier-usage `const elements = mermaidToBoardier('graph TD; A-->B; B-->C');`
 * @boardier-ai This module is particularly useful for LLM agents that generate diagrams from natural language.
 */
/**
 * Mermaid Flowchart → Boardier Elements converter.
 * Parses Mermaid flowchart/graph syntax and produces Boardier elements.
 *
 * Supports:
 * - Node shapes: [] (rectangle), () (rounded), {} (diamond/rhombus), (()) (circle/ellipse), [[]] (subroutine), >] (asymmetric)
 * - Edges: -->, --->, -.->, ==>, -- text -->, -->|text|
 * - Subgraphs with nested nodes
 * - classDef with fill/stroke/color
 * - class assignments
 * - Direction: TB, BT, LR, RL
 * - Labels on nodes and edges
 */
import type { BoardierElement } from '../core/types';
import {
  createRectangle,
  createEllipse,
  createDiamond,
  createArrow,
  createText,
} from '../elements/base';

// ─── Types ──────────────────────────────────────────────────────

interface MermaidNode {
  id: string;
  label: string;
  shape: 'rectangle' | 'rounded' | 'diamond' | 'ellipse' | 'subroutine' | 'asymmetric' | 'hexagon' | 'stadium';
  classes: string[];
  subgraph?: string;
}

interface MermaidEdge {
  from: string;
  to: string;
  label: string;
  style: 'solid' | 'dotted' | 'thick';
}

interface MermaidClassDef {
  name: string;
  fill?: string;
  stroke?: string;
  color?: string;
  strokeWidth?: number;
}

interface MermaidSubgraph {
  id: string;
  label: string;
  parent?: string;
}

type Direction = 'TB' | 'BT' | 'LR' | 'RL';

interface ParsedMermaid {
  direction: Direction;
  nodes: Map<string, MermaidNode>;
  edges: MermaidEdge[];
  classDefs: Map<string, MermaidClassDef>;
  subgraphs: MermaidSubgraph[];
}

// ─── Parser ─────────────────────────────────────────────────────

function stripQuotes(s: string): string {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

export function parseMermaid(source: string): ParsedMermaid {
  const result: ParsedMermaid = {
    direction: 'TB',
    nodes: new Map(),
    edges: [],
    classDefs: new Map(),
    subgraphs: [],
  };

  const lines = source.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const subgraphStack: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Direction
    const dirMatch = line.match(/^(?:graph|flowchart)\s+(TB|BT|LR|RL)/i);
    if (dirMatch) {
      result.direction = dirMatch[1].toUpperCase() as Direction;
      continue;
    }
    if (line.match(/^(?:graph|flowchart)\b/i)) continue;

    // classDef
    const classDefMatch = line.match(/^classDef\s+(\w+)\s+(.+)/);
    if (classDefMatch) {
      const name = classDefMatch[1];
      const props = classDefMatch[2];
      const def: MermaidClassDef = { name };
      const fillM = props.match(/fill:\s*([^,;]+)/);
      if (fillM) def.fill = fillM[1].trim();
      const strokeM = props.match(/stroke:\s*([^,;]+)/);
      if (strokeM) def.stroke = strokeM[1].trim();
      const colorM = props.match(/color:\s*([^,;]+)/);
      if (colorM) def.color = colorM[1].trim();
      const swM = props.match(/stroke-width:\s*(\d+)/);
      if (swM) def.strokeWidth = parseInt(swM[1]);
      result.classDefs.set(name, def);
      continue;
    }

    // class assignment: class nodeA,nodeB className
    const classAssign = line.match(/^class\s+([\w,]+)\s+(\w+)/);
    if (classAssign) {
      const nodeIds = classAssign[1].split(',').map(s => s.trim());
      const className = classAssign[2];
      for (const nid of nodeIds) {
        const node = result.nodes.get(nid);
        if (node) node.classes.push(className);
      }
      continue;
    }

    // Inline class: nodeId:::className
    // (handled during node parsing below)

    // subgraph start
    const subMatch = line.match(/^subgraph\s+(\w+)\s*(?:\[([^\]]*)\])?/i);
    if (subMatch) {
      const sg: MermaidSubgraph = {
        id: subMatch[1],
        label: subMatch[2] ? stripQuotes(subMatch[2]) : subMatch[1],
        parent: subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined,
      };
      result.subgraphs.push(sg);
      subgraphStack.push(sg.id);
      continue;
    }
    if (line.match(/^end\s*$/i)) {
      subgraphStack.pop();
      continue;
    }

    // Parse edges on this line (can have multiple chained: A --> B --> C)
    parseEdgeLine(line, result, subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined);
  }

  return result;
}

function parseEdgeLine(line: string, result: ParsedMermaid, currentSubgraph?: string): void {
  // Edge patterns: A --> B, A -->|label| B, A -- label --> B, A -.-> B, A ==> B
  // Also handle chaining: A --> B --> C
  // And standalone node definitions: A[label], B{decision}, etc.

  // Edge regex — matches the edge operator and optional labels
  const edgeRe = /\s*(-->|---|-\.->|-.->|==>|-->\|([^|]*)\||--\s+([^\s-]+)\s+-->)\s*/g;

  const parts: string[] = [];
  const edgeInfos: { label: string; style: 'solid' | 'dotted' | 'thick' }[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = edgeRe.exec(line)) !== null) {
    parts.push(line.slice(lastIdx, match.index).trim());
    let label = '';
    let style: 'solid' | 'dotted' | 'thick' = 'solid';
    if (match[2] !== undefined) label = match[2];
    if (match[3] !== undefined) label = match[3];
    if (match[1].includes('.')) style = 'dotted';
    if (match[1].includes('=')) style = 'thick';
    edgeInfos.push({ label, style });
    lastIdx = match.index + match[0].length;
  }

  if (parts.length === 0 && lastIdx === 0) {
    // No edges — might be a standalone node definition or a class:::style
    parseNodeDef(line.trim(), result, currentSubgraph);
    return;
  }

  // Add the last part
  parts.push(line.slice(lastIdx).trim());

  // Ensure all node parts get registered
  const nodeIds = parts.map(p => parseNodeDef(p, result, currentSubgraph));

  // Create edges between consecutive pairs
  for (let i = 0; i < edgeInfos.length; i++) {
    if (nodeIds[i] && nodeIds[i + 1]) {
      result.edges.push({
        from: nodeIds[i],
        to: nodeIds[i + 1],
        label: edgeInfos[i].label,
        style: edgeInfos[i].style,
      });
    }
  }
}

function parseNodeDef(raw: string, result: ParsedMermaid, currentSubgraph?: string): string {
  if (!raw) return '';

  // Strip inline class :::className
  let inlineClass = '';
  const classMatch = raw.match(/:::(\w+)/);
  if (classMatch) {
    inlineClass = classMatch[1];
    raw = raw.replace(/:::\w+/, '').trim();
  }

  // Try to match node shapes
  // Diamond: id{label} or id{label}
  // Rounded rect: id(label)
  // Ellipse: id((label))
  // Subroutine: id[[label]]
  // Stadium: id([label])
  // Hexagon: id{{label}}
  // Rectangle: id[label]
  // Asymmetric: id>label]
  // Plain id

  let id = raw;
  let label = raw;
  let shape: MermaidNode['shape'] = 'rectangle';

  // Order matters — check longer patterns first
  let m: RegExpMatchArray | null;

  if ((m = raw.match(/^(\w+)\(\(([^)]*)\)\)/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'ellipse';
  } else if ((m = raw.match(/^(\w+)\{\{([^}]*)\}\}/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'hexagon';
  } else if ((m = raw.match(/^(\w+)\[\[([^\]]*)\]\]/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'subroutine';
  } else if ((m = raw.match(/^(\w+)\(\[([^\]]*)\]\)/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'stadium';
  } else if ((m = raw.match(/^(\w+)\{([^}]*)\}/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'diamond';
  } else if ((m = raw.match(/^(\w+)\(([^)]*)\)/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'rounded';
  } else if ((m = raw.match(/^(\w+)>([^\]]*)\]/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'asymmetric';
  } else if ((m = raw.match(/^(\w+)\[([^\]]*)\]/))) {
    id = m[1]; label = stripQuotes(m[2]); shape = 'rectangle';
  } else {
    // Plain ID — might be just a reference to an existing node
    id = raw.replace(/[^a-zA-Z0-9_]/g, '') || raw;
    label = id;
  }

  if (!id) return '';

  // Register or update node
  if (!result.nodes.has(id)) {
    const node: MermaidNode = { id, label, shape, classes: [], subgraph: currentSubgraph };
    if (inlineClass) node.classes.push(inlineClass);
    result.nodes.set(id, node);
  } else {
    const existing = result.nodes.get(id)!;
    // Update label/shape if this definition has more info
    if (label !== id) {
      existing.label = label;
      existing.shape = shape;
    }
    if (inlineClass) existing.classes.push(inlineClass);
    if (currentSubgraph && !existing.subgraph) existing.subgraph = currentSubgraph;
  }

  return id;
}

// ─── Layout Engine ──────────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  order: number;
}

function layoutNodes(
  parsed: ParsedMermaid,
): Map<string, LayoutNode> {
  const nodeIds = [...parsed.nodes.keys()];
  const adjacency = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();

  for (const id of nodeIds) {
    adjacency.set(id, []);
    reverseAdj.set(id, []);
  }
  for (const edge of parsed.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    reverseAdj.get(edge.to)?.push(edge.from);
  }

  // Assign layers using longest-path from sources (topological)
  const layers = new Map<string, number>();
  const visited = new Set<string>();

  function assignLayer(id: string): number {
    if (layers.has(id)) return layers.get(id)!;
    if (visited.has(id)) return 0; // cycle protection
    visited.add(id);
    const parents = reverseAdj.get(id) || [];
    let maxParent = -1;
    for (const p of parents) {
      maxParent = Math.max(maxParent, assignLayer(p));
    }
    const layer = maxParent + 1;
    layers.set(id, layer);
    return layer;
  }

  for (const id of nodeIds) assignLayer(id);

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  // Node sizing
  const NODE_W = 160;
  const NODE_H = 60;
  const DIAMOND_W = 140;
  const DIAMOND_H = 90;
  const H_GAP = 60;
  const V_GAP = 80;

  const isHorizontal = parsed.direction === 'LR' || parsed.direction === 'RL';

  const result = new Map<string, LayoutNode>();

  // Sort layers
  const sortedLayers = [...layerGroups.entries()].sort((a, b) => a[0] - b[0]);
  const maxNodesInLayer = Math.max(1, ...sortedLayers.map(([, ids]) => ids.length));

  for (const [layer, ids] of sortedLayers) {
    // Center nodes in their layer
    const count = ids.length;
    for (let i = 0; i < count; i++) {
      const node = parsed.nodes.get(ids[i])!;
      const w = node.shape === 'diamond' ? DIAMOND_W : NODE_W;
      const h = node.shape === 'diamond' ? DIAMOND_H : NODE_H;

      // Offset from center of the layer row/column
      const offset = (i - (count - 1) / 2);

      let x: number, y: number;
      if (isHorizontal) {
        x = layer * (NODE_W + H_GAP);
        y = offset * (NODE_H + V_GAP);
      } else {
        x = offset * (NODE_W + H_GAP);
        y = layer * (NODE_H + V_GAP);
      }

      result.set(ids[i], {
        id: ids[i],
        x, y, width: w, height: h,
        layer, order: i,
      });
    }
  }

  // Reverse direction if BT or RL
  if (parsed.direction === 'BT' || parsed.direction === 'RL') {
    const maxLayer = Math.max(0, ...sortedLayers.map(([l]) => l));
    for (const [, layout] of result) {
      if (isHorizontal) {
        layout.x = (maxLayer - layout.layer) * (NODE_W + H_GAP);
      } else {
        layout.y = (maxLayer - layout.layer) * (NODE_H + V_GAP);
      }
    }
  }

  return result;
}

// ─── Converter ──────────────────────────────────────────────────

export function mermaidToBoardier(source: string): BoardierElement[] {
  const parsed = parseMermaid(source);
  const layout = layoutNodes(parsed);
  const elements: BoardierElement[] = [];

  // Subgraph background rectangles
  for (const sg of parsed.subgraphs) {
    const childNodes = [...parsed.nodes.values()].filter(n => n.subgraph === sg.id);
    if (childNodes.length === 0) continue;

    const childLayouts = childNodes.map(n => layout.get(n.id)).filter(Boolean) as LayoutNode[];
    if (childLayouts.length === 0) continue;

    const minX = Math.min(...childLayouts.map(l => l.x)) - 30;
    const minY = Math.min(...childLayouts.map(l => l.y)) - 40;
    const maxX = Math.max(...childLayouts.map(l => l.x + l.width)) + 30;
    const maxY = Math.max(...childLayouts.map(l => l.y + l.height)) + 30;

    // Subgraph background
    elements.push(createRectangle({
      x: minX, y: minY,
      width: maxX - minX, height: maxY - minY,
      strokeColor: '#868e96',
      strokeWidth: 1,
      backgroundColor: '#f8f9fa',
      fillStyle: 'solid',
      borderRadius: 8,
      opacity: 0.5,
      roughness: 0,
      label: '',
    }));

    // Subgraph title
    elements.push(createText({
      x: minX + 8, y: minY + 4,
      width: maxX - minX - 16, height: 20,
      text: sg.label,
      fontSize: 12,
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'left',
      lineHeight: 1.4,
      strokeColor: '#868e96',
    } as any));
  }

  // Nodes
  for (const [nodeId, mNode] of parsed.nodes) {
    const l = layout.get(nodeId);
    if (!l) continue;

    // Resolve classDef styling
    let fill = 'transparent';
    let stroke = '#1e1e1e';
    let textColor = '#1e1e1e';
    let strokeWidth = 2;

    for (const cls of mNode.classes) {
      const cd = parsed.classDefs.get(cls);
      if (cd) {
        if (cd.fill) fill = cd.fill;
        if (cd.stroke) stroke = cd.stroke;
        if (cd.color) textColor = cd.color;
        if (cd.strokeWidth) strokeWidth = cd.strokeWidth;
      }
    }

    switch (mNode.shape) {
      case 'diamond':
      case 'hexagon':
        elements.push(createDiamond({
          x: l.x, y: l.y, width: l.width, height: l.height,
          strokeColor: stroke, backgroundColor: fill,
          fillStyle: fill !== 'transparent' ? 'solid' : 'none',
          strokeWidth, label: mNode.label,
        }));
        break;
      case 'ellipse':
        elements.push(createEllipse({
          x: l.x, y: l.y, width: l.width, height: l.height,
          strokeColor: stroke, backgroundColor: fill,
          fillStyle: fill !== 'transparent' ? 'solid' : 'none',
          strokeWidth, label: mNode.label,
        }));
        break;
      case 'rounded':
      case 'stadium':
        elements.push(createRectangle({
          x: l.x, y: l.y, width: l.width, height: l.height,
          borderRadius: 12,
          strokeColor: stroke, backgroundColor: fill,
          fillStyle: fill !== 'transparent' ? 'solid' : 'none',
          strokeWidth, label: mNode.label,
        }));
        break;
      default: // rectangle, subroutine, asymmetric
        elements.push(createRectangle({
          x: l.x, y: l.y, width: l.width, height: l.height,
          borderRadius: 0,
          strokeColor: stroke, backgroundColor: fill,
          fillStyle: fill !== 'transparent' ? 'solid' : 'none',
          strokeWidth, label: mNode.label,
        }));
        if (mNode.shape === 'subroutine') {
          // Double border effect — add inner border
          elements.push(createRectangle({
            x: l.x + 4, y: l.y + 4, width: l.width - 8, height: l.height - 8,
            borderRadius: 0,
            strokeColor: stroke, strokeWidth: 1,
            backgroundColor: 'transparent', fillStyle: 'none',
          }));
        }
        break;
    }
  }

  // Edges (arrows)
  for (const edge of parsed.edges) {
    const fromLayout = layout.get(edge.from);
    const toLayout = layout.get(edge.to);
    if (!fromLayout || !toLayout) continue;

    // Calculate connection points (center → center, clipped to edge of shapes)
    const fromCx = fromLayout.x + fromLayout.width / 2;
    const fromCy = fromLayout.y + fromLayout.height / 2;
    const toCx = toLayout.x + toLayout.width / 2;
    const toCy = toLayout.y + toLayout.height / 2;

    // Simple approach: connect from edge of source to edge of target
    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    let fromX: number, fromY: number, toX: number, toY: number;

    // Determine exit/entry sides based on primary axis
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal-ish
      fromX = dx > 0 ? fromLayout.x + fromLayout.width : fromLayout.x;
      fromY = fromCy;
      toX = dx > 0 ? toLayout.x : toLayout.x + toLayout.width;
      toY = toCy;
    } else {
      // Vertical-ish
      fromX = fromCx;
      fromY = dy > 0 ? fromLayout.y + fromLayout.height : fromLayout.y;
      toX = toCx;
      toY = dy > 0 ? toLayout.y : toLayout.y + toLayout.height;
    }

    const arrow = createArrow({
      x: fromX, y: fromY,
      width: 0, height: 0,
      points: [
        { x: 0, y: 0 },
        { x: toX - fromX, y: toY - fromY },
      ],
      strokeWidth: edge.style === 'thick' ? 3 : 2,
      strokeColor: '#1e1e1e',
    });

    elements.push(arrow);

    // Edge label
    if (edge.label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      elements.push(createText({
        x: midX - 30, y: midY - 10,
        width: 60, height: 20,
        text: edge.label,
        fontSize: 11,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        lineHeight: 1.2,
        strokeColor: '#868e96',
      } as any));
    }
  }

  return elements;
}
