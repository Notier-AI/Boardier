/**
 * @boardier-module scripts/parseDocsFromSource
 * @boardier-category Build
 * @boardier-description Parses all @boardier-* JSDoc annotations from the boardier source tree
 * and outputs a structured JSON file consumed by the /docs page at build time.
 */

import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ──────────────────────────────────────────────────────────

export interface DocEntry {
  module: string;
  category: string;
  description: string;
  since: string;
  changed: { version: string; note: string }[];
  usage: string;
  see: string;
  ai: string;
  props: string;
  ref: string;
  params: { name: string; description: string }[];
  types: { name: string; description: string; usage: string }[];
  classes: { name: string; description: string; usage: string; ai: string }[];
  functions: { name: string; description: string; params: { name: string; description: string }[] }[];
  filePath: string;
  lineCount: number;
}

// ─── Parser ──────────────────────────────────────────────────────────

function parseTag(block: string, tag: string): string {
  const re = new RegExp(`@boardier-${tag}\\s+(.+?)(?=\\s*\\*\\s*@boardier-|\\s*\\*/)`, 's');
  const m = block.match(re);
  return m ? m[1].replace(/\s*\*\s*/g, ' ').trim() : '';
}

function parseMultipleTags(block: string, tag: string): string[] {
  const re = new RegExp(`@boardier-${tag}\\s+(.+?)(?=\\s*\\*\\s*@boardier-|\\s*\\*/)`, 'gs');
  const results: string[] = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    results.push(m[1].replace(/\s*\*\s*/g, ' ').trim());
  }
  return results;
}

function parseFile(filePath: string): DocEntry | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Find all JSDoc blocks with @boardier- tags
  const blockRegex = /\/\*\*[\s\S]*?\*\//g;
  const blocks = content.match(blockRegex) || [];

  let moduleBlock: string | null = null;
  const typeBlocks: string[] = [];
  const classBlocks: string[] = [];
  const functionBlocks: string[] = [];

  for (const block of blocks) {
    if (block.includes('@boardier-module')) {
      moduleBlock = block;
    }
    if (block.includes('@boardier-type')) {
      typeBlocks.push(block);
    }
    if (block.includes('@boardier-class')) {
      classBlocks.push(block);
    }
    if (block.includes('@boardier-function')) {
      functionBlocks.push(block);
    }
  }

  if (!moduleBlock) return null;

  const moduleName = parseTag(moduleBlock, 'module');
  const category = parseTag(moduleBlock, 'category');
  const description = parseTag(moduleBlock, 'description');
  const since = parseTag(moduleBlock, 'since') || '0.1.0';
  const usage = parseTag(moduleBlock, 'usage');
  const see = parseTag(moduleBlock, 'see');
  const ai = parseTag(moduleBlock, 'ai');
  const props = parseTag(moduleBlock, 'props');
  const ref = parseTag(moduleBlock, 'ref');

  // Parse @boardier-changed tags: "0.2.0 Added zigzag fill styles"
  const changedRaw = parseMultipleTags(moduleBlock, 'changed');
  const changed = changedRaw.map(c => {
    const spaceIdx = c.indexOf(' ');
    return {
      version: spaceIdx > 0 ? c.substring(0, spaceIdx) : c,
      note: spaceIdx > 0 ? c.substring(spaceIdx + 1) : '',
    };
  });

  const params = parseMultipleTags(moduleBlock, 'param').map(p => {
    const spaceIdx = p.indexOf(' ');
    return {
      name: spaceIdx > 0 ? p.substring(0, spaceIdx) : p,
      description: spaceIdx > 0 ? p.substring(spaceIdx + 1) : '',
    };
  });

  const types = typeBlocks.map(block => ({
    name: parseTag(block, 'type'),
    description: parseTag(block, 'description'),
    usage: parseTag(block, 'usage'),
  }));

  const classes = classBlocks.map(block => ({
    name: parseTag(block, 'class'),
    description: parseTag(block, 'description'),
    usage: parseTag(block, 'usage'),
    ai: parseTag(block, 'ai'),
  }));

  const functions = functionBlocks.map(block => ({
    name: parseTag(block, 'function'),
    description: parseTag(block, 'description'),
    params: parseMultipleTags(block, 'param').map(p => {
      const spaceIdx = p.indexOf(' ');
      return {
        name: spaceIdx > 0 ? p.substring(0, spaceIdx) : p,
        description: spaceIdx > 0 ? p.substring(spaceIdx + 1) : '',
      };
    }),
  }));

  return {
    module: moduleName,
    category,
    description,
    since,
    changed,
    usage,
    see,
    ai,
    props,
    ref,
    params,
    types,
    classes,
    functions,
    filePath: filePath.replace(/\\/g, '/'),
    lineCount,
  };
}

// ─── Walker ──────────────────────────────────────────────────────────

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .next, website
      if (['node_modules', '.next', 'website', '.git'].includes(entry.name)) continue;
      results.push(...walkDir(full, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  const root = path.resolve(__dirname, '..');
  const files = walkDir(root, ['.ts', '.tsx']);
  const docs: DocEntry[] = [];

  for (const file of files) {
    const entry = parseFile(file);
    if (entry) {
      // Make filePath relative to root
      entry.filePath = path.relative(root, file).replace(/\\/g, '/');
      docs.push(entry);
    }
  }

  // Sort by category then module name
  docs.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.module.localeCompare(b.module);
  });

  const outDir = path.join(root, 'website', 'src', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'docs.json'), JSON.stringify(docs, null, 2));

  console.log(`✓ Parsed ${docs.length} documented modules from ${files.length} source files.`);
  console.log(`  Output: website/src/data/docs.json`);
}

main();
