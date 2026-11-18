// Loaders for the 3D files: glTF with meshopt geometry and KTX2 (Basis) textures.
//
// The Basis transcoder is two files that KTX2Loader fetches by fixed names. Importing
// them with ?url lets Vite give them hashed names like everything else under assets/,
// and the loading manager maps the fixed names to those.
import { LoadingManager, type WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import basisJs from 'three/addons/libs/basis/basis_transcoder.js?url';
import basisWasm from 'three/addons/libs/basis/basis_transcoder.wasm?url';

export interface Loaders {
  gltf: GLTFLoader;
  ktx2: KTX2Loader;
}

export function makeLoaders(renderer: WebGLRenderer): Loaders {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (url.endsWith('/basis_transcoder.js')) return basisJs;
    if (url.endsWith('/basis_transcoder.wasm')) return basisWasm;
    return url;
  });
  const ktx2 = new KTX2Loader(manager).setTranscoderPath('/basis/').detectSupport(renderer);
  const gltf = new GLTFLoader(manager).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  return { gltf, ktx2 };
}
