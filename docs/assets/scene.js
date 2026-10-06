/**
 * repackage — hero scene
 *
 * The product is: ONE source video becomes THREE correctly-proportioned cuts.
 * So the hero is exactly that, in space. A single 16:9 plane fractures into
 * three planes at their true aspect ratios, each carrying the safe-area guide
 * that platform actually enforces.
 *
 * Interaction:
 *   pointer  → camera parallax + group tilt (the scene leans toward you)
 *   scroll  → drives the split, so the story is told by moving, not by reading
 *   hover   → identifies a plane; labels respond
 *   click   → that plane comes forward
 *
 * Constraints held to:
 *   - no build step, no framework, no npm
 *   - degrades to the CSS stage if WebGL is unavailable
 *   - degrades to a static composition under prefers-reduced-motion
 *   - pauses when hidden or offscreen
 *   - device pixel ratio capped; geometry is trivial by design
 */

import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* config                                                              */
/* ------------------------------------------------------------------ */

const ACCENT = 0xd9a441;
const INK = 0x8d939d;
// Edge colour must read against #08090b. The first pass used 0x2a2f37, which
// is nearly the background — the scene rendered correctly and was invisible.
// Contrast is a functional requirement, not a taste call.
const DIM = 0x525c68;
const PANEL = 0x161b23;

const PLATFORMS = [
  { key: "tiktok", name: "TikTok", ar: 9 / 16, size: [0.86, 1.53], slot: [-3.15, 0, -0.55], meta: "9:16 · 15–35s · captions" },
  { key: "youtube", name: "YouTube", ar: 16 / 9, size: [2.72, 1.53], slot: [0, 0, 0.45], meta: "16:9 · longer · room" },
  { key: "instagram", name: "Instagram", ar: 4 / 5, size: [1.22, 1.53], slot: [3.15, 0, -0.55], meta: "4:5 · 30–90s · margins" },
];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById("scene");
if (!canvas) throw new Error("no canvas");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
} catch (err) {
  fallback("webgl-unavailable");
  throw err;
}

if (!renderer.getContext()) fallback("no-context");

// Cap DPR. The scene is a handful of planes; more pixels buys nothing and
// costs battery on exactly the phones that need this page to be cheap.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.25, 11);

/* ------------------------------------------------------------------ */
/* geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/** A frame: translucent panel, crisp edge, and an inner safe-area rectangle. */
function makeFrame(w, h, { accent = false, safeInset = null } = {}) {
  const group = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      color: PANEL,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  group.add(panel);

  // Outer edge
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    new THREE.LineBasicMaterial({ color: accent ? ACCENT : DIM, transparent: true, opacity: 0.9 })
  );
  group.add(edge);

  // Corner ticks — a second, brighter cue so the frame reads even at low
  // contrast or on a dim display.
  const tick = 0.09;
  const pts = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const cx = (sx * w) / 2;
      const cy = (sy * h) / 2;
      pts.push(cx, cy, 0.001, cx - sx * tick, cy, 0.001);
      pts.push(cx, cy, 0.001, cx, cy - sy * tick, 0.001);
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const ticks = new THREE.LineSegments(
    tg,
    new THREE.LineBasicMaterial({ color: accent ? ACCENT : INK, transparent: true, opacity: 0.75 })
  );
  group.add(ticks);

  // Safe-area guide — the platform's own rule, drawn where it actually applies.
  if (safeInset) {
    const sw = w - safeInset.x * 2;
    const sh = h - safeInset.y * 2;
    if (sw > 0.05 && sh > 0.05) {
      const guide = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(sw, sh)),
        new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 })
      );
      group.add(guide);
    }
  }

  return { group, panel, edge };
}

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

// The single source frame
const sourceFrame = makeFrame(3.6, 2.025, { accent: false });
sourceFrame.group.position.z = 0;
scene.add(sourceFrame.group);

