"use client";

import { useEffect, useRef } from "react";

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
}

// Three depths: many small slow flakes far away, a few large ones close by
const LAYERS = [
  { count: 70, r: [0.6, 1.2], speed: [12, 22], alpha: 0.45 },
  { count: 40, r: [1.2, 2], speed: [22, 38], alpha: 0.65 },
  { count: 14, r: [2, 3.2], speed: [40, 60], alpha: 0.85 },
];

const between = ([a, b]: number[]) => a + Math.random() * (b - a);

export default function Snow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Fewer flakes on small screens
      const density = Math.min(1, (width * height) / (1440 * 900));
      flakes = LAYERS.flatMap((layer) =>
        Array.from({ length: Math.max(4, Math.round(layer.count * density)) }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: between(layer.r),
          speed: between(layer.speed),
          sway: 8 + Math.random() * 18,
          phase: Math.random() * Math.PI * 2,
          alpha: layer.alpha * (0.6 + Math.random() * 0.4),
        }))
      );
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f8fafc";
      for (const f of flakes) {
        const x = f.x + Math.sin(t / 1000 + f.phase) * f.sway;
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const f of flakes) {
        f.y += f.speed * dt;
        f.x += 6 * dt; // light wind
        if (f.y - f.r > height) {
          f.y = -f.r;
          f.x = Math.random() * width;
        }
        if (f.x > width + 20) f.x = -20;
      }
      draw(now);
      frame = requestAnimationFrame(step);
    };

    resize();
    if (reduced) {
      draw(0);
    } else {
      frame = requestAnimationFrame(step);
    }

    const onResize = () => {
      resize();
      if (reduced) draw(0);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="snow-canvas" />;
}
