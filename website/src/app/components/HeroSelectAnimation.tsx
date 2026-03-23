"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

/**
 * HeroSelectAnimation — snappy, satisfying scroll-triggered click animation.
 * 
 * Waits for the user to try to scroll down. Locks scroll during the animation.
 * A cursor swoops in from the bottom right, elegantly clicks the word, 
 * which instantly surrounds it with the Boardier selection box.
 */
export default function HeroSelectAnimation() {
  const [boxVisible, setBoxVisible] = useState(false);
  const cursorControls = useAnimation();

  useEffect(() => {
    // If the window is already scrolled down on mount, skip animation
    if (window.scrollY > 50) {
      setBoxVisible(true);
      return;
    }

    let isAnimating = false;
    let done = false;

    const handler = (e: WheelEvent | TouchEvent) => {
      // If we are finished, let them scroll naturally
      if (done) return;
      
      // If somehow they scrolled down natively, consider it done
      if (window.scrollY > 50) {
        done = true;
        setBoxVisible(true);
        return;
      }

      // Check if it's a scroll down intent
      let isScrollDown = false;
      if (e.type === "wheel") {
        isScrollDown = (e as WheelEvent).deltaY > 0;
      } else if (e.type === "touchmove") {
        // Just rough logic: any touchmove intent while not done
        isScrollDown = true;
      }

      if (!isScrollDown) return; // Allow scrolling up without intercept

      // Intercept the scroll down
      e.preventDefault();

      if (!isAnimating) {
        isAnimating = true;
        runAnimation();
      }
    };

    const runAnimation = async () => {
      // 1. Swoop cursor in from bottom-right to the center of the word
      await cursorControls.start({
        x: 0,
        y: 0,
        opacity: 1,
        transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] } // Swift, snappy deceleration
      });
      
      // 2. The snappy "click" (scale down fast, scale back up)
      await cursorControls.start({
        scale: 0.8,
        transition: { duration: 0.08, ease: "easeOut" }
      });
      await cursorControls.start({
        scale: 1,
        transition: { duration: 0.08, ease: "easeIn" }
      });

      // 3. The Boardier selection box instantly pops in
      setBoxVisible(true);
      
      // 4. Cursor glides away and fades out softly
      cursorControls.start({
        x: 80,
        y: 80,
        opacity: 0,
        transition: { duration: 0.5, delay: 0.1, ease: "easeIn" }
      });

      // Unlock scroll immediately so they can proceed
      done = true;
    };

    // Use passive: false so we can preventDefault
    window.addEventListener("wheel", handler, { passive: false });
    window.addEventListener("touchmove", handler, { passive: false });
    
    return () => {
      window.removeEventListener("wheel", handler);
      window.removeEventListener("touchmove", handler);
    };
  }, [cursorControls]);

  return (
    <span className="relative inline-block">
      <span className="text-brand-red inline-block rotate-2 relative">
        whiteboard.

        {/* Boardier Selection Box Overlay */}
        <span
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: "-6%",
            width: "100%",
            height: "112%",
            opacity: boxVisible ? 1 : 0,
            border: "2px solid var(--boardier-blue)",
            backgroundColor: "rgba(41, 121, 255, 0.08)",
            borderRadius: "2px",
          }}
        >
          {/* Corner and Mid-edge Handles */}
          {boxVisible && (
            <>
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_ease-out]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.02s_ease-out_both]" />
              <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.04s_ease-out_both]" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.06s_ease-out_both]" />
              
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.03s_ease-out_both]" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.05s_ease-out_both]" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.04s_ease-out_both]" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-card-bg border-2 border-[var(--boardier-blue)] rounded-[1px] animate-[scaleIn_0.15s_0.06s_ease-out_both]" />
            </>
          )}
        </span>

        {/* Animated Mouse Cursor */}
        <motion.div
          animate={cursorControls}
          initial={{ x: 250, y: 250, opacity: 0, scale: 1 }}
          className="pointer-events-none absolute left-[45%] top-[50%] z-50 origin-top-left"
        >
          {/* Classic standard Mac/Windows cursor SVG */}
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
            <path 
              d="M2 2L22 17L14 18.5L18 28L14 30L10 21L2 27V2Z" 
              fill="white" 
              stroke="#111" 
              strokeWidth="2" 
              strokeLinejoin="round" 
              style={{ strokeLinecap: "round" }}
            />
          </svg>
        </motion.div>
      </span>
    </span>
  );
}
