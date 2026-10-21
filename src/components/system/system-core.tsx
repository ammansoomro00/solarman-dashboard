"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// A small 3D model of the system: the inverter as a glowing faceted core, every
// other device as a satellite on its orbit, with data pulses running along the
// links of anything that's online. Drag to spin it. Decoration only: the cards
// beside it carry the actual status in words.

export interface CoreSatellite {
  /** CSS colour token for the satellite, e.g. "--battery" */
  kind: string;
  /** CSS colour token for its status, e.g. "--home" */
  status: string;
  online: boolean;
}

export function SystemCore({ tone, satellites, className }: { tone: string; satellites: CoreSatellite[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const key = satellites.map((s) => `${s.kind}:${s.status}:${s.online}`).join("|");
  const latest = useRef({ tone, satellites });
  latest.current = { tone, satellites };

  // Rebuild when the theme flips, so colours and blending match.
  const [theme, setTheme] = useState<boolean | null>(null);
  useEffect(() => {
    const read = () => setTheme(document.documentElement.classList.contains("dark"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || theme === null) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      // Shaders and materials work directly in the sRGB token colours.
      THREE.ColorManagement.enabled = false;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
      el.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 1.3, 7.2);
      camera.lookAt(0, 0, 0);

      const { tone: toneToken, satellites: sats } = latest.current;
      const css = getComputedStyle(el);
      const token = (n: string) => new THREE.Color(css.getPropertyValue(n).trim() || "#888888");
      const dark = document.documentElement.classList.contains("dark");
      const blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      const disposables: { dispose: () => void }[] = [];
      const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

      // Soft round glow texture shared by every sprite.
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 128;
      const g = glowCanvas.getContext("2d")!;
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      const glowTex = track(new THREE.CanvasTexture(glowCanvas));
      const glow = (color: InstanceType<typeof THREE.Color>, size: number, opacity: number) => {
        const m = track(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending }));
        const s = new THREE.Sprite(m);
        s.scale.setScalar(size);
        return s;
      };

      const world = new THREE.Group();
      world.rotation.x = 0.18;
      scene.add(world);

      // Inverter core: a faceted shell around a bright heart.
      const sunColor = token("--sun");
      const toneColor = token(toneToken);
      const coreGeo = track(new THREE.IcosahedronGeometry(0.78, 1));
      const shell = new THREE.Mesh(
        coreGeo,
        track(new THREE.MeshBasicMaterial({ color: toneColor, wireframe: true, transparent: true, opacity: dark ? 0.55 : 0.7 })),
      );
      const innerGeo = track(new THREE.IcosahedronGeometry(0.42, 0));
      const inner = new THREE.Mesh(innerGeo, track(new THREE.MeshBasicMaterial({ color: sunColor, transparent: true, opacity: 0.9 })));
      const coreGlow = glow(sunColor, 3.2, dark ? 0.55 : 0.35);
      const toneGlow = glow(toneColor, 5, dark ? 0.22 : 0.16);
      world.add(toneGlow, coreGlow, shell, inner);

      // Satellites on tilted orbits.
      const lineMat = track(new THREE.LineBasicMaterial({ color: toneColor, transparent: true, opacity: dark ? 0.28 : 0.4 }));
      const satObjs = sats.map((s, i) => {
        const radius = 1.85 + (i % 2) * 0.45;
        const tilt = (i - (sats.length - 1) / 2) * 0.35;
        const orbit = new THREE.Group();
        orbit.rotation.set(tilt, 0, tilt * 0.6);
        world.add(orbit);

        const ringPts = new THREE.EllipseCurve(0, 0, radius, radius).getPoints(96).map((p) => new THREE.Vector3(p.x, 0, p.y));
        const ring = new THREE.LineLoop(track(new THREE.BufferGeometry().setFromPoints(ringPts)), lineMat);
        orbit.add(ring);

        const color = token(s.kind);
        const statusColor = token(s.status);
        const body = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.17, 0)), track(new THREE.MeshBasicMaterial({ color })));
        const halo = glow(statusColor, s.online ? 0.9 : 0.7, s.online ? 0.75 : 0.45);
        const sat = new THREE.Group();
        sat.add(halo, body);
        orbit.add(sat);

        // Link back to the core, rebuilt every frame as the satellite moves.
        const linkGeo = track(new THREE.BufferGeometry());
        linkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
        const link = new THREE.Line(linkGeo, track(new THREE.LineBasicMaterial({ color: statusColor, transparent: true, opacity: s.online ? 0.5 : 0.18 })));
        world.add(link);

        const pulse = glow(color, 0.38, s.online ? 0.95 : 0);
        world.add(pulse);

        return {
          orbit,
          sat,
          body,
          halo,
          link,
          linkGeo,
          pulse,
          radius,
          phase: (i / Math.max(1, sats.length)) * Math.PI * 2,
          speed: 0.22 + (i % 3) * 0.06,
          online: s.online,
        };
      });

      // A faint dust shell for depth.
      const DUST = 260;
      const dust = new Float32Array(DUST * 3);
      for (let i = 0; i < DUST; i++) {
        const r = 2.4 + Math.random() * 1.6;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        dust.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.5, r * Math.sin(ph) * Math.sin(th)], i * 3);
      }
      const dustGeo = track(new THREE.BufferGeometry());
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
      const dustPts = new THREE.Points(
        dustGeo,
        track(
          new THREE.PointsMaterial({
            color: dark ? 0xffffff : sunColor,
            size: 0.035,
            transparent: true,
            opacity: dark ? 0.45 : 0.6,
            depthWrite: false,
            blending,
          }),
        ),
      );
      world.add(dustPts);

      const resize = () => {
        const { width, height } = el.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // Drag to spin; it keeps a little momentum and settles back to a slow drift.
      let spin = 0.18;
      let dragging = false;
      let lastX = 0;
      const onDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        canvas.style.cursor = "grabbing";
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        world.rotation.y += dx * 0.012;
        spin = dx * 0.6;
      };
      const onUp = () => {
        dragging = false;
        canvas.style.cursor = "grab";
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      const a = new THREE.Vector3();
      let t = 0;
      const place = (dt: number) => {
        t += dt;
        if (!dragging) {
          world.rotation.y += spin * dt;
          spin += (0.18 - spin) * Math.min(1, dt * 1.5);
        }
        shell.rotation.set(t * 0.21, t * 0.33, 0);
        inner.rotation.set(-t * 0.4, t * 0.25, 0);
        const breathe = 1 + Math.sin(t * 1.6) * 0.06;
        coreGlow.scale.setScalar(3.2 * breathe);
        for (const s of satObjs) {
          const ang = s.phase + t * s.speed;
          s.sat.position.set(Math.cos(ang) * s.radius, 0, Math.sin(ang) * s.radius);
          s.body.rotation.y = t * 1.2;
          s.halo.scale.setScalar((s.online ? 0.9 : 0.7) * (s.online ? 1 + Math.sin(t * 3 + s.phase) * 0.15 : 0.8 + Math.abs(Math.sin(t * 6)) * 0.3));
          s.sat.updateMatrixWorld(true);
          s.sat.getWorldPosition(a);
          world.worldToLocal(a);
          const pos = s.linkGeo.getAttribute("position") as InstanceType<typeof THREE.BufferAttribute>;
          pos.setXYZ(0, 0, 0, 0);
          pos.setXYZ(1, a.x, a.y, a.z);
          pos.needsUpdate = true;
          // Readings travel from the device into the inverter.
          const k = 1 - ((t * 0.7 + s.phase) % 1);
          s.pulse.position.copy(a).multiplyScalar(k);
        }
        dustPts.rotation.y = -t * 0.03;
      };

      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);

      let raf = 0;
      let last = performance.now();
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) {
          last = now;
          return;
        }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        place(dt);
        renderer.render(scene, camera);
      };
      place(0.0001);
      renderer.render(scene, camera);
      if (!reduce) raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        for (const d of disposables) d.dispose();
        renderer.dispose();
        canvas.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduce, key, tone, theme]);

  return <div ref={host} aria-hidden className={className} />;
}
