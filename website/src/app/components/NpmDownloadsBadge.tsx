"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

/**
 * NpmDownloadsBadge — displays weekly NPM download count for the boardier package.
 * Fetches from the NPM registry API and formats the number with K/M suffixes.
 */
export default function NpmDownloadsBadge() {
  const [downloads, setDownloads] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        // Fetch weekly downloads from NPM registry API
        const res = await fetch(
          "https://api.npmjs.org/downloads/point/last-week/boardier"
        );
        if (res.ok) {
          const data = await res.json();
          setDownloads(data.downloads);
        }
      } catch {
        // Silently fail - badge will just not show
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, []);

  // Format number with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
  };

  // Don't render anything while loading, if fetch failed, or if downloads are under 1,000
  if (loading || downloads === null || downloads < 1000) {
    return null;
  }

  return (
    <a
      href="https://www.npmjs.com/package/boardier"
      target="_blank"
      rel="noopener noreferrer"
      className="sketch-border bg-brand-red/10 px-3 sm:px-4 py-1 text-brand-red rotate-[2deg] flex items-center gap-1.5 sm:gap-2 hover:bg-brand-red/20 transition-colors group text-sm sm:text-base"
      title="Weekly NPM downloads"
    >
      <Download size={14} className="sm:w-4 sm:h-4 group-hover:animate-bounce" />
      <span className="font-semibold">{formatNumber(downloads)}</span>
      <span className="text-xs sm:text-sm opacity-80">weekly downloads</span>
    </a>
  );
}