// The three outputs
const targets = PLATFORMS.map((p) => {
  const [w, h] = p.size;
  // TikTok and Instagram crop hard from the top and bottom — show that.
  const inset = p.key === "tiktok" ? { x: 0.07, y: 0.12 } : p.key === "instagram" ? { x: 0.09, y: 0.06 } : null;
  const frame = makeFrame(w, h, { accent: false, safeInset: inset });

  frame.group.position.set(0, 0, 0);
  frame.group.scale.setScalar(0.001);

  // DOM label, projected each frame. Crisper than canvas text and selectable
  // by screen readers, which canvas text is not.
  const label = document.createElement("div");
  label.className = "scene-label";
  label.dataset.key = p.key;
  label.innerHTML = `<b>${p.name}</b><span>${p.meta}</span>`;
  document.getElementById("labels").appendChild(label);

  scene.add(frame.group);
  return { ...p, ...frame, label, hover: 0, focus: 0, current: new THREE.Vector3(0, 0, 0) };
});

// Ambient dust for depth. Cheap, and stops the void reading as flat black.
const DUST = 260;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 22;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 11;
  dustPos[i * 3 + 2] = -4 - Math.random() * 8;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ color: INK, size: 0.035, transparent: true, opacity: 0.5, sizeAttenuation: true })
);
scene.add(dust);

/* ------------------------------------------------------------------ */
/* interaction state                                                   */
/* ------------------------------------------------------------------ */

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let scrollProgress = 0;
let currentProgress = 0;
let hoverKey = null;
let focusKey = null;
let visible = true;

// pointer → parallax target
window.addEventListener(
  "pointermove",
  (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  },
  { passive: true }
);

window.addEventListener("pointerleave", () => {
  pointer.tx = 0;
  pointer.ty = 0;
});

// click a plane to bring it forward
canvas.addEventListener("click", () => {
  focusKey = focusKey === hoverKey ? null : hoverKey;
});

// scroll drives the split
const readScroll = () => {
  const hero = document.getElementById("top");
  if (!hero) return;
  const h = hero.offsetHeight || window.innerHeight;
  const y = window.scrollY;
  scrollProgress = Math.min(1, Math.max(0, (y - h * 0.15) / (h * 0.75)));
};
window.addEventListener("scroll", readScroll, { passive: true });
readScroll();

// stop burning frames when nobody's looking
document.addEventListener("visibilitychange", () => {
  visible = !document.hidden;
});

if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    ([e]) => { visible = e.isIntersecting && !document.hidden; },
    { threshold: 0 }
  ).observe(canvas);
}

/* ------------------------------------------------------------------ */
/* raycast hover                                                       */
/* ------------------------------------------------------------------ */

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function updateHover() {
  if (reduceMotion) return;
  ndc.x = pointer.tx;
  ndc.y = -pointer.ty;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(targets.map((t) => t.group), true);
  const key = hits.length ? hits[0].object.parent.userData.key ?? null : null;
  hoverKey = key;
  canvas.style.cursor = key ? "pointer" : "default";
}

targets.forEach((t) => (t.group.userData.key = t.key));

