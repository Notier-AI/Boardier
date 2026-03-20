"use client";

import { useState, useRef, useEffect } from "react";
import rough from "roughjs";

/* ━━━━━━━━━━━━━━━━ 1. Roughness Demo ━━━━━━━━━━━━━━━━ */

export function RoughnessDemo() {
  const [roughness, setRoughness] = useState(1.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rc = rough.canvas(canvas);

    rc.rectangle(20, 12, 95, 68, {
      roughness,
      stroke: "#ff3b3b",
      strokeWidth: 2,
      fill: "rgba(255,59,59,0.07)",
      fillStyle: "hachure",
    });

    rc.circle(190, 46, 58, {
      roughness,
      stroke: "#2979ff",
      strokeWidth: 2,
      fill: "rgba(41,121,255,0.07)",
      fillStyle: "cross-hatch",
    });

    rc.line(120, 46, 156, 46, {
      roughness,
      stroke: "#00c853",
      strokeWidth: 2,
    });

    rc.polygon(
      [
        [130, 80],
        [150, 95],
        [130, 110],
        [110, 95],
      ],
      {
        roughness,
        stroke: "#ff9800",
        strokeWidth: 1.5,
        fill: "rgba(255,152,0,0.07)",
        fillStyle: "dots",
      },
    );
  }, [roughness]);

  const label =
    roughness >= 4.5 ? "it's alive 🫠" : roughness <= 0.2 ? "boring mode ✨" : `roughness: ${roughness.toFixed(1)}`;

  return (
    <div className="sketch-card p-5 hover-lift flex flex-col items-center text-center">
      <h3 className="text-2xl font-bold mb-1 font-caveat text-brand-red">Control the Roughness</h3>
      <p className="text-sm text-root-fg/60 mb-3">Drag the slider. Watch everything get sketchier.</p>
      <canvas ref={canvasRef} width={260} height={125} className="w-full max-w-[260px] mb-3 rounded" />
      <input
        type="range"
        min="0"
        max="5"
        step="0.1"
        value={roughness}
        onChange={(e) => setRoughness(Number(e.target.value))}
        className="w-full max-w-[220px] cursor-pointer h-2 accent-[var(--boardier-red)]"
      />
      <span className="text-xs text-root-fg/40 mt-1.5 font-mono">{label}</span>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━ 2. Freehand Demo ━━━━━━━━━━━━━━━━━ */

const quips = [
  "Your canvas awaits, maestro.",
  "A masterpiece in progress.",
  "Bold choice.",
  "Picasso, is that you?",
  "Keep going…",
  "Frame it. Ship it.",
  "You should charge for this.",
  "Museum-worthy, honestly.",
];

export function FreehandDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [strokes, setStrokes] = useState(0);

  const pos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#2979ff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    last.current = p;
  };

  const endDraw = () => {
    if (drawing.current) setStrokes((s) => s + 1);
    drawing.current = false;
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, 260, 140);
    setStrokes(0);
  };

  return (
    <div className="sketch-card p-5 hover-lift flex flex-col items-center text-center">
      <h3 className="text-2xl font-bold mb-1 font-caveat text-brand-blue">Freehand? Go Ahead.</h3>
      <p className="text-sm text-root-fg/60 mb-3">{quips[Math.min(strokes, quips.length - 1)]}</p>
      <canvas
        ref={canvasRef}
        width={260}
        height={140}
        className="w-full max-w-[260px] border-2 border-dashed border-root-fg/20 rounded bg-white cursor-crosshair mb-2 touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button onClick={clear} className="sketch-button text-xs px-4 py-1 hover:bg-brand-red hover:text-white">
        {strokes > 3 ? "Start Over 😅" : "Clear"}
      </button>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━ 3. Color Palette Demo ━━━━━━━━━━━━ */

const palette = [
  { hex: "#ff3b3b", label: "Red" },
  { hex: "#2979ff", label: "Blue" },
  { hex: "#00c853", label: "Green" },
  { hex: "#ff9800", label: "Orange" },
  { hex: "#e91e63", label: "Pink" },
  { hex: "#6741d9", label: "Purple" },
];

export function ColorDemo() {
  const [color, setColor] = useState("#ff3b3b");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rc = rough.canvas(canvas);

    rc.rectangle(14, 8, 88, 62, {
      roughness: 1.8,
      stroke: color,
      strokeWidth: 2,
      fill: color + "18",
      fillStyle: "hachure",
    });

    rc.circle(172, 40, 54, {
      roughness: 1.8,
      stroke: color,
      strokeWidth: 2,
      fill: color + "18",
      fillStyle: "cross-hatch",
    });

    rc.line(107, 40, 140, 40, {
      roughness: 1.8,
      stroke: color,
      strokeWidth: 2,
    });

    // tiny scribble lines
    for (let i = 0; i < 3; i++) {
      rc.line(20, 78 + i * 8, 55 + i * 6, 78 + i * 8, {
        roughness: 2.2,
        stroke: color + "70",
        strokeWidth: 1,
      });
    }
  }, [color]);

  return (
    <div
      className="sketch-card p-5 hover-lift flex flex-col items-center text-center transition-colors duration-300"
      style={{ borderColor: color }}
    >
      <h3 className="text-2xl font-bold mb-1 font-caveat transition-colors duration-300" style={{ color }}>
        Every Color is Yours
      </h3>
      <p className="text-sm text-root-fg/60 mb-3">Tap a swatch. Everything follows — even the border.</p>
      <canvas ref={canvasRef} width={230} height={105} className="w-full max-w-[230px] mb-3 rounded" />
      <div className="flex gap-2.5">
        {palette.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            className="w-7 h-7 rounded-full sketch-border transition-all duration-200"
            style={{
              backgroundColor: c.hex,
              transform: color === c.hex ? "scale(1.3)" : undefined,
              boxShadow: color === c.hex ? `0 0 0 3px #fffdf6, 0 0 0 5px ${c.hex}` : undefined,
            }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━ 4. Fill Style Demo ━━━━━━━━━━━━━━━ */

const fillIcons: Record<string, React.ReactNode> = {
  hachure: (
    <svg width={14} height={14} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.6" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" />
      <line x1="3" y1="13" x2="13" y2="3" /><line x1="1" y1="10" x2="10" y2="1" /><line x1="1" y1="6" x2="6" y2="1" />
    </svg>
  ),
  solid: (
    <svg width={14} height={14} viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" /></svg>
  ),
  zigzag: (
    <svg width={14} height={14} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" />
      <polyline points="2,5 5,8 8,5 11,8" /><polyline points="2,9 5,12 8,9 11,12" />
    </svg>
  ),
  "cross-hatch": (
    <svg width={14} height={14} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.3" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" />
      <line x1="3" y1="13" x2="13" y2="3" /><line x1="1" y1="10" x2="10" y2="1" /><line x1="1" y1="6" x2="6" y2="1" />
      <line x1="1" y1="3" x2="11" y2="13" /><line x1="4" y1="1" x2="13" y2="10" /><line x1="8" y1="1" x2="13" y2="6" />
    </svg>
  ),
  dots: (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="12" height="12" rx="2" fill="none" />
      <circle cx="4" cy="4" r="1" stroke="none" /><circle cx="10" cy="4" r="1" stroke="none" />
      <circle cx="7" cy="7" r="1" stroke="none" /><circle cx="4" cy="10" r="1" stroke="none" />
      <circle cx="10" cy="10" r="1" stroke="none" />
    </svg>
  ),
  "zigzag-line": (
    <svg width={14} height={14} viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.2" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" />
      <polyline points="2,3 4,5 6,3 8,5 10,3 12,5" /><polyline points="2,7 4,9 6,7 8,9 10,7 12,9" /><polyline points="3,11 5,13 7,11 9,13" />
    </svg>
  ),
};

const fillStyles: { id: string; label: string }[] = [
  { id: "hachure", label: "Hachure" },
  { id: "solid", label: "Solid" },
  { id: "zigzag", label: "Zigzag" },
  { id: "cross-hatch", label: "Cross" },
  { id: "dots", label: "Dots" },
  { id: "zigzag-line", label: "Zig-line" },
];

export function FillStyleDemo() {
  const [fill, setFill] = useState("hachure");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rc = rough.canvas(canvas);

    rc.rectangle(15, 10, 100, 70, {
      roughness: 1.5,
      stroke: "#e91e63",
      strokeWidth: 2,
      fill: "#e91e6330",
      fillStyle: fill as never,
      hachureGap: 6,
    });

    rc.circle(185, 50, 65, {
      roughness: 1.5,
      stroke: "#e91e63",
      strokeWidth: 2,
      fill: "#e91e6330",
      fillStyle: fill as never,
      hachureGap: 6,
    });

    rc.polygon(
      [
        [115, 95],
        [145, 95],
        [130, 120],
      ],
      {
        roughness: 1.5,
        stroke: "#e91e63",
        strokeWidth: 2,
        fill: "#e91e6330",
        fillStyle: fill as never,
        hachureGap: 5,
      },
    );
  }, [fill]);

  return (
    <div className="sketch-card p-5 hover-lift flex flex-col items-center text-center">
      <h3 className="text-2xl font-bold mb-1 font-caveat text-brand-pink">Hatch It, Dot It, Zig It</h3>
      <p className="text-sm text-root-fg/60 mb-3">Pick a fill pattern. Every shape picks it up.</p>
      <canvas ref={canvasRef} width={260} height={130} className="w-full max-w-[260px] mb-3 rounded" />
      <div className="flex flex-wrap justify-center gap-1.5">
        {fillStyles.map((f) => (
          <button
            key={f.id}
            onClick={() => setFill(f.id)}
            className="sketch-button text-[11px] px-2 py-0.5 transition-all duration-200 flex items-center gap-1"
            style={{
              backgroundColor: fill === f.id ? "#e91e63" : undefined,
              color: fill === f.id ? "#fff" : undefined,
            }}
          >
            {fillIcons[f.id]}
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━ 5. AI Generate — Coming Soon ━━━━━ */

const aiIdeas = [
  "Draw me a system architecture",
  "Make a flowchart for user auth",
  "Sketch a wireframe for settings",
  "Map out a database schema",
  "Create an org chart for 12 people",
  "Draw the solar system, roughly",
];

export function AIGenerateDemo() {
  const [typed, setTyped] = useState("");
  const [placeholder, setPlaceholder] = useState(0);
  const [thinking, setThinking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rotate placeholder prompts
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholder((p) => (p + 1) % aiIdeas.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Draw sketchy "thinking" animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // dot grid
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let gx = 8; gx < canvas.width; gx += 14)
      for (let gy = 8; gy < canvas.height; gy += 14)
        ctx.fillRect(gx, gy, 1, 1);

    if (!thinking) {
      // Draw a sparkle icon in the center
      ctx.save();
      ctx.translate(130, 55);
      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      const arms = 4;
      for (let i = 0; i < arms; i++) {
        const angle = (i / arms) * Math.PI * 2 - Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9800";
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.restore();
      return;
    }

    const rc = rough.canvas(canvas);
    // Fake "AI generating" shapes
    rc.rectangle(15, 12, 60, 40, { roughness: 2, stroke: "#ff980060", strokeWidth: 1.5 });
    rc.rectangle(85, 12, 80, 40, { roughness: 2, stroke: "#ff980060", strokeWidth: 1.5 });
    rc.rectangle(175, 12, 60, 40, { roughness: 2, stroke: "#ff980060", strokeWidth: 1.5 });
    rc.line(75, 32, 85, 32, { roughness: 1.5, stroke: "#ff980060", strokeWidth: 1.5 });
    rc.line(165, 32, 175, 32, { roughness: 1.5, stroke: "#ff980060", strokeWidth: 1.5 });
    // Scribble text lines
    for (let i = 0; i < 3; i++) {
      rc.line(20 + i * 5, 70 + i * 10, 70 + i * 10, 70 + i * 10, { roughness: 2.5, stroke: "#ff980040", strokeWidth: 1 });
    }
  }, [thinking]);

  const handleGenerate = () => {
    if (thinking) return;
    setThinking(true);
    setTimeout(() => setThinking(false), 2000);
  };

  return (
    <div className="sketch-card p-5 hover-lift flex flex-col items-center text-center relative overflow-hidden">
      <div className="absolute top-2 right-2 sketch-border px-2 py-0.5 bg-brand-orange/15 text-brand-orange text-[10px] font-bold uppercase tracking-wider">
        Coming Soon
      </div>
      <h3 className="text-2xl font-bold mb-1 font-caveat text-brand-orange">AI Generate</h3>
      <p className="text-sm text-root-fg/60 mb-3">Describe it. The board draws it for you.</p>
      <canvas ref={canvasRef} width={260} height={110} className="w-full max-w-[260px] rounded bg-white mb-2 border-2 border-dashed border-brand-orange/20" />
      <div className="flex w-full max-w-[240px] gap-1.5">
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={aiIdeas[placeholder]}
          className="sketch-border flex-1 px-2 py-1 text-xs bg-white/80 focus:outline-none focus:border-brand-orange placeholder:text-root-fg/30"
        />
        <button
          onClick={handleGenerate}
          className="sketch-button text-xs px-3 py-1 bg-brand-orange/10 hover:bg-brand-orange hover:text-white transition-colors"
        >
          {thinking ? "..." : "Go"}
        </button>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━ 6. Stroke Width Demo ━━━━━━━━━━━━━ */

export function StrokeWidthDemo() {
  const [width, setWidth] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rc = rough.canvas(canvas);

    rc.rectangle(22, 14, 80, 55, {
      roughness: 1.5,
      stroke: "#6741d9",
      strokeWidth: width,
    });

    rc.circle(175, 44, 50, {
      roughness: 1.5,
      stroke: "#6741d9",
      strokeWidth: width,
    });

    rc.line(108, 44, 144, 44, {
      roughness: 1.5,
      stroke: "#6741d9",
      strokeWidth: width,
    });

    rc.arc(130, 100, 70, 40, 0, Math.PI, false, {
      roughness: 1.5,
      stroke: "#6741d9",
      strokeWidth: width,
    });

    // draw a little arrow
    rc.line(20, 100, 80, 100, { roughness: 1.5, stroke: "#6741d9", strokeWidth: width });
    rc.line(70, 92, 80, 100, { roughness: 1.5, stroke: "#6741d9", strokeWidth: width });
    rc.line(70, 108, 80, 100, { roughness: 1.5, stroke: "#6741d9", strokeWidth: width });
  }, [width]);

  const label =
    width >= 8
      ? "chonky boi 🐻"
      : width <= 0.5
        ? "can you even see it? 🔍"
        : `stroke: ${width.toFixed(1)}px`;

  return (
    <div className="sketch-card p-5 hover-lift flex flex-col items-center text-center">
      <h3 className="text-2xl font-bold mb-1 font-caveat" style={{ color: "#6741d9" }}>
        Thicc or Thin?
      </h3>
      <p className="text-sm text-root-fg/60 mb-3">Slide it. Feel the weight of your lines.</p>
      <canvas ref={canvasRef} width={260} height={125} className="w-full max-w-[260px] mb-3 rounded" />
      <input
        type="range"
        min="0.3"
        max="10"
        step="0.1"
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
        className="w-full max-w-[220px] cursor-pointer h-2 accent-[#6741d9]"
      />
      <span className="text-xs text-root-fg/40 mt-1.5 font-mono">{label}</span>
    </div>
  );
}
