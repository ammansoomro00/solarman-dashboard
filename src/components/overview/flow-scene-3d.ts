// The live power scene: a small diorama of the home's system in three.js. A house
// with panels on the roof, a battery and inverter on the side wall, a utility pole
// wired to the house. Glowing particles stream along each wire in the direction
// power is moving, and the sun sits where it really is in today's sky.
//
// Imperative on purpose: React hands it state with update() and it renders on its
// own clock, reporting screen positions of each part so React can pin labels to them.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { NODE_IDS, TOKEN, type NodeId, type Tone } from "./flow-model";

// Token colours are sRGB hex; we convert explicitly where lighting needs linear.
THREE.ColorManagement.enabled = false;

export interface SceneStream {
  id: NodeId;
  watts: number;
  inbound: boolean;
  tone: Tone;
}

export interface SceneState {
  streams: SceneStream[];
  solarW: number;
  homeW: number;
  batteryPct: number | null;
  outage: boolean;
  /** 0..1 from sunrise to sunset; anything outside is night. */
  day: number;
  focus: NodeId | null;
}

export type Anchors = Record<NodeId, { x: number; y: number }>;

export interface SceneOptions {
  reduce: boolean;
  onAnchors: (anchors: Anchors) => void;
  onHover: (id: NodeId | null) => void;
  onSelect: (id: NodeId) => void;
}

export interface SceneHandle {
  update: (state: SceneState) => void;
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// Layout (world units, y up). The house sits at the origin facing +z.

const INVERTER = new THREE.Vector3(2.1, 1.3, 0.7);
const ROOF_PITCH = Math.atan2(1.3, 1.75);

/** Each stream's wire, always drawn from the part toward the inverter. */
const WIRES: Record<NodeId, THREE.Vector3[]> = {
  solar: [new THREE.Vector3(0.9, 2.78, 1.02), new THREE.Vector3(1.9, 2.3, 1.68), new THREE.Vector3(2.14, 1.95, 1.25), new THREE.Vector3(2.14, 1.62, 0.78)],
  home: [new THREE.Vector3(0.85, 1.12, 1.6), new THREE.Vector3(1.55, 1.12, 1.62), new THREE.Vector3(2.08, 1.12, 1.3), new THREE.Vector3(2.15, 1.15, 0.92)],
  battery: [new THREE.Vector3(2.4, 1.45, -0.02), new THREE.Vector3(2.45, 1.62, 0.28), new THREE.Vector3(2.18, 1.45, 0.5)],
  grid: [new THREE.Vector3(-3.65, 3.98, -1.6), new THREE.Vector3(-2.9, 3.05, -1.15), new THREE.Vector3(-2.03, 2.0, -0.6)],
};

/** Where each label is pinned. */
const ANCHOR: Record<NodeId, THREE.Vector3> = {
  solar: new THREE.Vector3(-0.2, 3.65, 0.2),
  home: new THREE.Vector3(-1.15, 0.05, 1.7),
  battery: new THREE.Vector3(2.7, 1.25, -0.55),
  grid: new THREE.Vector3(-4.45, 3.95, -1.6),
};

/** The ground ring that lights up under whatever is in focus. */
const FOCUS_RING: Record<NodeId, { x: number; z: number; r: number }> = {
  solar: { x: 0, z: 0, r: 3.1 },
  home: { x: 0, z: 0, r: 3.1 },
  battery: { x: 2.4, z: -0.55, r: 0.95 },
  grid: { x: -4.3, z: -1.6, r: 0.75 },
};

const PER_STREAM = 40;

const PALETTE = {
  dark: {
    platform: "#171b22",
    rim: "#3a3324",
    wall: "#2a3039",
    roof: "#1a1e25",
    trim: "#3a414c",
    panel: "#13213d",
    frame: "#9aa3b2",
    glass: "#0f141b",
    batteryBody: "#e7e3dc",
    pole: "#3b342c",
    wire: "#0b0d10",
    leaf: "#1f4d3a",
    trunk: "#3a2c20",
    sky: "#8ea4cc",
    ground: "#0e0f12",
  },
  light: {
    platform: "#ebe5d8",
    rim: "#d9c7a0",
    wall: "#fbf8f1",
    roof: "#4a4f58",
    trim: "#d8d1c3",
    panel: "#1c2c4f",
    frame: "#c9ced6",
    glass: "#2b3440",
    batteryBody: "#f4f1ea",
    pole: "#7a6650",
    wire: "#2a2a2a",
    leaf: "#4f8f63",
    trunk: "#7a5a3c",
    sky: "#ffffff",
    ground: "#cfc6b4",
  },
};

const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = aAlpha;
    vColor = aColor;
  }
