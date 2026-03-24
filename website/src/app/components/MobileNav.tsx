"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Book, GitBranch, Github, Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  /* Close on route change (link click) */
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open]);

  return (
    <div className="sm:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="sketch-button p-2"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 sketch-border bg-card-bg p-2 flex flex-col gap-1 min-w-[160px] shadow-lg">
            <Link
              href="/docs"
              onClick={() => setOpen(false)}
              className="sketch-button px-3 py-2 flex items-center gap-2 hover:bg-brand-blue hover:text-white"
            >
              <Book size={16} /> Docs
            </Link>
            <Link
              href="/changelog"
              onClick={() => setOpen(false)}
              className="sketch-button px-3 py-2 flex items-center gap-2 hover:bg-brand-green hover:text-white"
            >
              <GitBranch size={16} /> Changelog
            </Link>
            <a
              href="https://github.com"
              onClick={() => setOpen(false)}
              className="sketch-button px-3 py-2 flex items-center gap-2 hover:bg-brand-red hover:text-white"
            >
              <Github size={16} /> GitHub
            </a>
            <div className="border-t border-dashed border-root-fg/30 my-1" />
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
