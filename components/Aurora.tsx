"use client";

import { useEffect, useRef } from "react";

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Three aurora curtains: a sharp lower edge, a long fade upwards, and
// vertical rays that drift and shimmer. Colors are the Awolve teal, blue and violet.
const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_flare;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec3 curtain(vec2 p, float t, float seed, float base, float amp, vec3 low, vec3 high) {
  float edge = base
    + (fbm(vec2(p.x * 1.3 + seed, t * 0.045 + seed)) - 0.5) * amp
    + sin(p.x * 2.1 + t * 0.11 + seed) * 0.06
    + sin(p.x * 5.3 - t * 0.17 + seed * 2.0) * 0.03;
  float d = p.y - edge;
  float body = d > 0.0 ? exp(-d * 4.2) : exp(d * 38.0);
  float rays = fbm(vec2(p.x * 26.0 + seed * 3.0 + d * 2.0, t * 0.3));
  rays = pow(rays, 1.5) * 2.1;
  float shimmer = 0.6 + 0.4 * noise(vec2(p.x * 5.0 - t * 0.5, seed + t * 0.07));
  vec3 col = mix(low, high, smoothstep(0.0, 0.32, d));
  return col * body * rays * shimmer;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * min(aspect, 2.0) * 0.65, uv.y);
  float t = u_time;

  vec3 teal = vec3(0.0, 0.831, 0.667);
  vec3 blue = vec3(0.231, 0.51, 0.965);
  vec3 violet = vec3(0.545, 0.361, 0.965);

  vec3 c = vec3(0.0);
  c += curtain(p, t, 1.7, 0.60, 0.38, teal, blue) * 1.05;
  c += curtain(p, t * 0.8, 7.3, 0.72, 0.32, mix(teal, blue, 0.35), violet) * 0.75;
  c += curtain(p, t * 1.15, 13.1, 0.50, 0.26, teal, mix(teal, violet, 0.6)) * 0.5;

  c *= smoothstep(0.12, 0.42, uv.y);
  c *= 0.6 + 0.4 * smoothstep(0.0, 0.5, uv.x);
  c *= 0.75 + 0.75 * u_flare;
  c = 1.0 - exp(-c * 1.5);

  gl_FragColor = vec4(c, 1.0);
}
`;

const SCALE = 0.6; // render below CSS size; the aurora is soft enough to upscale

export default function Aurora({ flare }: { flare: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flareTarget = useRef(flare ? 1 : 0);

  useEffect(() => {
    flareTarget.current = flare ? 1 : 0;
  }, [flare]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uFlare = gl.getUniformLocation(program, "u_flare");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * SCALE;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flareValue = flareTarget.current;
    let frame = 0;
    const start = performance.now();

    const draw = (now: number) => {
      flareValue += (flareTarget.current - flareValue) * 0.03;
      gl.uniform1f(uTime, reduced ? 40 : 40 + (now - start) / 1000);
      gl.uniform1f(uFlare, reduced ? flareTarget.current : flareValue);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduced || Math.abs(flareTarget.current - flareValue) > 0.01) {
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    frame = requestAnimationFrame(draw);
    const onResize = () => {
      resize();
      if (reduced) frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="aurora-canvas" />;
}
