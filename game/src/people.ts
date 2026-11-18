// The player and the residents: one skinned mesh, shared by everyone, with a palette
// texture of eight colours per person (skin, hair, top, bottom, shoes, trim, eyes, spare).
// Lit in real time by the same sun and sky the bakes used, then tone mapped with AgX, so
// people sit in the baked market.
import {
  AnimationMixer,
  DataTexture,
  type AnimationAction,
  type AnimationClip,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  SRGBColorSpace,
  type SkinnedMesh,
  Vector3,
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { Loaders } from './loaders';
import type { NavGrid, Point } from './nav';
import residentUrl from './assets/resident.glb?url';

/** One walk cycle (1 s) of the stand-in moves the body this far (from its Blender script). */
const STRIDE_M = 1.166;
const SCALE = 0.95; // the model is 1.71 m with hair: about 1.62 m in the game
const TURN_RATE = 10; // how quickly a person turns to face where they walk, per second

const SKIN = ['#b0805c', '#9c6b4a', '#c08e68', '#8a5a3c', '#a87652', '#c79a74'];
const HAIR = ['#1d1a18', '#1d1a18', '#2a211b', '#3b2f27', '#8f8a84', '#1d1a18'];
const TOP = ['#2f6f8f', '#8f3b35', '#d8d2c0', '#4f6b3a', '#c48a2c', '#6b4f7a', '#3d4f75', '#b8564a', '#e0c9a0', '#2e5d57'];
const BOTTOM = ['#3b3a40', '#2b3550', '#4a3b2f', '#5a1f24', '#3f4a33', '#24272b', '#6a5a48'];
const SHOES = ['#5a3d2b', '#24201d', '#7a5a3a', '#3a3a3a'];
const TRIM = ['#e8e2d0', '#c9b27a', '#a8a090'];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function palette(colors: string[]): DataTexture {
  const data = new Uint8Array(8 * 4);
  colors.forEach((c, i) => {
    const [r, g, b] = rgb(c);
    data.set([r, g, b, 255], i * 4);
  });
  const t = new DataTexture(data, 8, 1, RGBAFormat);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

export interface Person {
  root: Object3D;
  mixer: AnimationMixer;
  idle: AnimationAction;
  walk: AnimationAction;
  walking: boolean;
  pos: Point;
  heading: number;
  speed: number;
  /** Waypoints still to walk, nearest first. */
  path: Point[];
  /** For residents: seconds to stand before choosing somewhere new. */
  wait: number;
  material: MeshLambertMaterial;
}

export interface People {
  player: Person;
  residents: Person[];
  everyone: Person[];
  shadows: InstancedMesh;
  update(dt: number): void;
  palettes: DataTexture[];
}

export async function loadPeople(
  loaders: Loaders,
  nav: NavGrid,
  spots: Point[],
  start: Point,
  count: number,
  rand: () => number,
): Promise<People> {
  const gltf = await loaders.gltf.loadAsync(residentUrl);
  const template = gltf.scene as Group;
  const clips = gltf.animations as AnimationClip[];
  const idleClip = clips.find((c) => c.name === 'Idle');
  const walkClip = clips.find((c) => c.name === 'Walk');
  if (!idleClip || !walkClip) throw new Error('resident.glb has no Idle or Walk animation');
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const palettes: DataTexture[] = [];

  function make(colors: string[], pos: Point, speed: number, scale: number): Person {
    const root = cloneSkinned(template);
    root.scale.setScalar(SCALE * scale);
    const map = palette(colors);
    palettes.push(map);
    const material = new MeshLambertMaterial({ map });
    root.traverse((o) => {
      const mesh = o as SkinnedMesh;
      if (mesh.isSkinnedMesh) {
        mesh.material = material;
        mesh.frustumCulled = false; // the skinned bounds do not follow the animation
      }
    });
    const mixer = new AnimationMixer(root);
    const idle = mixer.clipAction(idleClip as AnimationClip);
    const walk = mixer.clipAction(walkClip as AnimationClip);
    idle.play();
    walk.play();
    walk.setEffectiveWeight(0);
    idle.time = rand() * idleClip!.duration; // not everyone breathes in step
    root.position.set(pos.x, 0, pos.z);
    return { root, mixer, idle, walk, walking: false, pos: { ...pos }, heading: rand() * Math.PI * 2, speed, path: [], wait: rand() * 3, material };
  }

  const player = make(['#b0805c', '#1d1a18', '#2f6f8f', '#3b3a40', '#5a3d2b', '#e8e2d0', '#16120f', '#808080'], start, 1.6, 1);
  player.heading = 0; // facing the camera
  const residents: Person[] = [];
  for (let i = 0; i < count; i++) {
    const spot = spots[Math.floor(rand() * spots.length)];
    const where = nav.nearestFree(spot.x + (rand() - 0.5) * 2, spot.z + (rand() - 0.5) * 2) ?? start;
    const colors = [pick(SKIN), pick(HAIR), pick(TOP), pick(BOTTOM), pick(SHOES), pick(TRIM), '#16120f', '#808080'];
    residents.push(make(colors, where, 0.95 + rand() * 0.3, 0.93 + rand() * 0.08));
  }
  const everyone = [player, ...residents];

  // Soft blob shadows under everyone, stretched a little away from the low morning sun.
  const blobTex = (() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) * 2;
        const a = Math.max(0, 1 - d);
        data.set([0, 0, 0, Math.round(255 * a * a * (3 - 2 * a) * 0.55)], (y * size + x) * 4);
      }
    }
    const t = new DataTexture(data, size, size, RGBAFormat);
    t.needsUpdate = true;
    return t;
  })();
  const shadowGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowMat = new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false });
  shadowMat.polygonOffset = true;
  shadowMat.polygonOffsetFactor = -2;
  const shadows = new InstancedMesh(shadowGeo, shadowMat, everyone.length);
  shadows.name = 'Blob shadows';
  shadows.frustumCulled = false;
  shadows.renderOrder = 1;
  // The sun of the bakes comes from the front left: shadows fall back and to the right.
  const away = new Vector3(0.45, 0, -0.72).normalize();
  const shadowAngle = Math.atan2(away.x, away.z);
  const m = new Matrix4();
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), shadowAngle);
  const s = new Vector3(0.62, 1, 0.95);
  const p = new Vector3();

  function update(dt: number): void {
    everyone.forEach((person, i) => {
      // Walk along the path, if any.
      let moving = false;
      if (person.path.length) {
        const target = person.path[0];
        const dx = target.x - person.pos.x;
        const dz = target.z - person.pos.z;
        const dist = Math.hypot(dx, dz);
        const step = person.speed * dt;
        if (dist <= step) {
          person.pos.x = target.x;
          person.pos.z = target.z;
          person.path.shift();
        } else {
          person.pos.x += (dx / dist) * step;
          person.pos.z += (dz / dist) * step;
        }
        if (dist > 1e-3) person.heading = turnTowards(person.heading, Math.atan2(dx, dz), dt);
        moving = true;
      }
      setWalking(person, moving || person.walking, dt);
      person.root.position.set(person.pos.x, 0, person.pos.z);
      person.root.rotation.y = person.heading;
      person.mixer.update(dt);
      p.set(person.pos.x + away.x * 0.22, 0.012, person.pos.z + away.z * 0.22);
      m.compose(p, q, s);
      shadows.setMatrixAt(i, m);
    });
    shadows.instanceMatrix.needsUpdate = true;
  }

  return { player, residents, everyone, shadows, update, palettes };
}

function turnTowards(current: number, target: number, dt: number): number {
  let d = target - current;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return current + d * Math.min(1, TURN_RATE * dt);
}

/** Cross-fade between standing and walking, and match the steps to the speed. */
export function setWalking(person: Person, walking: boolean, dt: number): void {
  const target = walking ? 1 : 0;
  const w = person.walk.getEffectiveWeight();
  const next = w + Math.sign(target - w) * Math.min(Math.abs(target - w), dt * 6);
  person.walk.setEffectiveWeight(next);
  person.idle.setEffectiveWeight(1 - next);
  person.walk.timeScale = person.speed / STRIDE_M;
}

export function faceAndMove(person: Person, nav: NavGrid, dirX: number, dirZ: number, amount: number, dt: number): boolean {
  if (amount < 0.05) return false;
  const step = person.speed * amount * dt;
  const next = nav.slide(person.pos.x, person.pos.z, dirX * step, dirZ * step);
  person.pos.x = next.x;
  person.pos.z = next.z;
  person.heading = turnTowards(person.heading, Math.atan2(dirX, dirZ), dt);
  return true;
}
