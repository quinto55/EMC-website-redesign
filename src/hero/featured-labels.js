import { Vector3 } from 'three';

const LABELS = {
  festivals: 'Festivals',
  fairs: 'Fairs',
  'theme-parks': 'Theme Parks',
  sports: 'Sports',
  'box-office': 'Box Office',
};

const TARGETS = {
  festivals: '/sell-onsite.html',
  fairs: '/sell-onsite.html',
  'theme-parks': '/sell-onsite.html',
  sports: '/sell-onsite.html',
  'box-office': '/sell-onsite.html',
};

export function createFeaturedLabels(container, meshes, camera, renderer) {
  const featured = meshes.filter((m) => m.userData.featured);
  const labels = featured.map((m) => {
    const a = document.createElement('a');
    a.className = 'hero__label';
    a.href = TARGETS[m.userData.service];
    a.textContent = LABELS[m.userData.service];
    a.dataset.service = m.userData.service;
    container.appendChild(a);
    return { mesh: m, el: a, visible: false };
  });

  const v = new Vector3();
  function sync() {
    const rect = renderer.domElement.getBoundingClientRect();
    for (const { mesh, el } of labels) {
      v.copy(mesh.position).project(camera);
      const x = (v.x * 0.5 + 0.5) * rect.width;
      const y = (-v.y * 0.5 + 0.5) * rect.height;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }

  function show(service) {
    for (const l of labels) l.el.classList.toggle('is-visible', l.mesh.userData.service === service);
  }
  function hideAll() {
    for (const l of labels) l.el.classList.remove('is-visible');
  }

  return { labels, sync, show, hideAll };
}
