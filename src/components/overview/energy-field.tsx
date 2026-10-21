"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

// A WebGL layer under the flow diagram: soft light pooling around each part of the
// system and a stream of glowing particles along every line that carries power.
// It is decoration only. The SVG and labels on top carry all the information.

export interface FieldSegment {
  /** Start and end on the diagram's 400 × 300 canvas; particles travel from → to. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** CSS colour token, e.g. "--sun" */
  color: string;
  /** 0..1, how strongly to draw this stream; 0 hides it. */
  strength: number;
  /** Seconds for a particle to cross the line. */
  seconds: number;
}

export interface FieldGlow {
  at: { x: number; y: number };
  color: string;
  strength: number;
}

const W = 400;
const H = 300;
const SEGMENTS = 4;
const GLOWS = 5;
const PER_SEGMENT = 70;
const AMBIENT = 90;

const glowVertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uGlow[${GLOWS}];
  uniform vec3 uGlowColor[${GLOWS}];
  uniform vec2 uPointer;
  uniform float uPointerOn;
  uniform float uDark;
  varying vec2 vPos;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec3 col = vec3(0.0);
    float a = 0.0;
    for (int i = 0; i < ${GLOWS}; i++) {
      vec3 g = uGlow[i];
      if (g.z <= 0.001) continue;
      float d = distance(vPos, g.xy);
      float breathe = 0.85 + 0.15 * sin(uTime * 1.3 + float(i) * 1.7);
      float k = g.z * breathe * (exp(-d * d / 2600.0) * 0.9 + exp(-d * d / 16000.0) * 0.35);
      col += uGlowColor[i] * k;
      a += k;
    }
    // Slow shimmer so the light feels alive rather than painted on.
    float n = noise(vPos * 0.018 + vec2(uTime * 0.05, -uTime * 0.04));
    a *= 0.75 + 0.5 * n;
    col *= 0.75 + 0.5 * n;

    float pd = distance(vPos, uPointer);
    float p = uPointerOn * exp(-pd * pd / 3000.0) * 0.12;
    col += vec3(1.0) * p * uDark;
    a += p * uDark;

    a = clamp(a, 0.0, 1.0) * mix(0.5, 0.75, uDark);
    gl_FragColor = vec4(col / max(a, 0.0001) * a, a);
  }
`;

const pointVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aSeg;
  attribute float aSize;
  uniform float uTime;
  uniform vec2 uFrom[${SEGMENTS}];
  uniform vec2 uTo[${SEGMENTS}];
  uniform float uSpeed[${SEGMENTS}];
  uniform float uAmt[${SEGMENTS}];
  uniform vec3 uSegColor[${SEGMENTS}];
  uniform vec3 uAmbient;
  uniform vec2 uPointer;
  uniform float uPointerOn;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 pos;
    float alpha;
    int seg = int(aSeg + 0.5);
    if (seg < ${SEGMENTS}) {
      vec2 from = uFrom[0]; vec2 to = uTo[0]; float speed = uSpeed[0]; float amt = uAmt[0]; vec3 c = uSegColor[0];
      if (seg == 1) { from = uFrom[1]; to = uTo[1]; speed = uSpeed[1]; amt = uAmt[1]; c = uSegColor[1]; }
      if (seg == 2) { from = uFrom[2]; to = uTo[2]; speed = uSpeed[2]; amt = uAmt[2]; c = uSegColor[2]; }
      if (seg == 3) { from = uFrom[3]; to = uTo[3]; speed = uSpeed[3]; amt = uAmt[3]; c = uSegColor[3]; }
      float t = fract(aSeed * 7.13 + uTime * speed);
      vec2 dir = normalize(to - from);
      vec2 perp = vec2(-dir.y, dir.x);
      // A loose ribbon: particles spread out mid-line and gather at both ends.
      float spread = sin(t * 3.14159) * (4.0 + 10.0 * fract(aSeed * 13.7));
      float wobble = sin(uTime * 2.0 + aSeed * 40.0 + t * 9.0);
      pos = mix(from, to, t) + perp * spread * wobble;
      alpha = amt * smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.82, t);
      vColor = c;
    } else {
      // Ambient motes drifting upward like dust in sunlight.
      float t = fract(aSeed * 3.7 + uTime * 0.012 * (0.5 + fract(aSeed * 9.1)));
      pos = vec2(fract(aSeed * 51.3) * ${W}.0 + sin(uTime * 0.3 + aSeed * 20.0) * 10.0, ${H}.0 + 20.0 - t * (${H}.0 + 40.0));
      alpha = 0.35 * sin(t * 3.14159);
      vColor = uAmbient;
    }

    // Particles part around the pointer.
    vec2 away = pos - uPointer;
    float d = length(away);
    pos += uPointerOn * normalize(away + 0.0001) * 26.0 * exp(-d * d / 1800.0);

    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(pos, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const pointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 1.8) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(core, 6.0) * 0.6), a);
  }
`;

