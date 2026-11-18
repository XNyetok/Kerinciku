// Settings for the prototype, read from the address, so a test on a phone is a link:
//
//   ?tex=1k          stall texture 1024 px instead of 2048 px
//   ?stalls=16       how many stalls (default 12)
//   ?unique=1        every stall gets its own copy of the texture on the GPU, as unique
//                    baked stalls would
//   ?npcs=20         how many residents walk around (default 8)
//   ?ratio=1.5       render pixel ratio (default: the screen's, at most 2)
//   ?fps=30          frame cap (default 0: as fast as the screen allows)
//   ?aa=0            no multisampling
//   ?dist=14         camera distance in metres (default 12)
//   ?hud=0           no numbers on screen
//   ?bench=1         start the benchmark at once; ?soak=300 adds a heat test of that many seconds
//   ?seed=7          the residents' random seed (the benchmark always uses the same one)

export interface Params {
  tex: '2k' | '1k';
  stalls: number;
  unique: boolean;
  npcs: number;
  ratio: number;
  fps: number;
  aa: boolean;
  dist: number;
  hud: boolean;
  bench: boolean;
  soak: number;
  seed: number;
}

function int(q: URLSearchParams, name: string, fallback: number, min: number, max: number): number {
  const raw = q.get(name);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

function num(q: URLSearchParams, name: string, fallback: number, min: number, max: number): number {
  const raw = q.get(name);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function readParams(search = location.search): Params {
  const q = new URLSearchParams(search);
  return {
    tex: q.get('tex') === '1k' ? '1k' : '2k',
    stalls: int(q, 'stalls', 12, 1, 48),
    unique: q.get('unique') === '1',
    npcs: int(q, 'npcs', 8, 0, 60),
    ratio: num(q, 'ratio', Math.min(window.devicePixelRatio || 1, 2), 0.5, 4),
    fps: int(q, 'fps', 0, 0, 120),
    aa: q.get('aa') !== '0',
    dist: num(q, 'dist', 12, 6, 20),
    hud: q.get('hud') !== '0',
    bench: q.get('bench') === '1',
    soak: int(q, 'soak', 0, 0, 1800),
    seed: int(q, 'seed', 7, 0, 2 ** 31 - 1),
  };
}

/** A small seeded random generator (mulberry32), so a benchmark is the same on every phone. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
