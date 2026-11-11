/* Sounds are synthesised by the browser (Web Audio), so there are no sound files to download. */
(function () {
  'use strict';
  var JK = window.JK;
  var ctx = null, enabled = true, noise = null;

  /* Create or resume the audio context. Browsers allow this only after a first touch. */
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, length, type, gain, endFreq) {
    if (!enabled) return;
    var c = unlock();
    if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (start || 0);
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + length + 0.03);
  }

  function hiss(start, length, gain, freq) {
    if (!enabled) return;
    var c = unlock();
    if (!c) return;
    if (!noise) {
      noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + (start || 0);
    s.buffer = noise;
    f.type = 'bandpass';
    f.frequency.value = freq || 1200;
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start(t);
    s.stop(t + length + 0.03);
  }

  var fx = {
    tap: function () { tone(660, 0, 0.08, 'triangle', 0.15); },
    pick: function () { tone(520, 0, 0.1, 'triangle', 0.22, 900); },
    oops: function () { tone(230, 0, 0.2, 'triangle', 0.16, 150); },
    right: function () { tone(523, 0, 0.12, 'triangle', 0.2); tone(784, 0.11, 0.2, 'triangle', 0.2); },
    star: function (i) { tone([659, 784, 1047][i] || 880, 0, 0.28, 'triangle', 0.22); },
    cheer: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.13, 0.32, 'triangle', 0.2); }); },
    splash: function () { hiss(0, 0.22, 0.3, 900); tone(700, 0, 0.12, 'sine', 0.12, 1100); },
    shutter: function () { hiss(0, 0.05, 0.4, 3200); hiss(0.09, 0.05, 0.3, 2200); },
    step: function (n) { tone(280 + n * 10, 0, 0.07, 'triangle', 0.14); },
    flip: function () { hiss(0, 0.06, 0.15, 2600); },
    gong: function () { tone(110, 0, 1.1, 'sine', 0.42); tone(220, 0, 0.8, 'sine', 0.14); tone(331, 0, 0.45, 'sine', 0.06); },
    drum: function () { tone(170, 0, 0.24, 'sine', 0.5, 72); hiss(0, 0.05, 0.16, 700); },
    rebana: function () { tone(330, 0, 0.14, 'triangle', 0.34, 210); hiss(0, 0.09, 0.2, 4200); },
    clap: function () { hiss(0, 0.07, 0.45, 1500); hiss(0.014, 0.06, 0.32, 1900); }
  };

  /* Read a text aloud when the device has an Indonesian voice. */
  function speak(text) {
    var ss = window.speechSynthesis;
    if (!enabled || !ss || !window.SpeechSynthesisUtterance) return;
    try {
      var voices = ss.getVoices() || [], voice = null;
      for (var i = 0; i < voices.length; i++) {
        if (/^id([-_]|$)/i.test(voices[i].lang)) { voice = voices[i]; break; }
      }
      // The device lists its voices and none is Indonesian: staying silent is
      // better than reading Indonesian with another language's accent.
      if (voices.length && !voice) return;
      ss.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      if (voice) u.voice = voice;
      u.rate = 0.9;
      ss.speak(u);
    } catch (e) { /* ignore */ }
  }

  function hush() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }

  JK.audio = {
    fx: fx,
    speak: speak,
    hush: hush,
    unlock: unlock,
    setEnabled: function (v) { enabled = !!v; if (!enabled) hush(); }
  };
})();
