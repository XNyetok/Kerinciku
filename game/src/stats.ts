// What the prototype measures: frame times, an estimate of GPU memory, the JS heap where the
// browser tells it, what was downloaded, and which device this is.
import {
  CompressedTexture,
  DataTexture,
  type BufferGeometry,
  type InstancedMesh,
  type Mesh,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three';

/** The last frame times, in milliseconds. */
export class FrameTimes {
  private readonly buf: Float32Array;
  private count = 0;
  private next = 0;

  constructor(capacity = 4096) {
    this.buf = new Float32Array(capacity);
  }

  push(ms: number): void {
    this.buf[this.next] = ms;
    this.next = (this.next + 1) % this.buf.length;
    this.count = Math.min(this.count + 1, this.buf.length);
  }

  clear(): void {
    this.count = 0;
    this.next = 0;
  }

  /** The frames of the last `seconds`, oldest first (all of them when seconds is 0). */
  recent(seconds = 0): number[] {
    const out: number[] = [];
    let total = 0;
    for (let k = 1; k <= this.count; k++) {
      const v = this.buf[(this.next - k + this.buf.length) % this.buf.length];
      if (seconds && total + v > seconds * 1000) break;
      total += v;
      out.push(v);
    }
    return out.reverse();
  }
}

export interface Summary {
  frames: number;
  fps: number;
  /** 1% low: the frame rate of the slowest one percent of frames. */
  low: number;
  median: number;
  p95: number;
  p99: number;
  /** Percent of frames slower than 33.3 ms (a missed 30 fps frame) and 16.7 ms. */
  slow33: number;
  slow16: number;
}

export function summarize(times: number[]): Summary {
  if (!times.length) return { frames: 0, fps: 0, low: 0, median: 0, p95: 0, p99: 0, slow33: 0, slow16: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const total = times.reduce((a, b) => a + b, 0);
  const pct = (limit: number) => Math.round((1000 * times.filter((t) => t > limit).length) / times.length) / 10;
  return {
    frames: times.length,
    fps: Math.round((times.length * 1000) / total),
    low: Math.round(1000 / at(0.99)),
    median: Math.round(at(0.5) * 10) / 10,
    p95: Math.round(at(0.95) * 10) / 10,
    p99: Math.round(at(0.99) * 10) / 10,
    slow33: pct(1000 / 30 + 0.5),
    slow16: pct(1000 / 60 + 0.5),
  };
}

function textureBytes(t: Texture): number {
  if (t instanceof CompressedTexture) return t.mipmaps.reduce((n, m) => n + (m.data as ArrayBufferView).byteLength, 0);
  if (t instanceof DataTexture) return (t.image.data as ArrayBufferView | null)?.byteLength ?? 0;
  const img = t.image as { width?: number; height?: number } | undefined;
  const px = (img?.width ?? 0) * (img?.height ?? 0) * 4;
  return t.generateMipmaps ? Math.round((px * 4) / 3) : px;
}

export interface GpuEstimate {
  textures: number;
  geometry: number;
  framebuffer: number;
  total: number;
}

/**
 * An estimate in bytes: what three uploads (textures as transcoded, vertex and index
 * buffers once per geometry, instance matrices) plus the drawing buffer. The browser and
 * the driver add their own share on top, which no web page can see.
 */
export function gpuEstimate(scene: Object3D, renderer: WebGLRenderer, antialias: boolean): GpuEstimate {
  const textures = new Map<unknown, number>();
  const geometries = new Set<BufferGeometry>();
  let instances = 0;
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    const inst = o as InstancedMesh;
    if (inst.isInstancedMesh) instances += inst.instanceMatrix.array.byteLength;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const map = (m as { map?: Texture | null }).map;
      if (map) textures.set(map.source, textureBytes(map));
    }
  });
  let geometry = instances;
  for (const g of geometries) {
    for (const a of Object.values(g.attributes)) geometry += (a.array as ArrayBufferView).byteLength;
    if (g.index) geometry += (g.index.array as ArrayBufferView).byteLength;
  }
  const gl = renderer.getContext();
  const px = gl.drawingBufferWidth * gl.drawingBufferHeight;
  const samples = antialias ? Math.max(1, gl.getParameter(gl.SAMPLES) as number) : 1;
  // Colour and depth per sample, a resolved colour buffer, and two buffers being shown.
  const framebuffer = px * (8 * samples + (antialias ? 4 : 0) + 8);
  const tex = [...textures.values()].reduce((a, b) => a + b, 0);
  return { textures: tex, geometry, framebuffer, total: tex + geometry + framebuffer };
}

export interface Downloads {
  /** Bytes over the network, headers included (0 for what came from the cache). */
  transferred: number;
  /** Bytes of the responses as sent (compressed), cached or not. */
  encoded: number;
  files: number;
  byType: Record<string, number>;
}

export function downloads(): Downloads {
  const entries = [
    ...(performance.getEntriesByType('navigation') as PerformanceResourceTiming[]),
    ...(performance.getEntriesByType('resource') as PerformanceResourceTiming[]),
  ];
  const byType: Record<string, number> = {};
  let transferred = 0;
  let encoded = 0;
  for (const e of entries) {
    transferred += e.transferSize || 0;
    encoded += e.encodedBodySize || 0;
    const ext = new URL(e.name, location.href).pathname.match(/\.([a-z0-9]+)$/)?.[1] ?? 'html';
    byType[ext] = (byType[ext] ?? 0) + (e.encodedBodySize || 0);
  }
  return { transferred, encoded, files: entries.length, byType };
}

export function jsHeap(): { used: number; total: number; limit: number } | null {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  return m ? { used: m.usedJSHeapSize, total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit } : null;
}

export function gpuName(renderer: WebGLRenderer): string {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
}

export function device(renderer: WebGLRenderer) {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    userAgent: navigator.userAgent,
    gpu: gpuName(renderer),
    devicePixelRatio: window.devicePixelRatio,
    screen: [screen.width, screen.height],
    viewport: [innerWidth, innerHeight],
    cores: navigator.hardwareConcurrency ?? null,
    deviceMemoryGB: nav.deviceMemory ?? null,
    maxTextureSize: renderer.capabilities.maxTextureSize,
  };
}

export const mb = (bytes: number) => bytes / 1048576;
