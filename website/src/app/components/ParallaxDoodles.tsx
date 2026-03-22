"use client";

import { useEffect, useRef } from "react";

/**
 * ParallaxDoodles — tiny sketchy margin scribbles (stars, spirals, arrows,
 * checkmarks) that float at different parallax speeds as you scroll.
 *
 * These live scattered around the page and give the impression of someone
 * idly doodling in a notebook margin while reading.
 */

interface Doodle {
  /** SVG content as a string */
  svg: string;
  /** position as % from left */
  x: number;
  /** position as px from top of the container */
  y: number;
  /** parallax factor: 0 = fixed, 0.5 = half speed, -0.3 = reverse */
  speed: number;
  /** rotation in degrees */
  rotate?: number;
  /** scale */
  scale?: number;
  /** opacity */
  opacity?: number;
  /** color: CSS variable or hex */
  color?: string;
}

// ── SVG mini doodles (hand-drawn feel, kept tiny) ──────────────
const STAR = `<path d="M12 2l2.5 7.5H22l-6 4.5 2.3 7.5L12 17l-6.3 4.5 2.3-7.5-6-4.5h7.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`;
const SPIRAL = `<path d="M12 12c0-2 1.5-3.5 3.5-3.5s3.5 1.8 3.5 4-2 5-5 5-6-2.5-6-5.5 3-7 7-7 8 3.2 8 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
const ARROW_SQUIGGLE = `<path d="M4 20C8 16 10 18 14 12s6-2 10-8M22 4l2 6M24 4l-6 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const SCRIBBLE_CIRCLE = `<path d="M12 4c5 0 9 3.5 9 8s-4 8-9 8-9-3.5-9-8c0-3 2-5.5 4.5-7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
const ZIG = `<path d="M2 18l5-8 5 6 5-10 5 12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const CROSS = `<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

const doodles: Doodle[] = [
  { svg: STAR, x: 5, y: 200, speed: 0.15, rotate: 12, scale: 0.8, color: "var(--boardier-yellow)" },
  { svg: SPIRAL, x: 92, y: 450, speed: -0.1, rotate: -8, scale: 0.9, color: "var(--boardier-blue)", opacity: 0.35 },
  { svg: ARROW_SQUIGGLE, x: 4, y: 700, speed: 0.2, rotate: 15, scale: 0.7, color: "var(--boardier-green)" },
  { svg: SCRIBBLE_CIRCLE, x: 94, y: 950, speed: 0.12, rotate: -20, scale: 1, color: "var(--boardier-red)", opacity: 0.3 },
  { svg: ZIG, x: 6, y: 1200, speed: -0.08, rotate: 5, scale: 0.75, color: "var(--boardier-orange)", opacity: 0.35 },
  { svg: CROSS, x: 93, y: 1500, speed: 0.18, rotate: 45, scale: 0.6, color: "var(--boardier-pink)", opacity: 0.25 },
  { svg: STAR, x: 91, y: 1800, speed: 0.1, rotate: -30, scale: 0.7, color: "var(--boardier-yellow)", opacity: 0.3 },
  { svg: SPIRAL, x: 3, y: 2100, speed: -0.15, rotate: 10, scale: 0.8, color: "var(--boardier-blue)", opacity: 0.25 },
  { svg: ARROW_SQUIGGLE, x: 95, y: 2500, speed: 0.22, rotate: -10, scale: 0.65, color: "var(--boardier-green)", opacity: 0.3 },
  { svg: ZIG, x: 4, y: 2900, speed: 0.08, rotate: -5, scale: 0.8, color: "var(--boardier-red)", opacity: 0.3 },
];

export default function ParallaxDoodles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLDivElement>("[data-speed]");

    const update = () => {
      const scrollY = window.scrollY;
      items.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "0");
        el.style.transform = `translateY(${scrollY * speed}px) rotate(${el.dataset.rotate || 0}deg) scale(${el.dataset.scale || 1})`;
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden hidden lg:block"
      aria-hidden="true"
    >
      {doodles.map((d, i) => (
        <div
          key={i}
          data-speed={d.speed}
          data-rotate={d.rotate ?? 0}
          data-scale={d.scale ?? 1}
          className="absolute will-change-transform"
          style={{
            left: `${d.x}%`,
            top: `${d.y}px`,
            opacity: d.opacity ?? 0.3,
            color: d.color ?? "var(--foreground)",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            dangerouslySetInnerHTML={{ __html: d.svg }}
          />
        </div>
      ))}
    </div>
  );
}
