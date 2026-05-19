import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Vector2,
  Clock,
  Raycaster,
} from 'three';
import { createTicketMesh, disposeShared } from './ticket.js';
import { generateTicketPositions } from './positions.js';
import { createFeaturedLabels } from './featured-labels.js';
import { createBloomComposer } from './post.js';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createConstellation(canvas) {
  const desktopCount = 56;
  const mobileCount = 14;
  const count = isMobile() ? mobileCount : desktopCount;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xfff1d6, 1.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xff9c3d, 0.6);
  rim.position.set(4, -2, -4);
  scene.add(rim);

  const raycaster = new Raycaster();
  let hovered = null;

  const positions = generateTicketPositions(count, 7);
  const meshes = positions.map((p) => {
    const mesh = createTicketMesh({ featured: p.featured });
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.set(p.pitch, p.yaw, 0);
    mesh.userData = p;
    scene.add(mesh);
    return mesh;
  });

  const labelHost = document.querySelector('.hero__labels');
  const featured = labelHost ? createFeaturedLabels(labelHost, meshes, camera, renderer) : null;

  const useBloom = !isMobile();
  let post = null;
  if (useBloom) {
    post = createBloomComposer(renderer, scene, camera, { x: canvas.clientWidth, y: canvas.clientHeight });
  }

  const pointer = new Vector2(0, 0);
  const targetPointer = new Vector2(0, 0);

  function setSize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (post) post.resize(w, h);
  }
  setSize();

  const ro = new ResizeObserver(setSize);
  ro.observe(canvas);

  const onMouse = (ev) => {
    const r = canvas.getBoundingClientRect();
    targetPointer.set(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -(((ev.clientY - r.top) / r.height) * 2 - 1)
    );
  };
  window.addEventListener('pointermove', onMouse, { passive: true });

  function onHover(ev) {
    const r = canvas.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
      if (hovered) { hovered.userData.hovered = false; hovered = null; if (featured) featured.hideAll(); }
      return;
    }
    const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((ev.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const featuredMeshes = meshes.filter((m) => m.userData.featured);
    const hits = raycaster.intersectObjects(featuredMeshes, false);
    const next = hits[0]?.object || null;
    if (next !== hovered) {
      if (hovered) hovered.userData.hovered = false;
      hovered = next;
      if (hovered) hovered.userData.hovered = true;
      if (featured) {
        if (hovered) featured.show(hovered.userData.service);
        else featured.hideAll();
      }
    }
  }
  window.addEventListener('pointermove', onHover, { passive: true });

  function onClick(ev) {
    const r = canvas.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
    const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((ev.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const featuredMeshes = meshes.filter((m) => m.userData.featured);
    const hits = raycaster.intersectObjects(featuredMeshes, false);
    const hit = hits[0]?.object;
    if (!hit) return;
    const start = hit.rotation.y;
    const dur = 200;
    const t0 = performance.now();
    function flip(now) {
      const p = Math.min(1, (now - t0) / dur);
      hit.rotation.y = start + Math.PI * p;
      if (p < 1) requestAnimationFrame(flip);
      else {
        const a = document.querySelector(`a[data-portal="${hit.userData.service}"]`);
        if (a) a.click();
        else window.location.href = '/sell-onsite.html';
      }
    }
    requestAnimationFrame(flip);
  }
  window.addEventListener('click', onClick);

  const portalLinks = document.querySelectorAll('a[data-portal]');
  function onPortalFocus(ev) {
    const a = ev.currentTarget;
    const m = meshes.find((mm) => mm.userData.service === a.dataset.portal);
    if (!m) return;
    if (hovered) hovered.userData.hovered = false;
    hovered = m;
    m.userData.hovered = true;
    if (featured) featured.show(m.userData.service);
  }
  function onPortalBlur() {
    if (hovered) hovered.userData.hovered = false;
    hovered = null;
    if (featured) featured.hideAll();
  }
  portalLinks.forEach((a) => {
    a.addEventListener('focus', onPortalFocus);
    a.addEventListener('blur', onPortalBlur);
  });

  const clock = new Clock();
  let running = true;
  let rafId = null;

  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    pointer.lerp(targetPointer, 0.08);

    const reduced = reducedMotion();
    for (const m of meshes) {
      const p = m.userData;
      const lifted = p.hovered ? 0.6 : 0;
      if (reduced) {
        m.position.y = p.y;
        m.position.z = p.z + lifted;
        m.rotation.y = p.yaw;
      } else {
        m.position.y = p.y + Math.sin(t * 0.5 + p.phase) * p.amp;
        m.position.z = p.z + lifted;
        m.rotation.y = p.yaw + t * 0.05;
      }
      if (p.featured) {
        m.material.emissiveIntensity = p.hovered ? 0.7 : 0.35;
      }
    }
    camera.position.x = pointer.x * 0.6;
    camera.position.y = pointer.y * 0.4;
    camera.lookAt(0, 0, 0);

    if (featured) featured.sync();
    if (post) post.composer.render();
    else renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  tick();

  function pause() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }
  function resume() {
    if (running) return;
    running = true;
    clock.start();
    tick();
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) resume();
        else pause();
      }
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(canvas);

  return {
    meshes,
    scene,
    camera,
    renderer,
    featured,
    pause,
    resume,
    dispose() {
      pause();
      ro.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', onMouse);
      window.removeEventListener('pointermove', onHover);
      window.removeEventListener('click', onClick);
      portalLinks.forEach((a) => {
        a.removeEventListener('focus', onPortalFocus);
        a.removeEventListener('blur', onPortalBlur);
      });
      for (const m of meshes) m.material.dispose();
      disposeShared();
      renderer.dispose();
    },
  };
}
