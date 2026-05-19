import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createBloomComposer(renderer, scene, camera, size) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(size.x, size.y), 0.5, 0.6, 0.15);
  composer.addPass(bloom);
  function resize(w, h) { composer.setSize(w, h); }
  return { composer, resize };
}
