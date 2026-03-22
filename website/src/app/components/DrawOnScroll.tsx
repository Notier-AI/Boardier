"use client";

import { useEffect, useRef } from "react";

/**
 * DrawOnScroll — an SVG doodle path that animates its stroke as the user
 * scrolls past it, like someone is sketching it in real-time with a pencil.
 *
 * Uses scroll-linked progress (IntersectionObserver + scroll listener)
 * to drive the strokeDashoffset from full to zero.
 */

interface Props {
  /** The SVG path `d` attribute string */
  path: string;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Width of the SVG viewBox */
  width?: number;
  /** Height of the SVG viewBox */
  height?: number;
  className?: string;
  /** How far through the viewport the element should be before it starts (0–1) */
  startAt?: number;
  /** How far through the viewport the drawing should be complete (0–1) */
  endAt?: number;
}

export default function DrawOnScroll({
  path,
  color = "var(--boardier-blue)",
  strokeWidth = 2.5,
  width = 300,
  height = 100,
  className = "",
  startAt = 0.85,
  endAt = 0.3,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const pathEl = pathRef.current;
    if (!svg || !pathEl) return;

    const totalLength = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = `${totalLength}`;
    pathEl.style.strokeDashoffset = `${totalLength}`;

    const update = () => {
      const rect = svg.getBoundingClientRect();
      const viewH = window.innerHeight;

      // Element center relative to viewport as 0..1
      // startAt=0.85 means "start drawing when top of el is 85% down the viewport"
      // endAt=0.3 means "finish drawing when top of el hits 30% of viewport"
      const rawProgress = (viewH * startAt - rect.top) / (viewH * (startAt - endAt));
      const progress = Math.min(1, Math.max(0, rawProgress));

      pathEl.style.strokeDashoffset = `${totalLength * (1 - progress)}`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update(); // initial check
    return () => window.removeEventListener("scroll", update);
  }, [path, startAt, endAt]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      style={{ overflow: "visible" }}
    >
      <path
        ref={pathRef}
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ transition: "stroke-dashoffset 0.05s linear" }}
      />
    </svg>
  );
}

/* ─────────────── Pre-made doodle paths ───────────────── */

/** A loopy connector arrow going right — great between sections or feature cards */
export const DOODLE_ARROW_RIGHT =
  "M10 50 C30 20, 60 80, 100 40 C130 10, 150 70, 190 35 L180 25 M190 35 L178 45";

/** A wavy underline */
export const DOODLE_UNDERLINE =
  "M10 50 C40 30, 60 70, 90 50 C120 30, 140 70, 170 50 C200 30, 220 70, 260 50";

/** A loose circle meant to "circle" something important */
export const DOODLE_CIRCLE =
  "M130 15 C190 10, 250 45, 245 75 C240 105, 185 130, 130 125 C75 120, 15 100, 12 70 C9 40, 70 20, 130 15";

/** Sketchy checkmark */
export const DOODLE_CHECK =
  "M15 55 L55 90 L145 15";

/** A curly brace / bracket left */
export const DOODLE_BRACE =
  "M40 5 C20 5, 10 15, 10 30 C10 45, 5 48, 0 50 C5 52, 10 55, 10 70 C10 85, 20 95, 40 95";

/** A little star burst */
export const DOODLE_STAR =
  "M50 5 L55 40 L90 25 L60 50 L90 75 L55 60 L50 95 L45 60 L10 75 L40 50 L10 25 L45 40 Z";
