// The fixed game camera: it never turns, only follows the player. Its angle is the one
// the stall was rendered, baked and culled for: yaw 20 degrees, pitch 36 degrees.
// The vertical field of view is fixed, so a wider phone sees more to the sides; it stays
// inside the 56 x 34 degrees the stall's culling allowed for (faces no camera ray in that
// range can reach were dropped from it).
import { MathUtils, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Point } from './nav';

const YAW = MathUtils.degToRad(20);
const PITCH = MathUtils.degToRad(36);
const VFOV = 22.9; // degrees: the stall's render (a 50 mm lens on a 36 mm sensor, 16:9)
const MAX_HFOV = MathUtils.degToRad(54);
const FOCUS_HEIGHT = 0.9;
// The camera looks a little ahead of the player (into the screen), so the player stands
// below the middle and the stalls behind them fit on screen.
const FOCUS_AHEAD = 1.6;

export class FollowCamera {
  readonly camera = new PerspectiveCamera(VFOV, 1, 0.5, 90);
  /** Unit vectors on the ground: where "up" and "right" on the screen point. */
  readonly forward = { x: Math.sin(YAW), z: -Math.cos(YAW) };
  readonly right = { x: Math.cos(YAW), z: Math.sin(YAW) };
  private readonly view = new Vector3(Math.sin(YAW) * Math.cos(PITCH), -Math.sin(PITCH), -Math.cos(YAW) * Math.cos(PITCH));
  private readonly focus = new Vector3();
  private readonly ray = new Raycaster();
  private readonly ground = new Plane(new Vector3(0, 1, 0), 0);
  private readonly hit = new Vector3();
  private readonly ndc = new Vector2();

  constructor(private distance: number) {}

  resize(width: number, height: number): void {
    const aspect = width / height;
    let vfov = MathUtils.degToRad(VFOV);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    if (hfov > MAX_HFOV) vfov = 2 * Math.atan(Math.tan(MAX_HFOV / 2) / aspect);
    this.camera.aspect = aspect;
    this.camera.fov = MathUtils.radToDeg(vfov);
    this.camera.updateProjectionMatrix();
  }

  /** Jump straight to the player (on start), or ease towards them. */
  update(player: Point, dt: number, snap = false): void {
    const t = snap ? 1 : 1 - Math.exp(-dt * 6);
    const fx = player.x + this.forward.x * FOCUS_AHEAD;
    const fz = player.z + this.forward.z * FOCUS_AHEAD;
    this.focus.x += (fx - this.focus.x) * t;
    this.focus.z += (fz - this.focus.z) * t;
    this.focus.y = FOCUS_HEIGHT;
    this.camera.position.copy(this.focus).addScaledVector(this.view, -this.distance);
    this.camera.lookAt(this.focus);
  }

  /** Where a point on the screen (CSS pixels) meets the ground, if it does. */
  groundPoint(x: number, y: number, width: number, height: number): Point | null {
    this.ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    return this.ray.ray.intersectPlane(this.ground, this.hit) ? { x: this.hit.x, z: this.hit.z } : null;
  }
}
