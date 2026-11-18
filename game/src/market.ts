// A slice of the market: copies of the baked stall in rows, facing the street (+Z, where
// the camera is), on lanes of packed earth. Every stall is its own mesh, so the ones off
// screen are culled; with `unique`, every stall also gets its own copy of the texture on
// the GPU, which is what a market of different baked stalls would cost.
import {
  CompressedTexture,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { Loaders } from './loaders';
import { NavGrid, type Point, type Rect } from './nav';
import groundUrl from './assets/ground.ktx2?url';
import stall1kUrl from './assets/stall-1k.glb?url';
import stall2kUrl from './assets/stall-2k.glb?url';

// Stall-local footprints that block walking, in metres (+Z is the stall's front). From
// the stall's scene: the posts and counter, the two sacks, the bucket, the stool, the sign.
const BLOCKS: Rect[] = [
  { minX: -1.25, maxX: 1.25, minZ: -0.8, maxZ: 0.8 },
  { minX: 0.18, maxX: 1.16, minZ: 0.76, maxZ: 1.24 },
  { minX: 1.33, maxX: 1.67, minZ: 0.13, maxZ: 0.47 },
  { minX: -1.78, maxX: -1.42, minZ: 0.62, maxZ: 0.98 },
  { minX: -1.2, maxX: -0.7, minZ: 1.2, maxZ: 1.5 },
];
const SLAB = { minX: -2.4, maxX: 2.4, minZ: -1.55, maxZ: 2.05 };
const PITCH_X = 5.6; // slab 4.8 m plus a narrow passage
const PITCH_Z = 7.4; // slab 3.6 m plus a lane in front
const COLS = 4;
const MARGIN = 7;
export const GROUND_TILE_M = 3;

export interface Market {
  root: Group;
  nav: NavGrid;
  bounds: Rect;
  /** Spots in the lanes in front of the stalls, where residents stop and look. */
  spots: Point[];
  /** A loop through the lanes for the benchmark walk. */
  route: Point[];
  start: Point;
  stallCount: number;
  textures: Texture[];
}

function copyTexture(src: Texture): Texture {
  if (!(src instanceof CompressedTexture)) return src.clone();
  // New pixel arrays make a new texture source, so three uploads it separately.
  const mipmaps = src.mipmaps.map((m) => ({ data: (m.data as Uint8Array).slice(), width: m.width, height: m.height }));
  const t = new CompressedTexture(mipmaps, src.image.width, src.image.height, src.format, src.type);
  t.colorSpace = src.colorSpace;
  t.flipY = src.flipY;
  t.wrapS = src.wrapS;
  t.wrapT = src.wrapT;
  t.minFilter = src.minFilter;
  t.magFilter = src.magFilter;
  t.anisotropy = src.anisotropy;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

export async function buildMarket(
  loaders: Loaders,
  renderer: WebGLRenderer,
  opts: { tex: '2k' | '1k'; stalls: number; unique: boolean },
): Promise<Market> {
  const [gltf, groundTex] = await Promise.all([
    loaders.gltf.loadAsync(opts.tex === '1k' ? stall1kUrl : stall2kUrl),
    loaders.ktx2.loadAsync(groundUrl),
  ]);
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const parts: Mesh[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o: Object3D) => {
    if ((o as Mesh).isMesh) parts.push(o as Mesh);
  });

  const root = new Group();
  root.name = 'Market';
  const textures: Texture[] = [];
  const shared = new Map<Mesh, Material>();
  for (const part of parts) {
    const m = part.material as MeshBasicMaterial;
    if (m.map) {
      m.map.anisotropy = anisotropy;
      textures.push(m.map);
    }
    m.toneMapped = false; // the bake already carries the AgX look
    m.side = 0; // FrontSide: the hidden faces were dropped at export
    shared.set(part, m);
  }

  // Rows of stalls, centred on the origin.
  const rows = Math.ceil(opts.stalls / COLS);
  const places: Point[] = [];
  for (let i = 0; i < opts.stalls; i++) {
    const r = Math.floor(i / COLS);
    const inRow = Math.min(COLS, opts.stalls - r * COLS);
    const c = i % COLS;
    places.push({ x: (c - (inRow - 1) / 2) * PITCH_X, z: ((rows - 1) / 2 - r) * PITCH_Z });
  }

  const placement = new Matrix4();
  places.forEach((p, i) => {
    placement.makeTranslation(p.x, 0, p.z);
    for (const part of parts) {
      let material = shared.get(part) as MeshBasicMaterial;
      if (opts.unique && i > 0) {
        material = material.clone();
        if (material.map) {
          material.map = copyTexture(material.map);
          textures.push(material.map);
        }
      }
      const mesh = new Mesh(part.geometry, material);
      mesh.name = `${part.name} ${i + 1}`;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.multiplyMatrices(placement, part.matrixWorld);
      root.add(mesh);
    }
  });

  const minX = Math.min(...places.map((p) => p.x)) + SLAB.minX - MARGIN;
  const maxX = Math.max(...places.map((p) => p.x)) + SLAB.maxX + MARGIN;
  const minZ = Math.min(...places.map((p) => p.z)) + SLAB.minZ - MARGIN;
  const maxZ = Math.max(...places.map((p) => p.z)) + SLAB.maxZ + MARGIN;
  const bounds = { minX, maxX, minZ, maxZ };

  // The lanes: one plane with the repeating texture, a little below the slabs' top so the
  // two never fight over the same depth. It reaches past the walkable area into the mist.
  const extra = 30;
  const w = maxX - minX + 2 * extra;
  const d = maxZ - minZ + 2 * extra;
  groundTex.wrapS = groundTex.wrapT = RepeatWrapping;
  groundTex.repeat.set(w / GROUND_TILE_M, d / GROUND_TILE_M);
  groundTex.colorSpace = SRGBColorSpace;
  groundTex.anisotropy = anisotropy;
  textures.push(groundTex);
  const ground = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ map: groundTex, toneMapped: false }));
  ground.name = 'Lanes';
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((minX + maxX) / 2, -0.005, (minZ + maxZ) / 2);
  root.add(ground);

  const obstacles = places.flatMap((p) =>
    BLOCKS.map((b) => ({ minX: b.minX + p.x, maxX: b.maxX + p.x, minZ: b.minZ + p.z, maxZ: b.maxZ + p.z })),
  );
  const nav = new NavGrid(bounds, 0.2, obstacles, 0.25);

  // Where residents stop: in front of each stall, and a few spots along each lane.
  const spots: Point[] = [];
  for (const p of places) {
    spots.push({ x: p.x - 0.3, z: p.z + 2.6 }, { x: p.x + 1.2, z: p.z + 3.4 });
  }
  const laneZ = [...new Set(places.map((p) => p.z))].map((z) => z + 3.8);
  for (const z of laneZ) {
    for (let x = minX + MARGIN; x <= maxX - MARGIN; x += 3.5) spots.push({ x, z });
  }

  // The benchmark walk: along the front lane, back through the next one, and so on.
  const route: Point[] = [];
  const left = minX + MARGIN - 1.5;
  const right = maxX - MARGIN + 1.5;
  laneZ.forEach((z, i) => {
    if (i % 2 === 0) route.push({ x: left, z }, { x: right, z });
    else route.push({ x: right, z }, { x: left, z });
  });
  const start = { x: 0, z: laneZ[0] };

  return { root, nav, bounds, spots, route, start, stallCount: places.length, textures };
}
