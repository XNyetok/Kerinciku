// The tech prototype: a slice of the market, the player, residents walking about, the
// joystick and tap-to-walk, the fixed camera, and the numbers the task measures on phones.
import './style.css';
import {
  AgXToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { benchRatios, runBench, type BenchResult } from './bench';
import { FollowCamera } from './camera';
import { Input } from './input';
import { makeLoaders } from './loaders';
import { buildMarket } from './market';
import { faceAndMove, loadPeople, type Person } from './people';
import { random, readParams } from './params';
import { device, downloads, FrameTimes, gpuEstimate, gpuName, jsHeap, mb, summarize } from './stats';
import { text } from './strings';

const MIST = '#c5c6c4'; // the highland mist of the stall's renders

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is missing from index.html`);
  return el as T;
}

const params = readParams();
const ui = {
  stage: byId('stage'),
  hud: byId<HTMLPreElement>('hud'),
  buttons: byId('buttons'),
  bench: byId<HTMLButtonElement>('b-bench'),
  full: byId<HTMLButtonElement>('b-full'),
  toggle: byId<HTMLButtonElement>('b-hud'),
  notice: byId('notice'),
  message: byId('message'),
  results: byId('results'),
  resultsText: byId<HTMLPreElement>('results-text'),
  resultsJson: byId<HTMLTextAreaElement>('results-json'),
  resultsNote: byId('results-note'),
  copy: byId<HTMLButtonElement>('b-copy'),
  close: byId<HTMLButtonElement>('b-close'),
  label: byId('label'),
};
ui.label.textContent = text.hud.version(__BUILD_LABEL__);
ui.bench.textContent = text.bench;
ui.full.textContent = text.fullscreen;
ui.copy.textContent = text.copy;
ui.close.textContent = text.close;

function say(message: string): void {
  ui.message.textContent = message;
}

function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!hasWebGL2()) {
    say(text.noWebGL2);
    (window as unknown as { __error?: string }).__error = 'no WebGL2';
    return;
  }
  say(text.loading);

  const renderer = new WebGLRenderer({ antialias: params.aa, powerPreference: 'high-performance' });
  renderer.setPixelRatio(params.ratio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  // People are lit in real time and tone mapped with AgX, like the bakes were in Blender.
  // The baked materials opt out: their textures already carry the look.
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1;
  ui.stage.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    say(text.loadFailed('WebGL context lost'));
  });

  const scene = new Scene();
  scene.background = new Color(MIST);
  scene.fog = new Fog(MIST, 24, 52);

  // The light of the bakes (game/README.md, Lighting): a warm sun of 5.5 W/m2, low from
  // the front left, and a pale blue sky at 0.45. Three uses the same units: irradiance
  // from the sky is pi times its radiance; from below, the sunlit paving bounces light up.
  const sun = new DirectionalLight(new Color(1.0, 0.82, 0.64), 5.5);
  sun.position.set(-0.45, 0.53, 0.72);
  const sky = new HemisphereLight(new Color(0.685, 0.845, 1.05), new Color(1.34, 1.0, 0.67), 1);
  scene.add(sun, sky);

  const loaders = makeLoaders(renderer);
  const market = await buildMarket(loaders, renderer, params);
  scene.add(market.root);
  const rand = random(params.seed);
  const people = await loadPeople(loaders, market.nav, market.spots, market.start, params.npcs, rand);
  for (const p of people.everyone) scene.add(p.root);
  scene.add(people.shadows);

  const cam = new FollowCamera(params.dist);
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    cam.resize(innerWidth, innerHeight);
  };
  addEventListener('resize', resize);
  resize();
  cam.update(people.player.pos, 0, true);
  await renderer.compileAsync(scene, cam.camera);

  const input = new Input(renderer.domElement);
  const frames = new FrameTimes();
  const player = people.player;
  let benchRoute: number | null = null; // index into market.route while the benchmark walks

  function residentsThink(dt: number): void {
    for (const r of people.residents) {
      if (r.path.length) continue;
      r.wait -= dt;
      if (r.wait > 0) continue;
      const spot = market.spots[Math.floor(rand() * market.spots.length)];
      const route = market.nav.path(r.pos, { x: spot.x + (rand() - 0.5) * 1.5, z: spot.z + (rand() - 0.5) * 1.5 });
      r.path = route ?? [];
      r.wait = 1.5 + rand() * 4.5;
    }
  }

  function walkTo(person: Person, x: number, z: number): void {
    person.path = market.nav.path(person.pos, { x, z }) ?? [];
  }

  function playerControl(dt: number): void {
    player.walking = false;
    if (benchRoute !== null) {
      if (!player.path.length) {
        benchRoute = (benchRoute + 1) % market.route.length;
        const p = market.route[benchRoute];
        walkTo(player, p.x, p.z);
      }
      return;
    }
    const stick = input.stick();
    if (stick) {
      player.path = [];
      const dx = cam.right.x * stick.x + cam.forward.x * stick.y;
      const dz = cam.right.z * stick.x + cam.forward.z * stick.y;
      const len = Math.hypot(dx, dz) || 1;
      player.walking = faceAndMove(player, market.nav, dx / len, dz / len, stick.amount, dt);
      return;
    }
    const tap = input.takeTap();
    if (tap) {
      const at = cam.groundPoint(tap.x, tap.y, innerWidth, innerHeight);
      if (at) walkTo(player, at.x, at.z);
    }
  }

  // The numbers on screen, twice a second.
  const readyAt = performance.now();
  let hudShown = params.hud;
  const showHud = () => {
    ui.hud.hidden = !hudShown;
    ui.toggle.textContent = hudShown ? text.hideHud : text.showHud;
  };
  ui.toggle.addEventListener('click', () => {
    hudShown = !hudShown;
    showHud();
  });
  showHud();
  const fullGpu = gpuName(renderer);
  const gpu = fullGpu.length > 44 ? `${fullGpu.slice(0, 43)}…` : fullGpu;
  let hudTimer = 0;
  function updateHud(): void {
    const s = summarize(frames.recent(2));
    const est = gpuEstimate(scene, renderer, params.aa);
    const heap = jsHeap();
    const dl = downloads();
    const canvas = renderer.domElement;
    ui.hud.textContent = [
      text.hud.fps(s.fps, s.low, s.median, s.p95),
      text.hud.draw(renderer.info.render.calls, renderer.info.render.triangles),
      text.hud.view(canvas.width, canvas.height, renderer.getPixelRatio()),
      text.hud.memory(heap ? `${mb(heap.used).toFixed(0)} MB` : text.hud.unknown, mb(est.total)),
      text.hud.download(mb(dl.transferred || dl.encoded), readyAt / 1000),
      text.hud.scene(market.stallCount, people.everyone.length, params.tex, params.unique),
      text.hud.gpu(gpu),
    ].join('\n');
  }

  // Full screen and landscape where the browser allows it (not Safari on iPhone).
  if (document.fullscreenEnabled) {
    ui.full.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await orientation.lock?.('landscape');
      } catch {
        // Refused or unsupported: the game works the same without it.
      }
    });
  } else {
    ui.full.hidden = true;
  }

  // The benchmark always starts from a fresh load with the fixed seed, so every phone
  // walks the same route past the same residents.
  ui.bench.addEventListener('click', () => {
    const q = new URLSearchParams(location.search);
    q.set('bench', '1');
    q.delete('seed');
    location.search = q.toString();
  });

  const portrait = () => innerHeight > innerWidth && matchMedia('(pointer: coarse)').matches;
  let noticeUntil = performance.now() + 5000;
  function updateNotice(now: number): void {
    if (benchRoute !== null) return; // the benchmark writes its own status there
    const msg = now < noticeUntil ? text.help : '';
    ui.notice.textContent = msg;
    ui.notice.hidden = msg === '';
    say(portrait() ? text.rotate : '');
  }

  let last = performance.now();
  renderer.setAnimationLoop((now: number) => {
    const raw = now - last;
    if (params.fps && raw < 1000 / params.fps - 2) return;
    last = now;
    frames.push(raw);
    const dt = Math.min(raw, 100) / 1000;
    playerControl(dt);
    residentsThink(dt);
    people.update(dt);
    cam.update(player.pos, dt);
    renderer.render(scene, cam.camera);
    hudTimer += raw;
    if (hudTimer > 500) {
      hudTimer = 0;
      if (hudShown) updateHud();
      updateNotice(now);
    }
  });

  say('');
  ui.buttons.hidden = false;
  ui.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ui.resultsJson.value);
      ui.resultsNote.textContent = text.copied;
    } catch {
      ui.resultsJson.focus();
      ui.resultsJson.select();
      ui.resultsNote.textContent = text.copyFailed;
    }
  });
  ui.close.addEventListener('click', () => {
    ui.results.hidden = true;
  });

  // For the browser tests: the player, and a flag once the first frames are drawn.
  Object.assign(window, { __player: player, __ready: true });

  if (params.bench) {
    noticeUntil = 0;
    input.enabled = false;
    ui.buttons.hidden = true;
    benchRoute = 0;
    walkTo(player, market.route[0].x, market.route[0].z);
    const result: BenchResult = await runBench(
      {
        frames,
        setRatio: (r) => {
          renderer.setPixelRatio(r);
          resize();
        },
        canvasSize: () => [renderer.domElement.width, renderer.domElement.height],
        status: (t) => {
          ui.notice.textContent = t;
          ui.notice.hidden = false;
        },
        stepLabel: text.benchRunning,
        soakLabel: text.soakRunning,
      },
      benchRatios(window.devicePixelRatio || 1),
      3,
      12,
      params.soak,
      params.ratio,
    );
    renderer.setPixelRatio(params.ratio);
    resize();
    benchRoute = null;
    player.path = [];
    input.enabled = true;
    ui.buttons.hidden = false;
    ui.notice.hidden = true;
    showResults(result);
  }

  function showResults(result: BenchResult): void {
    const est = gpuEstimate(scene, renderer, params.aa);
    const report = {
      kind: 'tech-prototype-benchmark',
      build: __BUILD_LABEL__,
      date: new Date().toISOString(),
      params,
      device: device(renderer),
      load: { readySeconds: Math.round(readyAt) / 1000, downloads: downloads() },
      memory: {
        jsHeap: jsHeap(),
        gpuEstimate: est,
        textures: market.textures.length + people.palettes.length,
      },
      scene: { stalls: market.stallCount, people: people.everyone.length, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
      bench: result,
    };
    const json = JSON.stringify(report);
    ui.resultsText.textContent = [
      text.benchDone,
      ...result.steps.map((s) => text.benchRow(s.ratio, s.canvas[0], s.canvas[1], s.fps, s.p95, s.slow33)),
      ...(result.soak.length ? [`soak: ${result.soak.join(', ')} fps`] : []),
      text.hud.gpu(report.device.gpu),
    ].join('\n');
    ui.resultsJson.value = json;
    ui.resultsNote.textContent = '';
    ui.results.hidden = false;
    console.info('benchmark result', report);
    (window as unknown as { __bench?: unknown }).__bench = report;
  }

}

main().catch((err: unknown) => {
  const why = err instanceof Error ? err.message : String(err);
  say(text.loadFailed(why));
  (window as unknown as { __error?: string }).__error = why;
  console.error(err);
});
