"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Book, Cpu, Layers, Wrench, Palette, MousePointerClick, Search, Code2, Sparkles, Menu, X } from "lucide-react";
import docsData from "@/data/docs.json";
import ThemeToggle from "../components/ThemeToggle";

interface DocEntry {
  module: string;
  category: string;
  description: string;
  since: string;
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

const docs: DocEntry[] = docsData as DocEntry[];

const categoryIcons: Record<string, React.ReactNode> = {
  "Core": <Cpu size={20} />,
  "Elements": <Layers size={20} />,
  "Tools": <Wrench size={20} />,
  "Themes": <Palette size={20} />,
  "UI": <MousePointerClick size={20} />,
  "Utilities": <Code2 size={20} />,
  "Public API": <Book size={20} />,
  "Build": <Wrench size={20} />,
};

const categoryColors: Record<string, string> = {
  "Core": "border-brand-red bg-brand-red/10 text-brand-red",
  "Elements": "border-brand-blue bg-brand-blue/10 text-brand-blue",
  "Tools": "border-brand-green bg-brand-green/10 text-[#00c853]",
  "Themes": "border-brand-yellow bg-brand-yellow/10 text-brand-orange",
  "UI": "border-brand-pink bg-brand-pink/10 text-brand-pink",
  "Utilities": "border-brand-orange bg-brand-orange/10 text-brand-orange",
  "Public API": "border-[#6741d9] bg-[#6741d9]/10 text-[#6741d9]",
  "Build": "border-root-fg/40 bg-root-fg/5 text-root-fg/60",
};

function groupByCategory(entries: DocEntry[]): Record<string, DocEntry[]> {
  const groups: Record<string, DocEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry);
  }
  return groups;
}

