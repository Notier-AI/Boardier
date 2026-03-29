"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import { BoardierCanvas, AIChatPopup, defaultTheme } from '../../../../';
import type { BoardierCanvasRef } from '../../../../ui/BoardierCanvas';
import type { BoardierEngine } from '../../../../core/Engine';
import type { CollaborationConfig } from '../../../../core/types';

/** Replace with your deployed Cloudflare Worker URL */
const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'wss://collab.boardier.dev';

export default function DemoPage() {
  const canvasRef = useRef<BoardierCanvasRef>(null);
  const [engine, setEngine] = useState<BoardierEngine | null>(null);

  // Parse ?room= and ?name= from URL
  const collabConfig = useMemo<Partial<CollaborationConfig> | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const name = params.get('name');
    if (roomId) {
      return { signalingUrl: SIGNALING_URL, roomId, userName: name || undefined };
    }
    return undefined;
  }, []);

  useEffect(() => {
    // Get engine after canvas mounts
    if (canvasRef.current) {
      setEngine(canvasRef.current.getEngine());
    }
  }, []);

  return (
    <main className="w-screen h-screen">
      <BoardierCanvas
        ref={canvasRef}
        config={collabConfig ? { collaboration: collabConfig as CollaborationConfig } : undefined}
      />
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
