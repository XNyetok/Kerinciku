/* Alat bantu bersama: pembuat elemen, acak, simpanan, dan jam permainan. */
(function () {
  'use strict';
  var JK = window.JK;
  JK.game = {};

  JK.el = function (tag, kelas, html) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (html) e.innerHTML = html;
    return e;
  };

  JK.acak = function (n) { return Math.floor(Math.random() * n); };

  JK.kocok = function (daftar) {
    var a = daftar.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = JK.acak(i + 1), t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  /* Sentuhan cepat: bereaksi saat jari menyentuh, bukan saat dilepas. */
  JK.ketuk = function (el, fn) {
    el.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      e.preventDefault();
      fn(e);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn(e);
      }
    });
  };

  /* Putar ulang animasi CSS pada sebuah elemen. */
  JK.kilas = function (el, kelas) {
    el.classList.remove(kelas);
    void el.offsetWidth;
    el.classList.add(kelas);
  };

  /* ---------- Simpanan (stempel dan setelan) ---------- */
  var KUNCI = 'jelajah-kerinci-v1';
  JK.simpan = {
    data: { stempel: {}, suara: true },
    baca: function () {
      try {
        var d = JSON.parse(localStorage.getItem(KUNCI));
        if (d && typeof d === 'object') {
          if (d.stempel && typeof d.stempel === 'object') this.data.stempel = d.stempel;
          if (typeof d.suara === 'boolean') this.data.suara = d.suara;
        }
      } catch (e) { /* penyimpanan tidak tersedia: main tanpa simpanan */ }
    },
    tulis: function () {
      try { localStorage.setItem(KUNCI, JSON.stringify(this.data)); } catch (e) { /* abaikan */ }
    }
  };

  /*
   * Jam permainan. Semua jeda dan gerak di dalam game memakai jam ini,
   * sehingga permainan otomatis berhenti saat tab disembunyikan atau dijeda
   * dan semua tugas hilang saat anak keluar dari game.
   */
  JK.Sesi = function () {
    this.t = 0;
    this.jalan = false;
    this.mati = false;
    this._tugas = [];
    this._tiap = [];
    this._henti = [];
    this._akhir = null;
    this._raf = 0;
    var s = this;
    this._putar = function (ts) { s._langkah(ts); };
  };

  var P = JK.Sesi.prototype;

  P.mulai = function () {
    if (this.mati || this.jalan) return;
    this.jalan = true;
    this._akhir = null;
    this._raf = requestAnimationFrame(this._putar);
  };

  P.jeda = function () {
    this.jalan = false;
    cancelAnimationFrame(this._raf);
  };

  P.henti = function () {
    if (this.mati) return;
    this.jeda();
    this.mati = true;
    this._tugas = [];
    this._tiap = [];
    this._henti.forEach(function (f) { f(); });
    this._henti = [];
  };

  P.tunda = function (fn, ms) {
    var k = { pada: this.t + ms, fn: fn };
    this._tugas.push(k);
    return k;
  };

  P.batal = function (k) {
    var i = this._tugas.indexOf(k);
    if (i >= 0) this._tugas.splice(i, 1);
  };

  P.tiap = function (fn) { this._tiap.push(fn); };

  P.saatHenti = function (fn) { this._henti.push(fn); };

  P._langkah = function (ts) {
    if (!this.jalan) return;
    var dt = this._akhir === null ? 16 : Math.min(ts - this._akhir, 100);
    this._akhir = ts;
    this.t += dt;

    var siap = [], sisa = [], i;
    for (i = 0; i < this._tugas.length; i++) {
      (this._tugas[i].pada <= this.t ? siap : sisa).push(this._tugas[i]);
    }
    this._tugas = sisa;
    siap.sort(function (a, b) { return a.pada - b.pada; });
    for (i = 0; i < siap.length && !this.mati; i++) siap[i].fn();

    var tiap = this._tiap;
    for (i = 0; i < tiap.length && !this.mati; i++) tiap[i](dt, this.t);

    if (this.jalan) this._raf = requestAnimationFrame(this._putar);
  };
})();