export function EnergyField({ segments, glows, className }: { segments: FieldSegment[]; glows: FieldGlow[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // The render loop reads the latest props from here, so changing them never rebuilds the scene.
  const latest = useRef({ segments, glows });
  latest.current = { segments, glows };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      // Shaders work directly in the sRGB token colours.
      THREE.ColorManagement.enabled = false;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the diagram works fine without it.
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      el.appendChild(renderer.domElement);

      // y runs downward to match the SVG's coordinates.
      const camera = new THREE.OrthographicCamera(0, W, 0, H, -10, 10);
      const scene = new THREE.Scene();

      const vec3s = (n: number) => Array.from({ length: n }, () => new THREE.Vector3());
      const colors = (n: number) => Array.from({ length: n }, () => new THREE.Color());

      const glowUniforms = {
        uTime: { value: 0 },
        uGlow: { value: vec3s(GLOWS) },
        uGlowColor: { value: colors(GLOWS) },
        uPointer: { value: new THREE.Vector2(-999, -999) },
        uPointerOn: { value: 0 },
        uDark: { value: 1 },
      };
      const glowMat = new THREE.ShaderMaterial({
        uniforms: glowUniforms,
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
      });
      const plane = new THREE.PlaneGeometry(W * 1.6, H * 1.6);
      const glowMesh = new THREE.Mesh(plane, glowMat);
      glowMesh.position.set(W / 2, H / 2, -1);
      scene.add(glowMesh);

      const count = SEGMENTS * PER_SEGMENT + AMBIENT;
      const seeds = new Float32Array(count);
      const segs = new Float32Array(count);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        seeds[i] = Math.random();
        const seg = i < SEGMENTS * PER_SEGMENT ? Math.floor(i / PER_SEGMENT) : SEGMENTS;
        segs[i] = seg;
        sizes[i] = seg < SEGMENTS ? 3 + Math.random() * 6 : 1.5 + Math.random() * 2.5;
      }
      const geo = new THREE.BufferGeometry();
      // Positions are computed in the shader; this attribute just sets the vertex count.
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
      geo.setAttribute("aSeg", new THREE.BufferAttribute(segs, 1));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      const v2s = (n: number) => Array.from({ length: n }, () => new THREE.Vector2());
      const pointUniforms = {
        uTime: { value: 0 },
        uFrom: { value: v2s(SEGMENTS) },
        uTo: { value: v2s(SEGMENTS) },
        uSpeed: { value: new Array<number>(SEGMENTS).fill(0) },
        uAmt: { value: new Array<number>(SEGMENTS).fill(0) },
        uSegColor: { value: colors(SEGMENTS) },
        uAmbient: { value: new THREE.Color() },
        uPointer: glowUniforms.uPointer,
        uPointerOn: glowUniforms.uPointerOn,
        uPixelRatio: { value: dpr },
      };
      const pointMat = new THREE.ShaderMaterial({
        uniforms: pointUniforms,
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        transparent: true,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, pointMat);
      points.frustumCulled = false;
      scene.add(points);

      // Colours come from the design tokens, so they follow the light/dark theme.
      const tokenCache = new Map<string, string>();
      const readToken = (name: string) => {
        if (!tokenCache.has(name)) tokenCache.set(name, getComputedStyle(el).getPropertyValue(name).trim() || "#ffffff");
        return tokenCache.get(name)!;
      };
      const applyTheme = () => {
        tokenCache.clear();
        const dark = document.documentElement.classList.contains("dark");
        glowUniforms.uDark.value = dark ? 1 : 0;
        const blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
        glowMat.blending = blending;
        pointMat.blending = blending;
        glowMat.needsUpdate = pointMat.needsUpdate = true;
        pointUniforms.uAmbient.value.set(readToken(dark ? "--sun-ink" : "--sun"));
      };
      applyTheme();
      const themeObserver = new MutationObserver(applyTheme);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      const resize = () => {
        const { width, height } = el.getBoundingClientRect();
        if (width > 0 && height > 0) renderer.setSize(width, height, false);
      };
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(el);

      let pointerTarget = 0;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        glowUniforms.uPointer.value.set(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
        pointerTarget = 1;
      };
      const onLeave = () => (pointerTarget = 0);
      const area = el.parentElement ?? el;
      area.addEventListener("pointermove", onMove);
      area.addEventListener("pointerleave", onLeave);

      const color = new THREE.Color();
      const sync = (ease: number) => {
        const { segments: s, glows: g } = latest.current;
        for (let i = 0; i < SEGMENTS; i++) {
          const seg = s[i];
          const amt = seg ? seg.strength : 0;
          pointUniforms.uAmt.value[i] += (amt - pointUniforms.uAmt.value[i]) * ease;
          if (!seg) continue;
          pointUniforms.uFrom.value[i].set(seg.from.x, seg.from.y);
          pointUniforms.uTo.value[i].set(seg.to.x, seg.to.y);
          pointUniforms.uSpeed.value[i] = 1 / seg.seconds / 2.2;
          pointUniforms.uSegColor.value[i].lerp(color.set(readToken(seg.color)), ease);
        }
        for (let i = 0; i < GLOWS; i++) {
          const gl = g[i];
          const v = glowUniforms.uGlow.value[i];
          v.z += ((gl?.strength ?? 0) - v.z) * ease;
          if (!gl) continue;
          v.x = gl.at.x;
          v.y = gl.at.y;
          glowUniforms.uGlowColor.value[i].lerp(color.set(readToken(gl.color)), ease);
        }
      };

      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);

      let raf = 0;
      let last = performance.now();
      let t = Math.random() * 100;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) {
          last = now;
          return;
        }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;
        glowUniforms.uTime.value = pointUniforms.uTime.value = t;
        glowUniforms.uPointerOn.value += (pointerTarget - glowUniforms.uPointerOn.value) * Math.min(1, dt * 6);
        sync(Math.min(1, dt * 3));
        renderer.render(scene, camera);
      };

      if (reduce) {
        sync(1);
        renderer.render(scene, camera);
      } else {
        sync(1);
        raf = requestAnimationFrame(frame);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        themeObserver.disconnect();
        resizeObserver.disconnect();
        area.removeEventListener("pointermove", onMove);
        area.removeEventListener("pointerleave", onLeave);
        geo.dispose();
        plane.dispose();
        glowMat.dispose();
        pointMat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduce]);

  return <div ref={host} className={className} aria-hidden />;
}
