// Where people can walk: a grid over the market with the stalls blocked out. A* finds
// the way for tap-to-walk and for the residents; the joystick slides along obstacles.

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Point {
  x: number;
  z: number;
}

const DIAGONAL = Math.SQRT2;

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly blocked: Uint8Array;
  // A* scratch space, reused between searches.
  private readonly g: Float32Array;
  private readonly from: Int32Array;
  private readonly seen: Uint32Array;
  private stamp = 0;
  private readonly heap: number[] = [];
  private readonly f: Float32Array;

  constructor(
    readonly bounds: Rect,
    readonly cell: number,
    obstacles: Rect[],
    radius: number,
  ) {
    this.cols = Math.ceil((bounds.maxX - bounds.minX) / cell);
    this.rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.from = new Int32Array(n);
    this.seen = new Uint32Array(n);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = bounds.minX + (c + 0.5) * cell;
        const z = bounds.minZ + (r + 0.5) * cell;
        const edge = c === 0 || r === 0 || c === this.cols - 1 || r === this.rows - 1;
        const inside = obstacles.some(
          (o) => x > o.minX - radius && x < o.maxX + radius && z > o.minZ - radius && z < o.maxZ + radius,
        );
        if (edge || inside) this.blocked[r * this.cols + c] = 1;
      }
    }
  }

  private index(x: number, z: number): number {
    const c = Math.floor((x - this.bounds.minX) / this.cell);
    const r = Math.floor((z - this.bounds.minZ) / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  private centre(i: number): Point {
    return {
      x: this.bounds.minX + ((i % this.cols) + 0.5) * this.cell,
      z: this.bounds.minZ + (Math.floor(i / this.cols) + 0.5) * this.cell,
    };
  }

  free(x: number, z: number): boolean {
    const i = this.index(x, z);
    return i >= 0 && this.blocked[i] === 0;
  }

  /** Move by (dx, dz), sliding along whatever blocks the way. */
  slide(x: number, z: number, dx: number, dz: number): Point {
    if (this.free(x + dx, z + dz)) return { x: x + dx, z: z + dz };
    if (this.free(x + dx, z)) return { x: x + dx, z };
    if (this.free(x, z + dz)) return { x, z: z + dz };
    return { x, z };
  }

  /** The free cell nearest to (x, z), searching outwards ring by ring. */
  nearestFree(x: number, z: number, maxRings = 40): Point | null {
    const c0 = Math.floor((x - this.bounds.minX) / this.cell);
    const r0 = Math.floor((z - this.bounds.minZ) / this.cell);
    for (let ring = 0; ring <= maxRings; ring++) {
      let best = -1;
      let bestD = Infinity;
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const c = c0 + dc;
          const r = r0 + dr;
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
          const i = r * this.cols + c;
          if (this.blocked[i]) continue;
          const d = dr * dr + dc * dc;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
      if (best >= 0) return this.centre(best);
    }
    return null;
  }

  /** True when the straight line from a to b crosses no blocked cell. */
  lineFree(a: Point, b: Point): boolean {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const steps = Math.ceil(Math.hypot(dx, dz) / (this.cell * 0.5));
    for (let s = 1; s <= steps; s++) {
      if (!this.free(a.x + (dx * s) / steps, a.z + (dz * s) / steps)) return false;
    }
    return true;
  }

  /** A walkable route from a to b (b moved to the nearest free cell), or null. */
  path(a: Point, b: Point): Point[] | null {
    const startP = this.free(a.x, a.z) ? a : this.nearestFree(a.x, a.z);
    const goalP = this.free(b.x, b.z) ? b : this.nearestFree(b.x, b.z);
    if (!startP || !goalP) return null;
    const start = this.index(startP.x, startP.z);
    const goal = this.index(goalP.x, goalP.z);
    if (start < 0 || goal < 0) return null;
    if (start === goal || this.lineFree(startP, goalP)) return [goalP];

    this.stamp += 1;
    const { cols, g, f, from, seen, heap, blocked } = this;
    const gc = goal % cols;
    const gr = Math.floor(goal / cols);
    const h = (i: number) => {
      const dc = Math.abs((i % cols) - gc);
      const dr = Math.abs(Math.floor(i / cols) - gr);
      return Math.max(dc, dr) + (DIAGONAL - 1) * Math.min(dc, dr);
    };
    heap.length = 0;
    g[start] = 0;
    f[start] = h(start);
    from[start] = -1;
    seen[start] = this.stamp;
    this.push(start);
    const closedStamp = this.stamp + 0x80000000;
    let found = false;
    while (heap.length) {
      const cur = this.pop();
      if (cur === goal) {
        found = true;
        break;
      }
      if (seen[cur] === closedStamp) continue;
      seen[cur] = closedStamp;
      const c = cur % cols;
      const r = Math.floor(cur / cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= this.rows) continue;
          const ni = nr * cols + nc;
          if (blocked[ni] || seen[ni] === closedStamp) continue;
          // No cutting corners past a blocked cell.
          if (dr && dc && (blocked[r * cols + nc] || blocked[nr * cols + c])) continue;
          const cost = g[cur] + (dr && dc ? DIAGONAL : 1);
          if (seen[ni] !== this.stamp || cost < g[ni]) {
            seen[ni] = this.stamp;
            g[ni] = cost;
            f[ni] = cost + h(ni);
            from[ni] = cur;
            this.push(ni);
          }
        }
      }
    }
    if (!found) return null;

    const cells: Point[] = [];
    for (let i = goal; i !== -1 && i !== start; i = from[i]) cells.push(this.centre(i));
    cells.reverse();
    cells[cells.length - 1] = goalP;
    // Pull the string: keep only the corners the straight line cannot skip.
    const route: Point[] = [];
    let anchor = startP;
    for (let i = 0; i < cells.length; i++) {
      const next = cells[i + 1];
      if (!next || !this.lineFree(anchor, next)) {
        route.push(cells[i]);
        anchor = cells[i];
      }
    }
    return route;
  }

  // A binary heap of cell indices ordered by f.
  private push(i: number): void {
    const { heap, f } = this;
    heap.push(i);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (f[heap[p]] <= f[i]) break;
      heap[k] = heap[p];
      k = p;
    }
    heap[k] = i;
  }

  private pop(): number {
    const { heap, f } = this;
    const top = heap[0];
    const last = heap.pop() as number;
    if (heap.length) {
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        if (l >= heap.length) break;
        const r = l + 1;
        const m = r < heap.length && f[heap[r]] < f[heap[l]] ? r : l;
        if (f[heap[m]] >= f[last]) break;
        heap[k] = heap[m];
        k = m;
      }
      heap[k] = last;
    }
    return top;
  }
}
