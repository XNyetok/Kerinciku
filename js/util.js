/* Shared helpers: element builder, randomness, saved progress, and the game clock. */
(function () {
  'use strict';
  var JK = window.JK;
  JK.game = {};

  JK.el = function (tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html) e.innerHTML = html;
    return e;
  };

  JK.rand = function (n) { return Math.floor(Math.random() * n); };

  JK.shuffle = function (list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = JK.rand(i + 1), t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  /* A fast tap: reacts when the finger lands, not when it lifts. */
  JK.onTap = function (el, fn) {
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

  /* Restart a CSS animation on an element. */
  JK.replay = function (el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  };

  /* ---------- Saved progress (stamps and settings) ---------- */

  var SAVED_AS = 'jelajah-kerinci-v1';

  // Version 0.1.0 saved Indonesian field names and place ids under the same key.
  var OLD_IDS = { teh: 'tea', danau: 'lake', rimba: 'forest', rentak: 'rhythm', pasar: 'market', gunung: 'mountain' };

  function stampsFrom(saved) {
    var stamps = {};
    if (!saved || typeof saved !== 'object') return stamps;
    Object.keys(saved).forEach(function (id) {
      var stars = saved[id];
      if (typeof stars === 'number' && stars >= 1 && stars <= 3) stamps[OLD_IDS[id] || id] = stars;
    });
    return stamps;
  }

  JK.store = {
    data: { stamps: {}, sound: true },
    read: function () {
      try {
        var d = JSON.parse(localStorage.getItem(SAVED_AS));
        if (d && typeof d === 'object') {
          this.data.stamps = stampsFrom(d.stamps || d.stempel);
          var sound = 'sound' in d ? d.sound : d.suara;
          if (typeof sound === 'boolean') this.data.sound = sound;
        }
      } catch (e) { /* storage is unavailable: play without saving */ }
    },
    write: function () {
      try { localStorage.setItem(SAVED_AS, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }
  };

  /*
   * The game clock. Every delay and every movement inside a game runs on it,
   * so a game stops by itself while the tab is hidden or paused, and every
   * pending task disappears when the child leaves the game.
   */
  JK.Clock = function () {
    this.t = 0;
    this.running = false;
    this.dead = false;
    this._tasks = [];
    this._each = [];
    this._onStop = [];
    this._last = null;
    this._raf = 0;
    var self = this;
    this._tick = function (ts) { self._step(ts); };
  };

  var P = JK.Clock.prototype;

  P.start = function () {
    if (this.dead || this.running) return;
    this.running = true;
    this._last = null;
    this._raf = requestAnimationFrame(this._tick);
  };

  P.pause = function () {
    this.running = false;
    cancelAnimationFrame(this._raf);
  };

  P.stop = function () {
    if (this.dead) return;
    this.pause();
    this.dead = true;
    this._tasks = [];
    this._each = [];
    this._onStop.forEach(function (f) { f(); });
    this._onStop = [];
  };

  /* Run fn once, ms of game time from now. Returns a handle for cancel(). */
  P.after = function (fn, ms) {
    var task = { at: this.t + ms, fn: fn };
    this._tasks.push(task);
    return task;
  };

  P.cancel = function (task) {
    var i = this._tasks.indexOf(task);
    if (i >= 0) this._tasks.splice(i, 1);
  };

  /* Run fn(dt, t) on every frame. */
  P.each = function (fn) { this._each.push(fn); };

  P.onStop = function (fn) { this._onStop.push(fn); };

  P._step = function (ts) {
    if (!this.running) return;
    var dt = this._last === null ? 16 : Math.min(ts - this._last, 100);
    this._last = ts;
    this.t += dt;

    var due = [], later = [], i;
    for (i = 0; i < this._tasks.length; i++) {
      (this._tasks[i].at <= this.t ? due : later).push(this._tasks[i]);
    }
    this._tasks = later;
    due.sort(function (a, b) { return a.at - b.at; });
    for (i = 0; i < due.length && !this.dead; i++) due[i].fn();

    var each = this._each;
    for (i = 0; i < each.length && !this.dead; i++) each[i](dt, this.t);

    if (this.running) this._raf = requestAnimationFrame(this._tick);
  };
})();
