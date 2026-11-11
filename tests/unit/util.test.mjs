import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

/** Load js/util.js the way the page does, with a frame clock the test drives by hand. */
function load(saved = {}) {
  const queue = [];
  const page = {
    JK: {},
    document: { createElement: () => ({}) },
    requestAnimationFrame: (fn) => queue.push(fn),
    cancelAnimationFrame: () => { queue.length = 0; },
    localStorage: {
      getItem: (k) => (k in saved ? saved[k] : null),
      setItem: (k, v) => { saved[k] = String(v); },
    },
  };
  page.window = page;
  vm.createContext(page);
  vm.runInContext(readFileSync(new URL('../../js/util.js', import.meta.url), 'utf8'), page);
  let now = 0;
  /** Advance the clock by `ms`, one 16 ms frame at a time. */
  const advance = (ms) => {
    for (const end = now + ms; now < end && queue.length; ) {
      now += 16;
      queue.shift()(now);
    }
  };
  return { JK: page.JK, advance, saved };
}

test('the game clock runs delayed tasks in order, once', () => {
  const { JK, advance } = load();
  const clock = new JK.Clock();
  const order = [];
  clock.after(() => order.push('b'), 200);
  clock.after(() => order.push('a'), 100);
  clock.start();
  advance(150);
  assert.deepEqual(order, ['a']);
  advance(500);
  assert.deepEqual(order, ['a', 'b']);
});

test('a cancelled task never runs', () => {
  const { JK, advance } = load();
  const clock = new JK.Clock();
  let ran = false;
  const task = clock.after(() => { ran = true; }, 100);
  clock.start();
  clock.cancel(task);
  advance(300);
  assert.equal(ran, false);
});

test('a paused clock stands still and resumes where it stopped', () => {
  const { JK, advance } = load();
  const clock = new JK.Clock();
  let ran = false;
  clock.after(() => { ran = true; }, 300);
  clock.start();
  advance(160);
  clock.pause();
  const whenPaused = clock.t;
  advance(1000);
  assert.equal(clock.t, whenPaused);
  assert.equal(ran, false);
  clock.start();
  advance(400);
  assert.equal(ran, true);
});

test('a long gap between frames counts as at most 100 ms', () => {
  const { JK } = load();
  const clock = new JK.Clock();
  clock.running = true;
  clock._step(1000);
  const start = clock.t;
  clock._step(1000 + 60_000); // the tab was hidden for a minute
  assert.equal(clock.t - start, 100);
});

test('stopping drops every task, runs the cleanups, and cannot be undone', () => {
  const { JK, advance } = load();
  const clock = new JK.Clock();
  let ran = false;
  let cleanups = 0;
  clock.after(() => { ran = true; }, 50);
  clock.each(() => { ran = true; });
  clock.onStop(() => { cleanups++; });
  clock.stop();
  clock.stop();
  clock.start();
  advance(500);
  assert.equal(ran, false);
  assert.equal(cleanups, 1);
});

test('a task that stops the clock keeps later tasks from running', () => {
  const { JK, advance } = load();
  const clock = new JK.Clock();
  let late = false;
  clock.after(() => clock.stop(), 10);
  clock.after(() => { late = true; }, 10);
  clock.start();
  advance(100);
  assert.equal(late, false);
});

test('shuffling keeps every card and leaves the original alone', () => {
  const { JK } = load();
  const original = ['a', 'a', 'b', 'b', 'c', 'c'];
  const shuffled = JK.shuffle(original);
  assert.deepEqual([...shuffled].sort(), original);
  assert.deepEqual(original, ['a', 'a', 'b', 'b', 'c', 'c']);
});

test('stamps are saved and read back; broken or missing storage is survived', () => {
  const { JK, saved } = load();
  JK.store.data.stamps.tea = 3;
  JK.store.data.sound = false;
  JK.store.write();

  const fresh = load({ ...saved }).JK;
  fresh.store.read();
  assert.deepEqual({ ...fresh.store.data.stamps }, { tea: 3 });
  assert.equal(fresh.store.data.sound, false);

  for (const broken of ['{not json', '"text"', 'null', '{"stamps":5,"sound":"yes"}', '{"stamps":{"tea":9,"lake":"3","x":0}}']) {
    const { JK: j } = load({ 'jelajah-kerinci-v1': broken });
    j.store.read();
    assert.deepEqual({ ...j.store.data.stamps }, {});
    assert.equal(j.store.data.sound, true);
  }
});

test('progress saved by version 0.1.0 is read with its old field names and place ids', () => {
  const old = JSON.stringify({ stempel: { teh: 3, danau: 1, rimba: 2, rentak: 3, pasar: 2, gunung: 3 }, suara: false });
  const { JK, saved } = load({ 'jelajah-kerinci-v1': old });
  JK.store.read();
  assert.deepEqual({ ...JK.store.data.stamps }, { tea: 3, lake: 1, forest: 2, rhythm: 3, market: 2, mountain: 3 });
  assert.equal(JK.store.data.sound, false);

  JK.store.write();
  assert.deepEqual(JSON.parse(saved['jelajah-kerinci-v1']), {
    stamps: { tea: 3, lake: 1, forest: 2, rhythm: 3, market: 2, mountain: 3 },
    sound: false,
  });
});
