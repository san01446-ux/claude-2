import * as THREE from 'three';
import { EXRLoader } from '../lib/jsm/loaders/EXRLoader.js';

// Free-licensed assets bundled in /assets (see CREDITS.md).
const TEX = {
  grass: ['assets/textures/grass.jpg', true],
  dirt: ['assets/textures/dirt.jpg', true],
  stone: ['assets/textures/stone_floor.jpg', true],
  stoneN: ['assets/textures/stone_floor_normal.png', false],
  rock: ['assets/textures/rock.jpg', true],
  rockN: ['assets/textures/rock_normal.jpg', false],
  wood: ['assets/textures/wood.jpg', true],
};
const HDRI = 'assets/hdri/park.exr';

export const assets = { tex: {}, env: null };

export async function loadAssets(onProgress = () => {}) {
  const total = Object.keys(TEX).length + 1;
  let done = 0;
  const tick = () => onProgress(++done / total);
  const texLoader = new THREE.TextureLoader();

  const texJobs = Object.entries(TEX).map(([key, [url, srgb]]) =>
    texLoader.loadAsync(url).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      assets.tex[key] = t;
    }).catch((e) => console.warn('texture failed', url, e)).finally(tick)
  );
  const envJob = new EXRLoader().loadAsync(HDRI).then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    assets.env = t;
  }).catch((e) => console.warn('hdri failed', e)).finally(tick);

  await Promise.all([...texJobs, envJob]);
  return assets;
}

// Returns a clone of a loaded texture with its own repeat, or null if it failed to load.
export function tex(key, repeat = 1) {
  const base = assets.tex[key];
  if (!base) return null;
  const t = base.clone();
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}
