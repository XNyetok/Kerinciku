import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

/** Load js/alat.js the way the page does, with a frame clock the test drives by hand. */
function muat(simpanan = {}) {
  const antre = [];
  const jendela = {
    JK: {},
    document: { createElement: () => ({}) },
    requestAnimationFrame: (fn) => antre.push(fn),
    cancelAnimationFrame: () => { antre.length = 0; },
    localStorage: {
      getItem: (k) => (k in simpanan ? simpanan[k] : null),
      setItem: (k, v) => { simpanan[k] = String(v); },
    },
  };
  jendela.window = jendela;
  vm.createContext(jendela);
  vm.runInContext(readFileSync(new URL('../../js/alat.js', import.meta.url), 'utf8'), jendela);
  let waktu = 0;
  /** Advance the clock by `ms`, one 16 ms frame at a time. */
  const maju = (ms) => {
    for (const akhir = waktu + ms; waktu < akhir && antre.length; ) {
      waktu += 16;
      antre.shift()(waktu);
    }
  };
  return { JK: jendela.JK, maju, simpanan };
}

test('the game clock runs delayed tasks in order, once', () => {
  const { JK, maju } = muat();
  const sesi = new JK.Sesi();
  const urutan = [];
  sesi.tunda(() => urutan.push('b'), 200);
  sesi.tunda(() => urutan.push('a'), 100);
  sesi.mulai();
  maju(150);
  assert.deepEqual(urutan, ['a']);
  maju(500);
  assert.deepEqual(urutan, ['a', 'b']);
});

test('a cancelled task never runs', () => {
  const { JK, maju } = muat();
  const sesi = new JK.Sesi();
  let jalan = false;
  const tugas = sesi.tunda(() => { jalan = true; }, 100);
  sesi.mulai();
  sesi.batal(tugas);
  maju(300);
  assert.equal(jalan, false);
});

test('a paused clock stands still and resumes where it stopped', () => {
  const { JK, maju } = muat();
  const sesi = new JK.Sesi();
  let jalan = false;
  sesi.tunda(() => { jalan = true; }, 300);
  sesi.mulai();
  maju(160);
  sesi.jeda();
  const saatJeda = sesi.t;
  maju(1000);
  assert.equal(sesi.t, saatJeda);
  assert.equal(jalan, false);
  sesi.mulai();
  maju(400);
  assert.equal(jalan, true);
});

test('a long gap between frames counts as at most 100 ms', () => {
  const { JK } = muat();
  const sesi = new JK.Sesi();
  sesi.jalan = true;
  sesi._langkah(1000);
  const awal = sesi.t;
  sesi._langkah(1000 + 60_000); // the tab was hidden for a minute
  assert.equal(sesi.t - awal, 100);
});

test('stopping drops every task, runs the cleanups, and cannot be undone', () => {
  const { JK, maju } = muat();
  const sesi = new JK.Sesi();
  let jalan = false;
  let bersih = 0;
  sesi.tunda(() => { jalan = true; }, 50);
  sesi.tiap(() => { jalan = true; });
  sesi.saatHenti(() => { bersih++; });
  sesi.henti();
  sesi.henti();
  sesi.mulai();
  maju(500);
  assert.equal(jalan, false);
  assert.equal(bersih, 1);
});

test('a task that stops the clock keeps later tasks from running', () => {
  const { JK, maju } = muat();
  const sesi = new JK.Sesi();
  let terlambat = false;
  sesi.tunda(() => sesi.henti(), 10);
  sesi.tunda(() => { terlambat = true; }, 10);
  sesi.mulai();
  maju(100);
  assert.equal(terlambat, false);
});

test('shuffling keeps every card and leaves the original alone', () => {
  const { JK } = muat();
  const asli = ['a', 'a', 'b', 'b', 'c', 'c'];
  const kocok = JK.kocok(asli);
  assert.deepEqual([...kocok].sort(), asli);
  assert.deepEqual(asli, ['a', 'a', 'b', 'b', 'c', 'c']);
});

test('stamps are saved and read back; broken or missing storage is survived', () => {
  const { JK, simpanan } = muat();
  JK.simpan.data.stempel.teh = 3;
  JK.simpan.data.suara = false;
  JK.simpan.tulis();

  const baru = muat({ ...simpanan }).JK;
  baru.simpan.baca();
  assert.deepEqual({ ...baru.simpan.data.stempel }, { teh: 3 });
  assert.equal(baru.simpan.data.suara, false);

  for (const rusak of ['{not json', '"teks"', 'null', '{"stempel":5,"suara":"ya"}']) {
    const { JK: j } = muat({ 'jelajah-kerinci-v1': rusak });
    j.simpan.baca();
    assert.deepEqual({ ...j.simpan.data.stempel }, {});
    assert.equal(j.simpan.data.suara, true);
  }
});