function ModuleCard({ entry }: { entry: DocEntry }) {
  const colorClass = categoryColors[entry.category] || "border-root-fg/20 bg-root-fg/5 text-root-fg";
  return (
    <div id={entry.module.replace(/\//g, '-')} className="sketch-card p-3 sm:p-5 scroll-mt-24 hover-lift">
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold font-caveat break-words">{entry.module}</h3>
          <span className="text-[10px] sm:text-xs text-root-fg/50 font-mono break-all">{entry.filePath} &middot; {entry.lineCount} lines</span>
        </div>
        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sketch-border font-semibold whitespace-nowrap shrink-0 ${colorClass}`}>
          {entry.category}
        </span>
      </div>

      <p className="text-sm leading-relaxed mb-3">{entry.description}</p>

      {entry.usage && (
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-root-fg/50">Usage</span>
          <pre className="mt-1 p-2 bg-code-bg rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{entry.usage}</pre>
        </div>
      )}

      {entry.ai && (
        <div className="mb-3 flex items-start gap-2 p-2 bg-brand-yellow/10 sketch-border border-brand-yellow">
          <Sparkles size={14} className="text-brand-orange mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-orange">AI Integration</span>
            <p className="text-xs mt-0.5">{entry.ai}</p>
          </div>
        </div>
      )}

      {entry.see && (
        <p className="text-xs text-root-fg/60 mb-2"><strong>See also:</strong> {entry.see}</p>
      )}

      {entry.ref && (
        <p className="text-xs text-root-fg/60 mb-2"><strong>Ref:</strong> {entry.ref}</p>
      )}

      {entry.props && (
        <p className="text-xs text-root-fg/60 mb-2"><strong>Props:</strong> {entry.props}</p>
      )}

      {entry.since && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-code-bg rounded text-root-fg/50 font-mono">v{entry.since}</span>
      )}

      {entry.types.length > 0 && (
        <div className="mt-3 border-t border-root-fg/10 pt-3">
          <h4 className="text-sm font-bold mb-2">Types</h4>
          {entry.types.map((t, i) => (
            <div key={i} className="mb-2 pl-3 border-l-2 border-brand-blue/30">
              <code className="text-sm font-bold font-mono text-brand-blue">{t.name}</code>
              <p className="text-xs mt-0.5">{t.description}</p>
              {t.usage && <pre className="mt-1 text-[10px] font-mono text-root-fg/60">{t.usage}</pre>}
            </div>
          ))}
        </div>
      )}

      {entry.classes.length > 0 && (
        <div className="mt-3 border-t border-root-fg/10 pt-3">
          <h4 className="text-sm font-bold mb-2">Classes</h4>
          {entry.classes.map((c, i) => (
            <div key={i} className="mb-2 pl-3 border-l-2 border-brand-red/30">
              <code className="text-sm font-bold font-mono text-brand-red">{c.name}</code>
              <p className="text-xs mt-0.5">{c.description}</p>
              {c.usage && <pre className="mt-1 text-[10px] font-mono text-root-fg/60">{c.usage}</pre>}
              {c.ai && (
                <div className="mt-1 flex items-start gap-1">
                  <Sparkles size={10} className="text-brand-orange mt-0.5 shrink-0" />
                  <p className="text-[10px] text-brand-orange">{c.ai}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {entry.functions.length > 0 && (
        <div className="mt-3 border-t border-root-fg/10 pt-3">
          <h4 className="text-sm font-bold mb-2">Functions</h4>
          {entry.functions.map((f, i) => (
            <div key={i} className="mb-2 pl-3 border-l-2 border-brand-green/30">
              <code className="text-sm font-bold font-mono text-[#00c853]">{f.name}()</code>
              <p className="text-xs mt-0.5">{f.description}</p>
              {f.params.length > 0 && (
                <ul className="mt-1 text-[10px] text-root-fg/60 space-y-0.5">
                  {f.params.map((p, j) => (
                    <li key={j}><code className="font-mono">{p.name}</code> — {p.description}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const grouped = groupByCategory(docs);
  const categories = Object.keys(grouped);
  const totalModules = docs.length;
  const totalLines = docs.reduce((sum, d) => sum + d.lineCount, 0);

  const categoryOrder = ["Public API", "Core", "Elements", "Tools", "Themes", "UI", "Utilities", "Build"];
  const sortedCategories = categoryOrder.filter(c => categories.includes(c));

  const SidebarContent = () => (
    <nav className="space-y-4">
      {sortedCategories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-1.5">
            {categoryIcons[cat]}
            {cat}
          </h3>
          <ul className="space-y-0.5 pl-6">
            {grouped[cat].map(entry => (
              <li key={entry.module}>
                <a
                  href={`#${entry.module.replace(/\//g, '-')}`}
                  onClick={() => setSidebarOpen(false)}
                  className="text-xs text-root-fg/70 hover:text-brand-blue hover:translate-x-1 transition-all block py-0.5 truncate sketch-underline"
                >
                  {entry.module.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col font-kalam">
      {/* Header */}
      <header className="p-3 sm:p-4 md:p-6 flex items-center justify-between border-b-2 border-root-fg border-dashed sticky top-0 bg-root-bg z-50 gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sketch-button p-2 bg-card-bg hover:bg-brand-blue hover:text-white lg:hidden"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" className="sketch-button p-2 bg-card-bg hover:bg-brand-blue hover:text-white group hidden sm:flex">
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="sketch-border p-1.5 bg-brand-blue text-white animate-wiggle hidden sm:flex" style={{ animationDelay: '0.3s' }}>
              <Book size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold font-caveat leading-none">Boardier Docs</h1>
              <span className="text-[10px] text-root-fg/50 hidden sm:inline">{totalModules} modules &middot; {totalLines.toLocaleString()} lines of code</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="sketch-button p-2 bg-card-bg hover:bg-brand-blue hover:text-white group sm:hidden">
            <ArrowLeft size={18} />
          </Link>
          <Link href="/changelog" className="sketch-button px-2 py-1 text-xs hover:bg-brand-green hover:text-white hidden sm:flex">
            Changelog
          </Link>
          <a href="https://notier.ai" target="_blank" className="hidden sm:flex items-center gap-1.5 hover:text-brand-blue text-xs">
            <Image src="/notiericon.png" alt="Notier.ai" width={14} height={14} className="rounded-[2px]" />
            <span className="font-semibold">Notier.ai</span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile sidebar backdrop */}
      <div 
        className={`mobile-sidebar-backdrop lg:hidden ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <aside className={`mobile-sidebar lg:hidden ${sidebarOpen ? 'open' : ''} p-4 pt-6`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-dashed border-root-fg/20">
          <h2 className="text-lg font-bold font-caveat">Navigation</h2>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="sketch-button p-1.5 hover:bg-brand-red hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r-2 border-root-fg/20 p-4 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl">
          {/* Stats bar */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
            {sortedCategories.map(cat => {
              const colorClass = categoryColors[cat] || "";
              return (
                <a key={cat} href={`#cat-${cat.replace(/\s/g, '-')}`} className={`sketch-border px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold hover:-translate-y-1 hover:shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all flex items-center ${colorClass}`}>
                  {categoryIcons[cat]}
                  <span className="ml-1">{cat} ({grouped[cat].length})</span>
                </a>
              );
            })}
          </div>

          {/* Documentation sections */}
          {sortedCategories.map(cat => (
            <section key={cat} id={`cat-${cat.replace(/\s/g, '-')}`} className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-root-fg/20 border-dashed">
                {categoryIcons[cat]}
                <h2 className="text-3xl font-bold font-caveat">{cat}</h2>
                <span className="text-xs text-root-fg/50 ml-2">({grouped[cat].length} modules)</span>
              </div>
              <div className="space-y-4">
                {grouped[cat].map(entry => (
                  <ModuleCard key={entry.module} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>

      {/* Footer */}
      <footer className="p-4 border-t-2 border-root-fg/20 text-center text-xs text-root-fg/50 hover:text-root-fg/70 transition-colors">
        Auto-generated from <code className="font-mono">@boardier-*</code> source annotations &middot; Run <code className="font-mono">npx tsx scripts/parseDocsFromSource.ts</code> to regenerate
      </footer>
    </div>
  );
}
