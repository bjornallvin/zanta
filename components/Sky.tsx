import Aurora from "./Aurora";
import IceMark from "./IceMark";

// Seeded so server and client render the same sky
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2025);

const STARS = Array.from({ length: 110 }, () => ({
  left: rand() * 100,
  top: rand() * 70,
  size: rand() < 0.1 ? 2.5 : rand() < 0.45 ? 1.5 : 1,
  opacity: 0.25 + rand() * 0.65,
}));

// Mountains are drawn in a 1600 x 400 box, bottom-aligned and cropped at the sides
const W = 1600;
const H = 400;

function ridge(points: number, base: number, amp: number, rough: number) {
  const ys: number[] = [];
  let y = base;
  for (let i = 0; i <= points; i++) {
    const peak = Math.sin((i / points) * Math.PI * 2.6 + rand() * 0.6) * amp;
    y = y * (1 - rough) + (base - peak - rand() * amp * 0.5) * rough;
    ys.push(y);
  }
  return ys.map((y, i) => [(i / points) * W, y] as const);
}

function toPath(pts: readonly (readonly [number, number])[]) {
  return `M0 ${H} ` + pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + ` L${W} ${H} Z`;
}

function heightAt(pts: readonly (readonly [number, number])[], x: number) {
  const step = W / (pts.length - 1);
  const i = Math.min(Math.floor(x / step), pts.length - 2);
  const f = (x - i * step) / step;
  return pts[i][1] * (1 - f) + pts[i + 1][1] * f;
}

const FAR = ridge(56, 215, 95, 0.75);
const NEAR = ridge(64, 300, 34, 0.5);

const TREES = Array.from({ length: 70 }, () => {
  const x = rand() * W;
  const h = 16 + rand() * 26;
  return { x, y: heightAt(NEAR, x) + 4, h };
});

function pine(x: number, y: number, h: number) {
  const w = h * 0.42;
  // three stacked tiers and a trunk-less base
  const tier = (top: number, bottom: number, half: number) =>
    `M${x} ${top} L${x + half} ${bottom} L${x - half} ${bottom} Z`;
  return (
    tier(y - h, y - h * 0.45, w * 0.55) +
    tier(y - h * 0.72, y - h * 0.2, w * 0.78) +
    tier(y - h * 0.45, y, w)
  );
}

const TREE_PATH = TREES.map((t) => pine(t.x, t.y, t.h)).join(" ");

export default function Sky({ flare = false }: { flare?: boolean }) {
  return (
    <div className={`sky${flare ? " flare" : ""}`} aria-hidden="true">
      <div className="stars">
        {STARS.map((s, i) => (
          <i
            key={i}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>
      <Aurora flare={flare} />
      <div className="scrim" />
      <svg className="mountains" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="far-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14365a" />
            <stop offset="0.5" stopColor="#0a1d33" />
          </linearGradient>
        </defs>
        <path d={toPath(FAR)} fill="url(#far-fill)" />
        <path
          d={FAR.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke="#00d4aa"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />
      </svg>
      <IceMark />
      <svg className="mountains" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={toPath(NEAR)} fill="#030a14" />
        <path d={TREE_PATH} fill="#030a14" />
      </svg>
    </div>
  );
}
