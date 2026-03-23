"use client";

import { useRef, useState, useEffect } from 'react';
import { BoardierCanvas, AIChatPopup, defaultTheme } from '../../../../';
import type { BoardierCanvasRef } from '../../../../ui/BoardierCanvas';
import type { BoardierEngine } from '../../../../core/Engine';

export default function DemoPage() {
  const canvasRef = useRef<BoardierCanvasRef>(null);
  const [engine, setEngine] = useState<BoardierEngine | null>(null);

  useEffect(() => {
    // Get engine after canvas mounts
    if (canvasRef.current) {
      setEngine(canvasRef.current.getEngine());
    }
  }, []);

  return (
    <main className="w-screen h-screen">
      <BoardierCanvas ref={canvasRef} />
      <AIChatPopup
        engine={engine}
        theme={defaultTheme}
        config={{
          position: 'bottom-right',
        }}
      />
    </main>
  );
}