/* ------------------------------------------------------------------ */
/* resize                                                              */
/* ------------------------------------------------------------------ */

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(1, r.width);
  const h = Math.max(1, r.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;

  // Pull the camera back on narrow screens so the three frames still fit.
  const needed = 8.6;
  const vFov = (camera.fov * Math.PI) / 180;
  const fitH = needed / 2 / Math.tan(vFov / 2);
  const fitW = needed / 2 / Math.tan(vFov / 2) / camera.aspect;
  camera.position.z = Math.max(7.5, fitH, fitW * 0.92);

  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

/* ------------------------------------------------------------------ */
/* loop                                                                */
/* ------------------------------------------------------------------ */

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clock = new THREE.Clock();

function layout() {
  const p = currentProgress;
  const split = easeOut(p);

  // The source doesn't vanish — it recedes. Provenance stays visible.
  sourceFrame.group.position.z = -split * 4.2;
  sourceFrame.group.scale.setScalar(1 - split * 0.42);
  sourceFrame.panel.material.opacity = 0.85 - split * 0.5;
  sourceFrame.edge.material.opacity = 0.9 - split * 0.55;

  targets.forEach((t, i) => {
    // stagger slightly so the fracture reads as a sequence, not a snap
    const local = Math.min(1, Math.max(0, (p - i * 0.055) / (1 - 0.055 * 2)));
    const e = easeOut(local);

    t.group.position.set(t.slot[0] * e, t.slot[1] * e, t.slot[2] * e);
    t.group.scale.setScalar(Math.max(0.001, e));

    const isHover = hoverKey === t.key;
    const isFocus = focusKey === t.key;
    const dim = (hoverKey || focusKey) && !isHover && !isFocus;

    t.hover += ((isHover ? 1 : 0) - t.hover) * 0.15;
    t.focus += ((isFocus ? 1 : 0) - t.focus) * 0.15;

    t.group.position.z += t.focus * 0.7;
    t.group.rotation.y = (isHover ? 1 : isFocus ? 1 : 0) * -0.14 * (t.focus + t.hover * 0.5);

    t.panel.material.opacity = (0.55 + e * 0.3) * (dim ? 0.45 : 1);
    t.edge.material.opacity = (0.55 + e * 0.45) * (dim ? 0.4 : 1);
    t.edge.material.color.setHex(isHover || isFocus ? ACCENT : DIM);

    t.label.classList.toggle("is-active", isHover || isFocus);
    t.label.classList.toggle("is-dim", dim);

    t.current.copy(t.group.position);
  });
}

function projectLabels() {
  targets.forEach((t) => {
    const v = t.current.clone().project(camera);
    const x = (v.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-v.y * 0.5 + 0.5) * canvas.clientHeight;
    t.label.style.transform = `translate(-50%, 0) translate(${x.toFixed(1)}px, ${(y + t.size[1] / 2 + 18).toFixed(1)}px)`;
    t.label.style.opacity = String(currentProgress * (t.hover > 0.02 || t.focus > 0.02 ? 1 : 0.9));
  });
}

function tick() {
  requestAnimationFrame(tick);
  if (!visible) return;

  const dt = Math.min(0.05, clock.getDelta());

  // ease scroll + pointer so nothing snaps
  currentProgress += (scrollProgress - currentProgress) * Math.min(1, dt * 4.5);
  pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.4);
  pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.4);

  if (!reduceMotion) {
    updateHover();
    layout();
    projectLabels();

    // camera leans toward the pointer; the whole field tilts with it
    camera.position.x += (pointer.x * 0.85 - camera.position.x) * Math.min(1, dt * 2.2);
    camera.position.y += (0.25 - pointer.y * 0.5 - camera.position.y) * Math.min(1, dt * 2.2);
    camera.lookAt(0, 0, 0);

    dust.rotation.y += dt * 0.012;
    dust.rotation.x = pointer.y * 0.02;
  } else if (currentProgress < 0.99) {
    // reduced motion: jump straight to the composed end state, no motion
    currentProgress = 1;
    scrollProgress = 1;
    layout();
    projectLabels();
  }

  renderer.render(scene, camera);
}

function fallback(reason) {
  document.documentElement.classList.remove("scene-live");
  document.documentElement.classList.add("no-webgl");
  const s = document.getElementById("scene-status");
  if (s) s.textContent = reason;
}

// Prove the scene actually rasterised before showing it. A canvas that is
// present but blank is worse than the static fallback — it looks broken.
// Reading the framebuffer back is the only honest signal available: if the
// pixels are still background, we did not draw.
function pixelsDrew() {
  try {
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    if (!w || !h) return false;

    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

    // Count pixels that are meaningfully lighter than the page background.
    let lit = 0;
    const step = 4 * 7; // sparse sample; plenty for a coverage check
    for (let i = 0; i < buf.length; i += step) {
      if (buf[i] > 40 || buf[i + 1] > 40 || buf[i + 2] > 40) lit++;
    }
    return lit > 0;
  } catch (err) {
    return false;
  }
}

if (pixelsDrew()) {
  document.documentElement.classList.add("scene-live");
  requestAnimationFrame(tick);
} else {
  // Did not draw. Keep the verified static stage and say so.
  fallback("canvas-empty");
}