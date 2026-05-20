import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
} from 'three';
import { createTicketMesh } from '../hero/ticket.js';

export function mountRotatingTicket(canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 4.5);
  scene.add(new AmbientLight(0xffffff, 0.6));
  const key = new DirectionalLight(0xfff1d6, 1.0);
  key.position.set(-3, 4, 4);
  scene.add(key);

  const ticket = createTicketMesh({ featured: true });
  ticket.scale.setScalar(1.6);
  scene.add(ticket);

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

  let raf = null;
  let t0 = performance.now();
  function tick(now) {
    if (!reduced) {
      const t = (now - t0) / 1000;
      ticket.rotation.y = t * 0.4;
      ticket.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick(t0);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
  };
}
