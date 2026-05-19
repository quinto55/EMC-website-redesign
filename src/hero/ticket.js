import {
  ExtrudeGeometry,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Color,
} from 'three';

const ticketShape = (() => {
  const w = 1.6;
  const h = 0.9;
  const r = 0.18;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
})();

const sharedGeometry = new ExtrudeGeometry(ticketShape, {
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.02,
  bevelSize: 0.02,
  bevelSegments: 2,
  curveSegments: 12,
});
sharedGeometry.center();

export function createTicketMaterial({ emissiveStrength = 0.15 } = {}) {
  return new MeshStandardMaterial({
    color: new Color('#f0a648'),
    metalness: 0.3,
    roughness: 0.42,
    emissive: new Color('#ff9c3d'),
    emissiveIntensity: emissiveStrength,
  });
}

export function createTicketMesh({ featured = false } = {}) {
  const material = createTicketMaterial({ emissiveStrength: featured ? 0.35 : 0.15 });
  const mesh = new Mesh(sharedGeometry, material);
  if (featured) mesh.scale.setScalar(1.4);
  return mesh;
}

export function disposeShared() {
  sharedGeometry.dispose();
}
