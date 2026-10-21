"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

// A living sky behind the whole app, drawn with WebGL. By day a warm sun bloom
// travels from east to west with the real sunrise and sunset; by night it's a
// deep sky with faint aurora and stars. It sits behind translucent cards, so it
// stays quiet: slow, low-contrast, rendered at reduced resolution and ~30 fps.

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uDay;      // 0..1 progress from sunrise to sunset, <0 or >1 at night
  uniform float uDark;     // 1 in dark theme
  uniform vec3 uSun;
  uniform vec3 uHome;
  uniform vec3 uBattery;
  uniform vec3 uGrid;
  uniform vec3 uPage;
  uniform vec2 uPointer;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    float t = uTime;

    float day = clamp(uDay, 0.0, 1.0);
    float isDay = step(0.0, uDay) * step(uDay, 1.0);

    // Sun position across the top of the screen, following the real day.
    vec2 sunPos = vec2((0.08 + day * 0.84) * aspect, 0.86 + sin(day * 3.14159) * 0.22);
    float sd = distance(p, sunPos);
    float bloom = isDay * (exp(-sd * sd * 9.0) * 0.5 + exp(-sd * sd * 1.6) * 0.18);

    // Aurora ribbons: domain-warped noise drifting slowly.
    vec2 q = vec2(fbm(p * 1.4 + vec2(t * 0.02, 0.0)), fbm(p * 1.4 + vec2(0.0, t * 0.017)));
    float r = fbm(p * 1.8 + q * 1.6 + vec2(t * 0.015, -t * 0.01));
    float band = smoothstep(0.35, 0.85, r) * smoothstep(0.0, 0.7, uv.y);

    vec3 auroraA = mix(uHome, uBattery, smoothstep(0.2, 0.8, q.x));
    vec3 auroraB = mix(uGrid, uBattery, q.y);
    vec3 aurora = mix(auroraA, auroraB, 0.5 + 0.5 * sin(t * 0.05 + p.x));

    vec3 col = uPage;
    float nightAmt = mix(0.22, 0.10, isDay);
    float dayAmt = mix(0.06, 0.14, isDay);
    col = mix(col, aurora, band * mix(dayAmt * 0.5, nightAmt, uDark));
    col = mix(col, uSun, bloom * mix(0.4, 0.32, uDark));

    // Stars, dark theme at night only.
    vec2 g = floor(p * 140.0);
    float star = step(0.9965, hash(g)) * (0.5 + 0.5 * sin(t * 1.5 + hash(g + 3.0) * 30.0));
    col += vec3(star) * uDark * (1.0 - isDay) * smoothstep(0.3, 1.0, uv.y) * 0.6;

    // Soft light around the pointer.
    float pd = distance(p, vec2(uPointer.x * aspect, uPointer.y));
    col += (uDark > 0.5 ? vec3(1.0) : uSun) * exp(-pd * pd * 14.0) * 0.035;

    // Vignette keeps the edges calm.
    float v = smoothstep(1.25, 0.25, distance(uv, vec2(0.5, 0.55)));
    col = mix(uPage, col, mix(0.65, 1.0, v));

    // Dither to avoid banding in the gradients.
    col += (hash(uv * uRes + t) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyBackdrop({ sunrise, sunset }: { sunrise: string | null; sunset: string | null }) {
  const host = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const times = useRef({ sunrise, sunset });
  times.current = { sunrise, sunset };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      // Our shaders work directly in the sRGB token colours, so the page colour matches exactly.
      THREE.ColorManagement.enabled = false;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the plain page colour shows instead.
      }
      // The sky is all soft gradients; half resolution is indistinguishable and much cheaper.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * 0.5);
      const canvas = renderer.domElement;
      canvas.style.cssText = "width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s ease";
      el.appendChild(canvas);

      const uniforms = {
        uTime: { value: Math.random() * 1000 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uDay: { value: 0.5 },
        uDark: { value: 1 },
        uSun: { value: new THREE.Color() },
        uHome: { value: new THREE.Color() },
        uBattery: { value: new THREE.Color() },
        uGrid: { value: new THREE.Color() },
        uPage: { value: new THREE.Color() },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, depthTest: false });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geometry, material));
      const camera = new THREE.Camera();

      const applyTheme = () => {
        const s = getComputedStyle(document.documentElement);
        const get = (n: string) => s.getPropertyValue(n).trim() || "#000000";
        uniforms.uDark.value = document.documentElement.classList.contains("dark") ? 1 : 0;
        uniforms.uSun.value.set(get("--sun"));
        uniforms.uHome.value.set(get("--home"));
        uniforms.uBattery.value.set(get("--battery"));
        uniforms.uGrid.value.set(get("--grid"));
        uniforms.uPage.value.set(get("--page"));
        if (reduce) render();
      };
      const themeObserver = new MutationObserver(() => requestAnimationFrame(applyTheme));
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      const updateDay = () => {
        const { sunrise: rise, sunset: set } = times.current;
        if (!rise || !set) {
          const h = new Date().getHours() + new Date().getMinutes() / 60;
          uniforms.uDay.value = (h - 6) / 12;
          return;
        }
        const a = new Date(rise).getTime();
        const b = new Date(set).getTime();
        uniforms.uDay.value = (Date.now() - a) / (b - a);
      };

      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
        if (reduce) render();
      };

      const pointer = { x: 0.5, y: 0.5 };
      const onMove = (e: PointerEvent) => {
        pointer.x = e.clientX / window.innerWidth;
        pointer.y = 1 - e.clientY / window.innerHeight;
      };

      const render = () => renderer.render(scene, camera);

      applyTheme();
      updateDay();
      resize();
      render();
      canvas.style.opacity = "1";
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onMove, { passive: true });
      const dayTimer = window.setInterval(updateDay, 60_000);

      let raf = 0;
      let last = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (document.hidden || now - last < 33) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        uniforms.uTime.value += dt;
        const pv = uniforms.uPointer.value;
        pv.x += (pointer.x - pv.x) * 0.06;
        pv.y += (pointer.y - pv.y) * 0.06;
        render();
      };
      if (!reduce) raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearInterval(dayTimer);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        themeObserver.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        canvas.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduce]);

  return <div ref={host} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
