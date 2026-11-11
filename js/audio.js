/* Bunyi dibuat langsung oleh peramban (Web Audio), jadi tidak ada berkas suara yang perlu diunduh. */
(function () {
  'use strict';
  var JK = window.JK;
  var ctx = null, nyala = true, derau = null;

  function siap() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function nada(f, mulai, lama, jenis, kuat, f2) {
    if (!nyala) return;
    var c = siap();
    if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (mulai || 0);
    o.type = jenis || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + lama);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kuat || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + lama + 0.03);
  }

  function desis(mulai, lama, kuat, frek) {
    if (!nyala) return;
    var c = siap();
    if (!c) return;
    if (!derau) {
      derau = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
      var d = derau.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + (mulai || 0);
    s.buffer = derau;
    f.type = 'bandpass';
    f.frequency.value = frek || 1200;
    g.gain.setValueAtTime(kuat || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start(t);
    s.stop(t + lama + 0.03);
  }

  var efek = {
    ketuk: function () { nada(660, 0, 0.08, 'triangle', 0.15); },
    petik: function () { nada(520, 0, 0.1, 'triangle', 0.22, 900); },
    ups: function () { nada(230, 0, 0.2, 'triangle', 0.16, 150); },
    benar: function () { nada(523, 0, 0.12, 'triangle', 0.2); nada(784, 0.11, 0.2, 'triangle', 0.2); },
    bintang: function (i) { nada([659, 784, 1047][i] || 880, 0, 0.28, 'triangle', 0.22); },
    sorak: function () { [523, 659, 784, 1047].forEach(function (f, i) { nada(f, i * 0.13, 0.32, 'triangle', 0.2); }); },
    cebur: function () { desis(0, 0.22, 0.3, 900); nada(700, 0, 0.12, 'sine', 0.12, 1100); },
    jepret: function () { desis(0, 0.05, 0.4, 3200); desis(0.09, 0.05, 0.3, 2200); },
    langkah: function (n) { nada(280 + n * 10, 0, 0.07, 'triangle', 0.14); },
    balik: function () { desis(0, 0.06, 0.15, 2600); },
    gong: function () { nada(110, 0, 1.1, 'sine', 0.42); nada(220, 0, 0.8, 'sine', 0.14); nada(331, 0, 0.45, 'sine', 0.06); },
    gendang: function () { nada(170, 0, 0.24, 'sine', 0.5, 72); desis(0, 0.05, 0.16, 700); },
    rebana: function () { nada(330, 0, 0.14, 'triangle', 0.34, 210); desis(0, 0.09, 0.2, 4200); },
    tepuk: function () { desis(0, 0.07, 0.45, 1500); desis(0.014, 0.06, 0.32, 1900); }
  };

  /* Bacakan teks bila perangkat punya suara bahasa Indonesia. */
  function bicara(teks) {
    var ss = window.speechSynthesis;
    if (!nyala || !ss || !window.SpeechSynthesisUtterance) return;
    try {
      var suara = ss.getVoices() || [], pilih = null;
      for (var i = 0; i < suara.length; i++) {
        if (/^id([-_]|$)/i.test(suara[i].lang)) { pilih = suara[i]; break; }
      }
      // Daftar suara ada tetapi tidak ada bahasa Indonesia: lebih baik diam
      // daripada dibacakan dengan logat bahasa lain.
      if (suara.length && !pilih) return;
      ss.cancel();
      var u = new SpeechSynthesisUtterance(teks);
      u.lang = 'id-ID';
      if (pilih) u.voice = pilih;
      u.rate = 0.9;
      ss.speak(u);
    } catch (e) { /* abaikan */ }
  }

  function diam() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
  }

  JK.audio = {
    efek: efek,
    bicara: bicara,
    diam: diam,
    siap: siap,
    atur: function (v) { nyala = !!v; if (!nyala) diam(); }
  };
})();
