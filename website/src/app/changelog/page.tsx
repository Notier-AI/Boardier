import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, GitBranch, Clock, Layers, Code2, Box, Sparkles, Tag } from "lucide-react";
import changelogData from "@/data/changelog.json";

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

const changelog: VersionBlock[] = changelogData as VersionBlock[];

const categoryColors: Record<string, string> = {
  Core: "border-brand-red bg-brand-red/10 text-brand-red",
  Elements: "border-brand-blue bg-brand-blue/10 text-brand-blue",
  Tools: "border-brand-green bg-brand-green/10 text-[#00c853]",
  Themes: "border-brand-yellow bg-brand-yellow/10 text-brand-orange",
  UI: "border-brand-pink bg-brand-pink/10 text-brand-pink",
  Utilities: "border-brand-orange bg-brand-orange/10 text-brand-orange",
  "Public API": "border-[#6741d9] bg-[#6741d9]/10 text-[#6741d9]",
  Build: "border-root-fg/40 bg-root-fg/5 text-root-fg/60",
  AI: "border-brand-yellow bg-brand-yellow/10 text-brand-orange",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  const colorClass = categoryColors[entry.category] || "border-root-fg/20 bg-root-fg/5 text-root-fg";
  return (
    <div className="sketch-card p-4 hover-lift">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <Link
            href={`/docs#${entry.module.replace(/\//g, "-")}`}
            className="text-base font-bold font-caveat hover:text-brand-blue transition-colors"
          >
            {entry.module}
          </Link>
          <span className="text-[10px] text-root-fg/40 font-mono ml-2">{entry.lineCount} lines</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 sketch-border font-semibold whitespace-nowrap ${colorClass}`}>
          {entry.category}
        </span>
      </div>
      <p className="text-sm text-root-fg/70 leading-relaxed mb-2">{entry.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {entry.types.map((t) => (
          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue rounded font-mono">
            type {t}
          </span>
        ))}
        {entry.classes.map((c) => (
          <span key={c} className="text-[10px] px-1.5 py-0.5 bg-brand-red/10 text-brand-red rounded font-mono">
            class {c}
          </span>
        ))}
        {entry.functions.map((f) => (
          <span key={f} className="text-[10px] px-1.5 py-0.5 bg-brand-green/10 text-[#00c853] rounded font-mono">
            fn {f}()
          </span>
        ))}
      </div>
      {entry.ai && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-brand-orange">
          <Sparkles size={12} className="mt-0.5 shrink-0" />
          <span>{entry.ai}</span>
        </div>
      )}
    </div>
  );
}

export default function ChangelogPage() {
  const totalModules = changelog.reduce((sum, v) => sum + v.stats.modules, 0);

  return (
    <div className="min-h-screen flex flex-col font-kalam">
      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between border-b-2 border-root-fg border-dashed sticky top-0 bg-[#fffdf6] z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="sketch-button p-2 bg-white hover:bg-brand-blue hover:text-white group">
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="sketch-border p-1.5 bg-brand-green text-white animate-wiggle" style={{ animationDelay: "0.3s" }}>
              <GitBranch size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold font-caveat leading-none">Changelog</h1>
              <span className="text-[10px] text-root-fg/50">
                {changelog.length} release{changelog.length !== 1 ? "s" : ""} &middot; {totalModules} modules
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/docs" className="sketch-button px-2.5 py-1 text-xs hover:bg-brand-blue hover:text-white">
            Docs
          </Link>
          <a href="https://notier.ai" target="_blank" className="flex items-center gap-1.5 hover:text-brand-blue text-xs">
            <Image src="/notiericon.png" alt="Notier.ai" width={14} height={14} className="rounded-[2px]" />
            <span className="font-semibold">Notier.ai</span>
          </a>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-brand-red sketch-border hover:scale-150 transition-transform cursor-pointer"></div>
            <div className="w-3 h-3 rounded-full bg-brand-blue sketch-border hover:scale-150 transition-transform cursor-pointer"></div>
            <div className="w-3 h-3 rounded-full bg-brand-yellow sketch-border hover:scale-150 transition-transform cursor-pointer"></div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full">
        {/* Version timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-root-fg/15 hidden md:block" />

          {changelog.map((version, vi) => (
            <section key={version.version} id={`v${version.version}`} className="mb-16 scroll-mt-24 relative">
              {/* Version header */}
              <div className="flex items-start gap-4 mb-6">
                {/* Timeline dot */}
                <div className="hidden md:flex w-10 h-10 shrink-0 sketch-border bg-white items-center justify-center z-10 relative">
                  <Tag size={18} className={vi === 0 ? "text-brand-green" : "text-root-fg/50"} />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-3 mb-2">
                    <h2 className="text-4xl font-bold font-caveat">v{version.version}</h2>
                    <span className="text-sm text-root-fg/50 flex items-center gap-1">
                      <Clock size={14} /> {formatDate(version.date)}
                    </span>
                    {vi === 0 && (
                      <span className="sketch-border px-2 py-0.5 bg-brand-green/15 text-brand-green text-[10px] font-bold uppercase tracking-wider">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-root-fg/70 text-lg mb-4">{version.summary}</p>

                  {/* Stats bar */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="sketch-border px-2.5 py-1 text-xs flex items-center gap-1 bg-white">
                      <Layers size={13} /> {version.stats.modules} modules
                    </span>
                    <span className="sketch-border px-2.5 py-1 text-xs flex items-center gap-1 bg-white">
                      <Code2 size={13} /> {version.stats.totalLines.toLocaleString()} lines
                    </span>
                    {version.stats.types > 0 && (
                      <span className="sketch-border px-2.5 py-1 text-xs flex items-center gap-1 bg-brand-blue/10 text-brand-blue">
                        <Box size={13} /> {version.stats.types} type{version.stats.types !== 1 ? "s" : ""}
                      </span>
                    )}
                    {version.stats.classes > 0 && (
                      <span className="sketch-border px-2.5 py-1 text-xs flex items-center gap-1 bg-brand-red/10 text-brand-red">
                        <Box size={13} /> {version.stats.classes} class{version.stats.classes !== 1 ? "es" : ""}
                      </span>
                    )}
                    {version.stats.functions > 0 && (
                      <span className="sketch-border px-2.5 py-1 text-xs flex items-center gap-1 bg-brand-green/10 text-[#00c853]">
                        <Code2 size={13} /> {version.stats.functions} fn{version.stats.functions !== 1 ? "s" : ""}
                      </span>
                    )}
                    {version.stats.categories.map((cat) => (
                      <span
                        key={cat}
                        className={`sketch-border px-2 py-0.5 text-[10px] font-semibold ${categoryColors[cat] || "border-root-fg/20 bg-root-fg/5 text-root-fg/60"}`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Entries grouped by category */}
                  {(() => {
                    const byCategory: Record<string, ChangelogEntry[]> = {};
                    for (const e of version.entries) {
                      if (!byCategory[e.category]) byCategory[e.category] = [];
                      byCategory[e.category].push(e);
                    }
                    return Object.entries(byCategory).map(([cat, entries]) => (
                      <div key={cat} className="mb-6">
                        <h3 className="text-xl font-bold font-caveat mb-3 pb-1 border-b-2 border-dashed border-root-fg/15">
                          {cat}
                          <span className="text-xs text-root-fg/40 ml-2 font-normal">({entries.length})</span>
                        </h3>
                        <div className="space-y-3">
                          {entries.map((entry) => (
                            <EntryCard key={entry.module} entry={entry} />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t-2 border-root-fg/20 text-center text-xs text-root-fg/50 hover:text-root-fg/70 transition-colors">
        Auto-generated from <code className="font-mono">@boardier-since</code> annotations &middot; Run{" "}
        <code className="font-mono">npx tsx scripts/generateChangelog.ts</code> to regenerate
      </footer>
    </div>
  );
}
