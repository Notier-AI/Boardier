"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollProgress — a wobbly, hand-drawn squiggly line on the left
 * margin of the page that fills in as you scroll. It feels like someone
 * is doodling the progress in a notebook margin.
 */

export default function ScrollProgress() {
  const pathRef = useRef<SVGPathElement>(null);
  const [totalLength, setTotalLength] = useState(0);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;

    const len = el.getTotalLength();
    setTotalLength(len);
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const progress = Math.min(1, scrollTop / docHeight);
      el.style.strokeDashoffset = `${len * (1 - progress)}`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Generate a long wobbly path that spans the full viewport height
  // We'll use a sine-wave wobble on the x-axis to make it feel organic
  const points: string[] = [];
  const segments = 60;
  for (let i = 0; i <= segments; i++) {
    const y = (i / segments) * 100;
    const wobble = Math.sin(i * 0.9) * 3 + Math.cos(i * 1.4) * 2;
    const x = 12 + wobble;
    if (i === 0) {
      points.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else {
      // Use quadratic curves for smoothness
      const prevY = ((i - 1) / segments) * 100;
      const midY = (prevY + y) / 2;
      const prevWobble = Math.sin((i - 1) * 0.9) * 3 + Math.cos((i - 1) * 1.4) * 2;
      const prevX = 12 + prevWobble;
      points.push(`Q ${prevX.toFixed(1)} ${midY.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  const pathD = points.join(" ");

  return (
    <div
      className="fixed left-0 top-0 h-screen w-8 z-50 pointer-events-none hidden lg:block"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        fill="none"
      >
        {/* Track: very faint dashed line */}
        <path
          d={pathD}
          stroke="var(--boardier-blue)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.1"
          strokeDasharray="3 5"
        />
        {/* Active progress stroke */}
        <path
          ref={pathRef}
          d={pathD}
          stroke="var(--boardier-blue)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      {/* Little pencil dot at the end position — optional, can add later */}
    </div>
  );
}
