// The Awolve logomark as an ice sculpture standing in the landscape.
// Geometry is the 230 x 200 logomark; everything else is drawn relative to its edges.

const MARK =
  "M33.3013 200L155.242 129.601L195.889 200H230L114.525 0L97.5398 29.6616L140.75 104.5L62.2845 149.802L112.594 62.6678H78.6396L0 200H33.3013Z";

// Snow lies on the edges that face upwards, nudged slightly outward
const SNOW = [
  "M113.2 -1.2 L97 27.5", // apex, left face
  "M115.8 -1.2 L160 75", // apex, right face
  "M78 61.2 L113.4 61.2", // the flat ledge
  "M77.4 63.2 L50 110.5", // outer left edge
  "M139.6 103.2 L92 130.6", // top of the crossbar
];

// Icicles hang from the underside of the crossbar: y = 200 - 0.5773 (x - 33.3)
const ICICLES = [58, 71, 83, 96, 108, 121, 133, 146].map((x, i) => {
  const y = 200 - 0.5773 * (x - 33.3) + 0.6;
  const len = [7, 4, 10, 5, 8, 3.5, 9, 5][i];
  return `M${x - 1.6} ${y} L${x + 1.6} ${y} L${x} ${y + len} Z`;
});

// Four-point glints placed on edges
const GLINTS = [
  { x: 114.5, y: 2, d: "0s" },
  { x: 96, y: 61.5, d: "2.3s" },
  { x: 178, y: 170, d: "4.1s" },
];

function glint(x: number, y: number, r: number) {
  const k = r * 0.18;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
}

export default function IceMark() {
  return (
    <svg className="icemark" viewBox="-30 -30 290 250" aria-hidden="true">
      <defs>
        <linearGradient id="ice-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1fffb" />
          <stop offset="0.28" stopColor="#9be9de" />
          <stop offset="0.62" stopColor="#3b82f6" stopOpacity="0.85" />
          <stop offset="1" stopColor="#0a2540" stopOpacity="0.9" />
        </linearGradient>

        {/* Light from the upper left: lit faces, then shadowed faces */}
        <linearGradient id="ice-facets" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#050d1a" stopOpacity="0.45" />
        </linearGradient>

        <linearGradient id="ice-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="drift" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6f4ff" />
          <stop offset="0.25" stopColor="#7fa6c9" />
          <stop offset="0.75" stopColor="#0b1d33" />
        </linearGradient>

        <clipPath id="ice-clip">
          <path d={MARK} />
        </clipPath>

        <filter id="ice-frost" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0.9 -0.35"
          />
        </filter>

        <filter id="ice-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>

        <filter id="snow-lumps" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
        </filter>
      </defs>

      {/* Aurora light around the sculpture */}
      <path className="icemark-glow" d={MARK} fill="#00d4aa" filter="url(#ice-glow)" />

      <g clipPath="url(#ice-clip)">
        <path d={MARK} fill="url(#ice-body)" />
        <rect x="-30" y="-30" width="290" height="250" fill="url(#ice-facets)" />
        {/* Fractures running along the strokes */}
        <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.6" fill="none">
          <path d="M20 190 L92 66" />
          <path d="M118 12 L176 112 L170 126" />
          <path d="M60 170 L120 136 L126 142" />
          <path d="M150 60 L205 160" strokeOpacity="0.2" />
        </g>
        <rect x="-30" y="-30" width="290" height="250" filter="url(#ice-frost)" opacity="0.22" />
        <rect className="icemark-sweep" x="-60" y="-30" width="70" height="250" fill="url(#ice-sweep)" />
      </g>

      {/* Crisp edge */}
      <path d={MARK} fill="none" stroke="#e6fffa" strokeOpacity="0.7" strokeWidth="0.7" />

      <g fill="#dff7ff" fillOpacity="0.85">
        {ICICLES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      <g filter="url(#snow-lumps)" stroke="#f8fafc" strokeLinecap="round" fill="none">
        {SNOW.map((d, i) => (
          <path key={i} d={d} strokeWidth={i === 2 ? 6 : 4.2} />
        ))}
      </g>

      {/* Snowdrift the sculpture stands in */}
      <path
        d="M-28 220 Q-8 196 24 193 Q58 186 92 192 Q130 182 168 191 Q206 184 236 195 Q252 202 262 220 Z"
        fill="url(#drift)"
      />

      <g fill="#ffffff">
        {GLINTS.map((g, i) => (
          <path
            key={i}
            className="icemark-glint"
            style={{ animationDelay: g.d, transformOrigin: `${g.x}px ${g.y}px` }}
            d={glint(g.x, g.y, 7)}
          />
        ))}
      </g>
    </svg>
  );
}
