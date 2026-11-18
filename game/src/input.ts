// Touch, mouse and keys. Dragging anywhere is a joystick that appears under the thumb;
// a quick tap is "walk there". Arrow keys or WASD work on a laptop.

export interface Stick {
  /** Screen direction: x to the right, y up. Unit length. */
  x: number;
  y: number;
  /** 0 to 1: how far the thumb pushed. */
  amount: number;
}

const DRAG_PX = 12;
const RADIUS_PX = 56;
const TAP_MS = 350;

export class Input {
  enabled = true;
  private pointer: { id: number; x0: number; y0: number; t0: number; x: number; y: number; dragging: boolean } | null = null;
  private tap: { x: number; y: number } | null = null;
  private readonly keys = new Set<string>();
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;

  constructor(private readonly surface: HTMLElement) {
    this.base = document.createElement('div');
    this.base.className = 'stick';
    this.knob = document.createElement('div');
    this.knob.className = 'stick-knob';
    this.base.appendChild(this.knob);
    this.base.hidden = true;
    document.body.appendChild(this.base);

    surface.addEventListener('pointerdown', (e) => this.down(e));
    surface.addEventListener('pointermove', (e) => this.move(e));
    surface.addEventListener('pointerup', (e) => this.up(e));
    surface.addEventListener('pointercancel', (e) => this.up(e, true));
    addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
  }

  private down(e: PointerEvent): void {
    if (!this.enabled || this.pointer) return;
    this.surface.setPointerCapture(e.pointerId);
    this.pointer = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), x: e.clientX, y: e.clientY, dragging: false };
  }

  private move(e: PointerEvent): void {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.dragging && Math.hypot(p.x - p.x0, p.y - p.y0) > DRAG_PX) {
      p.dragging = true;
      this.base.hidden = false;
      this.base.style.transform = `translate(${p.x0}px, ${p.y0}px)`;
    }
    if (p.dragging) {
      const dx = p.x - p.x0;
      const dy = p.y - p.y0;
      const len = Math.hypot(dx, dy);
      const k = len > RADIUS_PX ? RADIUS_PX / len : 1;
      this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    }
  }

  private up(e: PointerEvent, cancelled = false): void {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId) return;
    if (!cancelled && !p.dragging && performance.now() - p.t0 < TAP_MS) this.tap = { x: p.x, y: p.y };
    this.pointer = null;
    this.base.hidden = true;
    this.knob.style.transform = '';
  }

  stick(): Stick | null {
    if (!this.enabled) return null;
    const p = this.pointer;
    if (p && p.dragging) {
      const dx = p.x - p.x0;
      const dy = p.y0 - p.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) return null;
      return { x: dx / len, y: dy / len, amount: Math.min(1, len / RADIUS_PX) };
    }
    const k = this.keys;
    const x = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    const y = (k.has('arrowup') || k.has('w') ? 1 : 0) - (k.has('arrowdown') || k.has('s') ? 1 : 0);
    if (!x && !y) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len, amount: 1 };
  }

  takeTap(): { x: number; y: number } | null {
    const t = this.tap;
    this.tap = null;
    return this.enabled ? t : null;
  }
}
