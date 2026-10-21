"use client";

import { useEffect, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ";
const DURATION = 2200;
const SETTLE = 0.45; // share of the run spent scrambling before letters start locking

interface DecodeProps {
  text: string;
  animate: boolean;
  onDone?: () => void;
}

// Shows `text` resolving out of random letters, left to right.
export default function Decode({ text, animate, onDone }: DecodeProps) {
  const [progress, setProgress] = useState(animate ? 0 : 1);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!animate) {
      onDone?.();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      onDone?.();
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      setProgress(p);
      setTick((t) => t + 1);
      if (p < 1) {
        frame = requestAnimationFrame(step);
      } else {
        onDone?.();
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, animate]);

  const chars = [...text];
  const locked =
    progress < SETTLE ? 0 : Math.floor(((progress - SETTLE) / (1 - SETTLE)) * chars.length + 0.0001);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {chars.map((c, i) => {
          if (i < locked || c === " " || progress >= 1) return <span key={i}>{c}</span>;
          const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          return (
            <span key={i} className="ch-live">
              {c === c.toLowerCase() ? g.toLowerCase() : g}
            </span>
          );
        })}
      </span>
    </>
  );
}
