"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  stagger?: number;     // ms between each child
  duration?: number;
  direction?: "up" | "left" | "right";
}

export default function StaggerChildren({
  children,
  className = "",
  stagger = 100,
  duration = 500,
  direction = "up",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const childStyle = (i: number): React.CSSProperties => {
    const transforms = {
      up: "translateY(24px)",
      left: "translateX(24px)",
      right: "translateX(-24px)",
    };
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : transforms[direction],
      transition: `opacity ${duration}ms ease ${i * stagger}ms, transform ${duration}ms ease ${i * stagger}ms`,
    };
  };

  const arr = Array.isArray(children) ? children : [children];

  return (
    <div ref={ref} className={className}>
      {arr.map((child, i) => (
        <div key={i} style={childStyle(i)}>
          {child}
        </div>
      ))}
    </div>
  );
}
