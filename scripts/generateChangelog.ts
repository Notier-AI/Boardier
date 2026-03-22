/**
 * @boardier-module scripts/generateChangelog
 * @boardier-category Build
 * @boardier-description Generates changelog data from @boardier-since annotations.
 * Groups modules, types, classes, and functions by the version they were introduced.
 * Outputs `website/src/data/changelog.json` consumed by the /changelog page.
 *
 * Usage:
 *   npx tsx scripts/generateChangelog.ts
 *
 * @boardier-since 0.2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ──────────────────────────────────────────────────────────

interface ChangelogEntry {
  module: string;
  category: string;
  description: string;
  filePath: string;
  lineCount: number;
  types: string[];
  classes: string[];
  functions: string[];
  ai: string;
}

interface VersionBlock {
  version: string;
  date: string;
  summary: string;
  entries: ChangelogEntry[];
  stats: {
    modules: number;
    types: number;
    classes: number;
    functions: number;
    totalLines: number;
    categories: string[];
  };
}

// ─── Version metadata ────────────────────────────────────────────────
// Add an entry here for each release. The script will match @boardier-since
// values against these versions and group accordingly.

const VERSION_META: Record<string, { date: string; summary: string }> = {
  '0.1.0': {
    date: '2026-02-01',
    summary: 'Initial release — core engine, renderer, element system, tools, themes, and UI components.',
  },
  '0.2.0': {
    date: '2026-03-20',
    summary: 'AI layer — prompt-to-board generation, HTML conversion, auto-layout algorithms, schema exports, and fill style additions.',
  },
};

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  const root = path.resolve(__dirname, '..');
  const docsPath = path.join(root, 'website', 'src', 'data', 'docs.json');

  if (!fs.existsSync(docsPath)) {
    console.error('✗ docs.json not found. Run `npx tsx scripts/parseDocsFromSource.ts` first.');
    process.exit(1);
  }

  const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));

  // Group by version
  const groups: Record<string, ChangelogEntry[]> = {};

  for (const doc of docs) {
    const version = doc.since || '0.1.0';
    if (!groups[version]) groups[version] = [];

    groups[version].push({
      module: doc.module,
      category: doc.category,
      description: doc.description,
      filePath: doc.filePath,
      lineCount: doc.lineCount,
      types: (doc.types || []).map((t: { name: string }) => t.name).filter(Boolean),
      classes: (doc.classes || []).map((c: { name: string }) => c.name).filter(Boolean),
      functions: (doc.functions || []).map((f: { name: string }) => f.name).filter(Boolean),
      ai: doc.ai || '',
    });
  }

  // Build version blocks sorted newest-first
  const versions = Object.keys(groups).sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    }
    return 0;
  });

  const changelog: VersionBlock[] = versions.map(version => {
    const entries = groups[version];
    const meta = VERSION_META[version] || { date: 'Unknown', summary: '' };

    const allTypes = entries.flatMap(e => e.types);
    const allClasses = entries.flatMap(e => e.classes);
    const allFunctions = entries.flatMap(e => e.functions);
    const allCategories = [...new Set(entries.map(e => e.category))].sort();
    const totalLines = entries.reduce((sum, e) => sum + e.lineCount, 0);

    return {
      version,
      date: meta.date,
      summary: meta.summary,
      entries: entries.sort((a, b) => a.category.localeCompare(b.category) || a.module.localeCompare(b.module)),
      stats: {
        modules: entries.length,
        types: allTypes.length,
        classes: allClasses.length,
        functions: allFunctions.length,
        totalLines,
        categories: allCategories,
      },
    };
  });

  const outDir = path.join(root, 'website', 'src', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'changelog.json'), JSON.stringify(changelog, null, 2));

  console.log(`✓ Generated changelog with ${changelog.length} version(s):`);
  for (const v of changelog) {
    console.log(`  v${v.version} — ${v.stats.modules} modules, ${v.stats.totalLines.toLocaleString()} lines [${v.stats.categories.join(', ')}]`);
  }
  console.log(`  Output: website/src/data/changelog.json`);
}

main();
