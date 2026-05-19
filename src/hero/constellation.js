import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Vector2,
  Clock,
} from 'three';
import { createTicketMesh, disposeShared } from './ticket.js';
import { generateTicketPositions } from './positions.js';
import { createFeaturedLabels } from './featured-labels.js';

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

  const pointer = new Vector2(0, 0);
  const targetPointer = new Vector2(0, 0);

  function setSize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
      if (reduced) {
        m.position.y = p.y;
        m.rotation.y = p.yaw;
      } else {
        m.position.y = p.y + Math.sin(t * 0.5 + p.phase) * p.amp;
        m.rotation.y = p.yaw + t * 0.05;
      }
    }
    camera.position.x = pointer.x * 0.6;
    camera.position.y = pointer.y * 0.4;
    camera.lookAt(0, 0, 0);

    if (featured) featured.sync();
    renderer.render(scene, camera);
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
      window.removeEventListener('pointermove', onMouse);
      for (const m of meshes) m.material.dispose();
      disposeShared();
      renderer.dispose();
    },
  };
}