`;

const pointFragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 2.2) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(core, 8.0) * 0.7), a);
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = (smoothstep(1.0, 0.0, d) * 0.55 + smoothstep(0.32, 0.18, d)) * uIntensity;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), smoothstep(0.3, 0.0, d)), a);
  }
`;
const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** 0..1 visual weight for a flow on a log scale, so 50 W still shows and 5 kW doesn't blind. */
function strength(watts: number) {
  if (watts <= 0) return 0;
  return Math.min(1, 0.4 + Math.log10(Math.max(watts, 10) / 10) * 0.22);
}

export function createFlowScene(host: HTMLElement, opts: SceneOptions): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;opacity:0;transition:opacity 900ms ease";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(-0.4, 1.0, 0.2);

  const lin = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  // --- Materials --------------------------------------------------------------
  const m = {
    platform: track(new THREE.MeshStandardMaterial({ roughness: 0.95 })),
    rim: track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6 })),
    wall: track(new THREE.MeshStandardMaterial({ roughness: 0.85 })),
    roof: track(new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 })),
    trim: track(new THREE.MeshStandardMaterial({ roughness: 0.7 })),
    panel: track(new THREE.MeshStandardMaterial({ roughness: 0.16, metalness: 0.75, emissive: new THREE.Color(0, 0, 0) })),
    frame: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.85 })),
    window: track(new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.1, emissive: lin("#ffc879") })),
    batteryBody: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 })),
    batteryLevel: track(new THREE.MeshBasicMaterial({ toneMapped: false })),
    inverterLight: track(new THREE.MeshBasicMaterial({ toneMapped: false })),
    pole: track(new THREE.MeshStandardMaterial({ roughness: 0.9 })),
    insulator: track(new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2, color: lin("#9fb3c8") })),
    poleLight: track(new THREE.MeshBasicMaterial({ toneMapped: false })),
    wire: track(new THREE.MeshStandardMaterial({ roughness: 0.6 })),
    leaf: track(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true })),
    trunk: track(new THREE.MeshStandardMaterial({ roughness: 1 })),
  };

  // --- Helpers ----------------------------------------------------------------
  const pickables: THREE.Object3D[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], node?: NodeId, parent: THREE.Object3D = scene) => {
    const mesh = new THREE.Mesh(track(geo), mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (node) {
      mesh.userData.node = node;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  };

  // --- Platform ---------------------------------------------------------------
  const platform = add(new THREE.CylinderGeometry(6.3, 6.5, 0.5, 96), m.platform, [0, -0.25, 0]);
  platform.castShadow = false;
  const rim = new THREE.Mesh(track(new THREE.TorusGeometry(6.31, 0.018, 8, 200)), m.rim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.002;
  scene.add(rim);

  // --- House ------------------------------------------------------------------
  add(new THREE.BoxGeometry(4, 2.2, 3), m.wall, [0, 1.1, 0], "home");
  add(new THREE.BoxGeometry(4.15, 0.12, 3.15), m.trim, [0, 0.06, 0], "home");

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.75, 0);
  roofShape.lineTo(1.75, 0);
  roofShape.lineTo(0, 1.3);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 4.4, bevelEnabled: false });
  roofGeo.translate(0, 0, -2.2);
  const roof = add(roofGeo, m.roof, [0, 2.2, 0], "solar");
  roof.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(0.38, 0.8, 0.38), m.trim, [-1.15, 3.2, -0.55], "home");

  // Windows and door glow with how much power the home is using.
  add(new THREE.BoxGeometry(0.72, 0.62, 0.05), m.window, [-1.25, 1.3, 1.51], "home");
  add(new THREE.BoxGeometry(0.72, 0.62, 0.05), m.window, [-0.25, 1.3, 1.51], "home");
  add(new THREE.BoxGeometry(0.62, 1.15, 0.05), m.window, [0.85, 0.6, 1.51], "home");
  add(new THREE.BoxGeometry(0.05, 0.62, 0.72), m.window, [2.01, 1.3, -0.95], "home");

  // Solar array on the front slope, tilted to the roof pitch.
  const array = new THREE.Group();
  const normal = new THREE.Vector3(0, Math.cos(ROOF_PITCH), Math.sin(ROOF_PITCH));
  array.position.set(0, 2.2 + 0.65, 0.875).addScaledVector(normal, 0.05);
  array.rotation.x = ROOF_PITCH;
  scene.add(array);
  const panelGeo = track(new THREE.BoxGeometry(0.86, 0.035, 0.6));
  const frameGeo = track(new THREE.BoxGeometry(0.9, 0.025, 0.64));
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -1.38 + col * 0.92;
      const z = -0.33 + row * 0.66;
      const frame = new THREE.Mesh(frameGeo, m.frame);
      frame.position.set(x, -0.012, z);
      frame.castShadow = true;
      frame.userData.node = "solar";
      const panel = new THREE.Mesh(panelGeo, m.panel);
      panel.position.set(x, 0.008, z);
      panel.castShadow = true;
      panel.userData.node = "solar";
      array.add(frame, panel);
      pickables.push(panel, frame);
    }
  }

  // --- Inverter + battery on the right wall -----------------------------------
  add(new THREE.BoxGeometry(0.16, 0.62, 0.5), m.batteryBody, [INVERTER.x, INVERTER.y, INVERTER.z], "battery");
  add(new THREE.BoxGeometry(0.02, 0.32, 0.05), m.inverterLight, [INVERTER.x + 0.09, INVERTER.y + 0.05, INVERTER.z + 0.12]);

  const BATTERY_H = 1.7;
  add(new THREE.BoxGeometry(0.62, BATTERY_H, 1.0), m.batteryBody, [2.36, BATTERY_H / 2, -0.55], "battery");
  // The level bar on the battery's face grows with the charge.
  const levelGeo = track(new THREE.BoxGeometry(0.035, 1, 0.12));
  levelGeo.translate(0, 0.5, 0);
  const level = new THREE.Mesh(levelGeo, m.batteryLevel);
  level.position.set(2.68, 0.2, -0.55);
  level.userData.node = "battery";
  pickables.push(level);
  scene.add(level);
  const levelTrack = add(new THREE.BoxGeometry(0.02, 1.3, 0.14), m.trim, [2.675, 0.85, -0.55]);
  levelTrack.castShadow = false;

  // --- Utility pole -----------------------------------------------------------
  const POLE = { x: -4.3, z: -1.6 };
  add(new THREE.CylinderGeometry(0.07, 0.1, 4.4, 14), m.pole, [POLE.x, 2.2, POLE.z], "grid");
  add(new THREE.BoxGeometry(1.4, 0.09, 0.09), m.pole, [POLE.x, 3.95, POLE.z], "grid");
  for (const dx of [-0.55, 0, 0.55]) add(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 10), m.insulator, [POLE.x + dx, 4.06, POLE.z], "grid");
  const poleLight = add(new THREE.SphereGeometry(0.1, 16, 16), m.poleLight, [POLE.x, 4.5, POLE.z], "grid");
  poleLight.castShadow = false;
  // A second, purely decorative wire for realism.
  const wire2 = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.85, 3.98, -1.6), new THREE.Vector3(-3.9, 3.1, -1.3), new THREE.Vector3(-2.03, 2.0, -1.0)]);
  add(new THREE.TubeGeometry(wire2, 40, 0.014, 6), m.wire, [0, 0, 0]);

  // --- Trees ------------------------------------------------------------------
  for (const [x, z, s] of [
    [-3.4, 2.6, 1],
    [4.4, -2.4, 0.85],
    [-2.6, -3.7, 1.15],
    [4.1, 2.9, 0.7],
  ] as const) {
    add(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 0.7 * s, 8), m.trunk, [x, 0.35 * s, z]);
    add(new THREE.IcosahedronGeometry(0.62 * s, 0), m.leaf, [x, 0.95 * s, z]);
  }

  // --- Streams: a conduit per wire plus glowing particles riding along it ------
  const curves = Object.fromEntries(NODE_IDS.map((id) => [id, new THREE.CatmullRomCurve3(WIRES[id])])) as Record<NodeId, THREE.CatmullRomCurve3>;
  const conduitMats = {} as Record<NodeId, THREE.MeshBasicMaterial>;
  for (const id of NODE_IDS) {
    conduitMats[id] = track(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curves[id], 64, id === "grid" ? 0.022 : 0.03, 8)), conduitMats[id]);
    tube.userData.node = id;
    pickables.push(tube);
    scene.add(tube);
  }

  const count = PER_STREAM * NODE_IDS.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seeds[i] = Math.random();
    sizes[i] = 2.5 + Math.random() * 3;
  }
  const pointGeo = track(new THREE.BufferGeometry());
  pointGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  pointGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  pointGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const pointMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 100 } },
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      transparent: true,
      depthWrite: false,
    }),
  );
  const points = new THREE.Points(pointGeo, pointMat);
  points.frustumCulled = false;
  scene.add(points);

  // --- Focus ring on the ground ----------------------------------------------
  const ringMat = track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const ring = new THREE.Mesh(track(new THREE.TorusGeometry(1, 0.03, 8, 160)), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // --- Sky: sun / moon glow, lights ------------------------------------------
  const glowMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uIntensity: { value: 1 } },
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
    }),
  );
  const sunDisc = new THREE.Mesh(track(new THREE.PlaneGeometry(3.2, 3.2)), glowMat);
  scene.add(sunDisc);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.9);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -8;
  sunLight.shadow.camera.right = 8;
  sunLight.shadow.camera.top = 8;
  sunLight.shadow.camera.bottom = -8;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 40;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight, sunLight.target);
  // A warm light inside the house so the windows spill onto the platform at night.
  const homeLight = new THREE.PointLight(lin("#ffc879"), 0, 7, 2);
  homeLight.position.set(-0.4, 1.0, 2.1);
  scene.add(homeLight);

  // --- Theme ------------------------------------------------------------------
  let dark = true;
  const tokens = {} as Record<Tone | "gilt", THREE.Color>;
  const applyTheme = () => {
    dark = document.documentElement.classList.contains("dark");
    const p = dark ? PALETTE.dark : PALETTE.light;
    const style = getComputedStyle(host);
    for (const t of Object.keys(TOKEN) as Tone[]) tokens[t] = new THREE.Color(style.getPropertyValue(TOKEN[t]).trim() || "#ffffff");
    tokens.gilt = new THREE.Color(style.getPropertyValue("--gilt-2").trim() || "#edc27a");

    m.platform.color = lin(p.platform);
    m.rim.color = new THREE.Color(p.rim);
    m.wall.color = lin(p.wall);
    m.roof.color = lin(p.roof);
    m.trim.color = lin(p.trim);
    m.panel.color = lin(p.panel);
    m.frame.color = lin(p.frame);
    m.window.color = lin(p.glass);
    m.batteryBody.color = lin(p.batteryBody);
    m.pole.color = lin(p.pole);
    m.wire.color = lin(p.wire);
    m.leaf.color = lin(p.leaf);
    m.trunk.color = lin(p.trunk);
    hemi.color = lin(p.sky);
    hemi.groundColor = lin(p.ground);
    pointMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    glowMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    pointMat.needsUpdate = glowMat.needsUpdate = true;
    scene.environmentIntensity = dark ? 0.45 : 0.7;
  };
  applyTheme();
  const themeObserver = new MutationObserver(() => requestAnimationFrame(applyTheme));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // --- State ------------------------------------------------------------------
  let state: SceneState | null = null;
  const live = {
    streams: Object.fromEntries(NODE_IDS.map((id) => [id, 0])) as Record<NodeId, number>,
    level: 0,
    windows: 0,
    panels: 0,
    ring: 0,
  };

  // --- Camera control -----------------------------------------------------------
  const BASE_AZ = 0.62;
  const BASE_POLAR = 0.98;
  const orbit = { az: BASE_AZ, polar: BASE_POLAR, dragAz: 0, dragPolar: 0, radius: 17 };
  let width = 1;
  let height = 1;

  const resize = () => {
    const r = host.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull back on narrow screens so the whole diorama fits.
    orbit.radius = 19 * Math.max(1, 1.55 / camera.aspect);
    camera.updateProjectionMatrix();
    pointMat.uniforms.uScale.value = height * dpr * 0.1;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  // --- Pointer: drag to turn, hover / tap to focus ----------------------------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered: NodeId | null = null;

  const pick = (e: PointerEvent): NodeId | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return (hit?.object.userData.node as NodeId | undefined) ?? null;
  };

  const onDown = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      orbit.dragAz = THREE.MathUtils.clamp(orbit.dragAz - dx * 0.007, -1.1, 1.1);
      orbit.dragPolar = THREE.MathUtils.clamp(orbit.dragPolar - dy * 0.004, -0.3, 0.22);
      return;
    }
    const id = pick(e);
    if (id !== hovered) {
      hovered = id;
      opts.onHover(id);
    }
    canvas.style.cursor = id ? "pointer" : "grab";
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = "grab";
    if (moved < 6) {
      const id = pick(e);
      if (id) opts.onSelect(id);
    }
  };
  const onLeave = () => {
    dragging = false;
    if (hovered) {
      hovered = null;
      opts.onHover(null);
    }
  };
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  // --- Frame ------------------------------------------------------------------
  const tmp = new THREE.Vector3();
  const anchors = Object.fromEntries(NODE_IDS.map((id) => [id, { x: 0, y: 0 }])) as Anchors;
  const ringColor = new THREE.Color();
  let time = Math.random() * 10;

  const frame = (dt: number) => {
    time += dt;
    const s = state;
    if (!s) return;
    const ease = 1 - Math.exp(-dt * 4);

    // Camera: a slow idle sway plus whatever the person has dragged.
    const sway = opts.reduce ? 0 : Math.sin(time * 0.12) * 0.1;
    orbit.az += (BASE_AZ + orbit.dragAz + sway - orbit.az) * ease;
    orbit.polar += (BASE_POLAR + orbit.dragPolar - orbit.polar) * ease;
    camera.position.set(
      target.x + orbit.radius * Math.sin(orbit.polar) * Math.sin(orbit.az),
      target.y + orbit.radius * Math.cos(orbit.polar),
      target.z + orbit.radius * Math.sin(orbit.polar) * Math.cos(orbit.az),
    );
    camera.lookAt(target);

    // Sky: the sun travels east → west across the back of the scene with the real day.
    const isDay = s.day > 0 && s.day < 1;
    const arc = Math.PI * (1 - THREE.MathUtils.clamp(s.day, 0, 1));
    const sunPos = isDay ? tmp.set(Math.cos(arc) * 8.5, 1.8 + Math.sin(arc) * 4.2, -8) : tmp.set(-6, 5.5, -8);
    sunLight.position.copy(sunPos);
    sunDisc.position.copy(sunPos);
    sunDisc.quaternion.copy(camera.quaternion);
    const elevation = isDay ? Math.sin(Math.PI * s.day) : 0;
    sunLight.intensity = isDay ? 0.9 + elevation * 2.1 : 0.45;
    sunLight.color = isDay ? lin("#fff1dc").lerp(lin("#ffb46b"), 1 - elevation) : lin("#9fb4ff");
    glowMat.uniforms.uColor.value.copy(isDay ? tokens.sun : new THREE.Color("#dfe6ff"));
    glowMat.uniforms.uIntensity.value = isDay ? 0.9 : 0.45;
    sunDisc.scale.setScalar(isDay ? 1 : 0.55);
    hemi.intensity = isDay ? (dark ? 1.0 : 1.2) : dark ? 0.45 : 0.8;

    // Panels shimmer with output; windows glow with use, more so after dark.
    const solarS = strength(s.solarW);
    live.panels += (solarS - live.panels) * ease;
    m.panel.emissive.copy(tokens.sun).convertSRGBToLinear().multiplyScalar(live.panels * (0.035 + Math.sin(time * 1.6) * 0.01));
    const homeS = strength(s.homeW);
    live.windows += (homeS * (isDay ? 0.9 : 1.6) - live.windows) * ease;
    m.window.emissiveIntensity = 0.08 + live.windows * 1.3;
    homeLight.intensity = isDay ? 0 : live.windows * 4;

    // Battery level bar.
    const pct = s.batteryPct === null ? 0 : s.batteryPct / 100;
    live.level += (pct - live.level) * ease;
    level.scale.y = Math.max(0.02, live.level * 1.3);
    const batteryTone = s.batteryPct !== null && s.batteryPct <= 20 ? tokens.bad : tokens.battery;
    m.batteryLevel.color.copy(batteryTone);
    m.inverterLight.color.copy(s.outage ? tokens.sun : tokens.home);

    // Pole light: steady blue normally, a slow red blink in a power cut.
    m.poleLight.color.copy(s.outage ? tokens.bad : tokens.grid);
    poleLight.scale.setScalar(s.outage ? 0.75 + (Math.sin(time * 3.2) > 0.3 ? 0.4 : 0) : 0.85);

    // Streams.
    let i = 0;
    for (const id of NODE_IDS) {
      const stream = s.streams.find((x) => x.id === id);
      const watts = stream?.watts ?? 0;
      const dim = s.focus !== null && s.focus !== id ? 0.15 : 1;
      const target = strength(watts) * dim;
      live.streams[id] += (target - live.streams[id]) * ease;
      const amt = live.streams[id];
      const color = tokens[stream?.tone ?? "grid"];

      const cm = conduitMats[id];
      if (id === "grid" && s.outage) {
        cm.color.copy(tokens.bad);
        cm.opacity = 0.35 * (s.focus && s.focus !== id ? 0.3 : 1);
      } else {
        cm.color.copy(amt > 0.02 ? color : dark ? new THREE.Color("#3a414c") : new THREE.Color("#b9b2a4"));
        cm.opacity = 0.18 + amt * 0.5;
      }

      const curve = curves[id];
      const speed = watts > 0 ? 0.16 + strength(watts) * 0.28 : 0;
      for (let k = 0; k < PER_STREAM; k++, i++) {
        let t = (seeds[i] + time * speed * (0.85 + seeds[i] * 0.3)) % 1;
        if (stream && !stream.inbound) t = 1 - t;
        curve.getPointAt(t, tmp);
        // A loose ribbon: particles drift around the wire mid-span.
        const wob = Math.sin(t * Math.PI) * 0.05;
        positions[i * 3] = tmp.x + Math.sin(time * 2 + seeds[i] * 40) * wob;
        positions[i * 3 + 1] = tmp.y + Math.cos(time * 2.3 + seeds[i] * 30) * wob;
        positions[i * 3 + 2] = tmp.z + Math.sin(time * 1.7 + seeds[i] * 20) * wob;
        const tf = stream && !stream.inbound ? 1 - t : t;
        alphas[i] = amt * Math.min(1, tf / 0.08) * Math.min(1, (1 - tf) / 0.08);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    }
    pointGeo.attributes.position.needsUpdate = true;
    pointGeo.attributes.aAlpha.needsUpdate = true;
    pointGeo.attributes.aColor.needsUpdate = true;

    // Focus ring glides to whatever is in focus.
    const focus = s.focus;
    live.ring += ((focus ? 1 : 0) - live.ring) * ease;
    if (focus) {
      const f = FOCUS_RING[focus];
      ring.position.x += (f.x - ring.position.x) * ease;
      ring.position.z += (f.z - ring.position.z) * ease;
      const sc = ring.scale.x + (f.r - ring.scale.x) * ease;
      ring.scale.set(sc, sc, sc);
      ringColor.copy(tokens[focus === "solar" ? "sun" : focus === "grid" && s.outage ? "bad" : focus === "grid" ? "grid" : focus]);
      ringMat.color.copy(ringColor);
    }
    ringMat.opacity = live.ring * (0.55 + Math.sin(time * 3) * 0.15);

    renderer.render(scene, camera);

    // Pin labels: project each anchor to the canvas.
    for (const id of NODE_IDS) {
      tmp.copy(ANCHOR[id]).project(camera);
      anchors[id].x = (tmp.x * 0.5 + 0.5) * width;
      anchors[id].y = (-tmp.y * 0.5 + 0.5) * height;
    }
    opts.onAnchors(anchors);
  };

  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  io.observe(host);

  let raf = 0;
  let last = performance.now();
  let shown = false;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    // With reduced motion, settle once and then only redraw while easing toward new values or being dragged.
    if (opts.reduce && !dragging && time > 3 && Math.abs(orbit.az - (BASE_AZ + orbit.dragAz)) < 0.001) return;
    frame(opts.reduce ? Math.max(dt, 0.25) : dt);
    if (!shown && state) {
      shown = true;
      canvas.style.opacity = "1";
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    update(next) {
      state = next;
      if (opts.reduce) time = 0; // let the reduced-motion loop settle on the new values
    },
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      for (const d of disposables) d.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
