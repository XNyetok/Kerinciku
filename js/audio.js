/*
 * Sound: effects, music and narration are recorded files in audio/, played
 * through Web Audio (docs/audio.md says how they were made).
 *
 * A file that has not arrived (a weak signal, or offline before it was stored)
 * never leaves the game silent: an effect falls back to a tone synthesised by
 * the browser, and narration to the device's own Indonesian voice.
 */
(function () {
  'use strict';
  var JK = window.JK;
  var DIR = 'audio/';

  // Effects (audio/sfx/<name>.mp3) and how loud each one plays.
  var SFX = {
    tap: 0.5, pick: 0.8, oops: 0.7, right: 0.8, star: 0.8, cheer: 0.7, splash: 0.8,
    shutter: 0.8, step: 0.7, flip: 0.7, gong: 1, drum: 1, rebana: 1, clap: 1
  };

  // Music (audio/music/<name>.mp3). Each file holds a loop of `length` seconds
  // followed by a repeat of its own beginning, and is looped between LEAD and
  // LEAD + length. Both ends lie inside the file, so the silence an mp3 decoder
  // adds before and after the sound never reaches the loop.
  var MUSIC = { map: { length: 30, gain: 0.22 }, play: { length: 32, gain: 0.2 } };
  var LEAD = 0.2;
  var DUCK = 0.3;          // the music's level while narration is heard
  var VOICE_WAIT = 2500;   // a clip slower than this gives way to the device's voice

  var ctx = null, out = null, noise = null;
  var enabled = true, touched = false;
  var bytes = {}, decoded = {}, buffers = {};
  var wanted = null, playing = null;
  var voice = null, voiceNo = 0;

  /* The audio context. Browsers start it only after a first touch (see unlock). */
  function context() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        out = ctx.createGain();
        out.connect(ctx.destination);
      } catch (e) {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
    return ctx;
  }

  /* Called on the first touch or key: from here on the page is allowed to make sound. */
  function unlock() {
    var first = !touched;
    touched = true;
    if (!context()) return null;
    if (first) {
      Object.keys(SFX).forEach(function (n) { buffer('sfx/' + n); });
      Object.keys(MUSIC).forEach(function (n) { buffer('music/' + n); });
    }
    syncMusic();
    return ctx;
  }

  /* ---------- Files ---------- */

  /* A file's bytes, or null when it cannot be had right now (the next call tries again). */
  function fetchBytes(path) {
    if (!window.fetch) return Promise.resolve(null);
    if (!bytes[path]) {
      bytes[path] = fetch(DIR + path + '.mp3')
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.arrayBuffer();
        })
        .catch(function () {
          delete bytes[path];
          return null;
        });
    }
    return bytes[path];
  }

  /* A file decoded and ready to play, or null. */
  function buffer(path) {
    if (!decoded[path]) {
      decoded[path] = fetchBytes(path).then(function (data) {
        if (!data || !ctx) return null;
        return new Promise(function (done) {
          // Decoding empties the buffer it is given, so it gets a copy.
          ctx.decodeAudioData(data.slice(0), done, function () { done(null); });
        });
      }).then(function (b) {
        if (b) buffers[path] = b;
        else delete decoded[path];
        return b;
      });
    }
    return decoded[path];
  }

  function voiceKeys() { return Object.keys(JK.voice || {}); }

  /* Everything the game can ask for, without the extension. */
  function files() {
    return Object.keys(SFX).map(function (n) { return 'sfx/' + n; })
      .concat(Object.keys(MUSIC).map(function (n) { return 'music/' + n; }))
      .concat(voiceKeys().map(function (n) { return 'voice/' + n; }));
  }

  /* Fetch the sounds ahead of their first use, one at a time, so they never crowd out a game's own files. */
  function preload() {
    var c = navigator.connection;
    // On a data-saving connection the narration is fetched only when it is asked for.
    var list = c && c.saveData ? files().filter(function (f) { return f.indexOf('voice/') !== 0; }) : files();
    (function next() {
      var path = list.shift();
      if (path) fetchBytes(path).then(next);
    })();
  }

  /* ---------- Effects ---------- */

  /* Play a recorded effect. False when it is not loaded yet: the caller synthesises a stand-in. */
  function play(name, rate, delay) {
    if (!enabled) return true;
    var c = context(), b = buffers['sfx/' + name];
    if (!c) return true;
    if (!b) {
      buffer('sfx/' + name);
      return false;
    }
    var s = c.createBufferSource(), g = c.createGain();
    s.buffer = b;
    s.playbackRate.value = rate || 1;
    g.gain.value = SFX[name];
    s.connect(g);
    g.connect(out);
    s.start(c.currentTime + (delay || 0));
    return true;
  }

  function tone(freq, start, length, type, gain, endFreq) {
    if (!enabled) return;
    var c = context();
    if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (start || 0);
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + length + 0.03);
  }

  function hiss(start, length, gain, freq) {
    if (!enabled) return;
    var c = context();
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
    g.connect(out);
    s.start(t);
    s.stop(t + length + 0.03);
  }

  // Each effect: the recording, or else the synthesised stand-in.
  var fx = {
    tap: function () { play('tap') || tone(660, 0, 0.08, 'triangle', 0.15); },
    pick: function () { play('pick') || tone(520, 0, 0.1, 'triangle', 0.22, 900); },
    // Two notes from one recording: down for a slip, up for a right answer.
    oops: function () {
      if (play('oops')) play('oops', 0.75, 0.13);
      else tone(230, 0, 0.2, 'triangle', 0.16, 150);
    },
    right: function () {
      if (play('right')) {
        play('right', 1.5, 0.11);
        return;
      }
      tone(523, 0, 0.12, 'triangle', 0.2);
      tone(784, 0.11, 0.2, 'triangle', 0.2);
    },
    // The three stars climb a major chord: the same chime, played faster.
    star: function (i) { play('star', [1, 1.26, 1.5][i] || 1) || tone([659, 784, 1047][i] || 880, 0, 0.28, 'triangle', 0.22); },
    cheer: function () {
      if (play('cheer')) return;
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.13, 0.32, 'triangle', 0.2); });
    },
    splash: function () {
      if (play('splash')) return;
      hiss(0, 0.22, 0.3, 900);
      tone(700, 0, 0.12, 'sine', 0.12, 1100);
    },
    shutter: function () {
      if (play('shutter')) return;
      hiss(0, 0.05, 0.4, 3200);
      hiss(0.09, 0.05, 0.3, 2200);
    },
    // No two steps in a row sound quite the same.
    step: function (n) { play('step', 0.92 + (n % 4) * 0.05) || tone(280 + n * 10, 0, 0.07, 'triangle', 0.14); },
    flip: function () { play('flip') || hiss(0, 0.06, 0.15, 2600); },
    gong: function () {
      if (play('gong')) return;
      tone(110, 0, 1.1, 'sine', 0.42);
      tone(220, 0, 0.8, 'sine', 0.14);
      tone(331, 0, 0.45, 'sine', 0.06);
    },
    drum: function () {
      if (play('drum')) return;
      tone(170, 0, 0.24, 'sine', 0.5, 72);
      hiss(0, 0.05, 0.16, 700);
    },
    rebana: function () {
      if (play('rebana')) return;
      tone(330, 0, 0.14, 'triangle', 0.34, 210);
      hiss(0, 0.09, 0.2, 4200);
    },
    clap: function () {
      if (play('clap')) return;
      hiss(0, 0.07, 0.45, 1500);
      hiss(0.014, 0.06, 0.32, 1900);
    }
  };

  /* ---------- Music ---------- */

  function level(g, value, seconds) {
    var t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(value, t + seconds);
  }

  /* Make what is heard match what is wanted: one loop at a time, faded in and out. */
  function syncMusic() {
    var want = enabled && touched ? wanted : null;
    if (!ctx || (playing && playing.name === want)) return;
    if (playing) {
      var old = playing;
      playing = null;
      level(old.gain, 0, 0.4);
      try { old.source.stop(ctx.currentTime + 0.45); } catch (e) { /* ignore */ }
    }
    if (!want) return;
    var b = buffers['music/' + want];
    if (!b) {
      buffer('music/' + want).then(function (loaded) { if (loaded) syncMusic(); });
      return;
    }
    var m = MUSIC[want], s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b;
    s.loop = true;
    s.loopStart = LEAD;
    s.loopEnd = LEAD + m.length;
    g.gain.value = 0;
    s.connect(g);
    g.connect(out);
    s.start(0, LEAD);
    playing = { name: want, source: s, gain: g };
    level(g, m.gain * (voice ? DUCK : 1), 0.8);
  }

  /* Ask for a loop by name, or for silence. It starts once the page may make sound. */
  function music(name) {
    wanted = MUSIC[name] ? name : null;
    syncMusic();
  }

  function duck(down) {
    if (playing) level(playing.gain, MUSIC[playing.name].gain * (down ? DUCK : 1), 0.25);
  }

  /* ---------- Narration ---------- */

  /* Read a text aloud with the device's own voice, when it has an Indonesian one. */
  function deviceVoice(text) {
    var ss = window.speechSynthesis;
    if (!enabled || !text || !ss || !window.SpeechSynthesisUtterance) return;
    try {
      var voices = ss.getVoices() || [], found = null;
      for (var i = 0; i < voices.length; i++) {
        if (/^id([-_]|$)/i.test(voices[i].lang)) { found = voices[i]; break; }
      }
      // The device lists its voices and none is Indonesian: staying silent is
      // better than reading Indonesian with another language's accent.
      if (voices.length && !found) return;
      ss.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      if (found) u.voice = found;
      u.rate = 0.9;
      ss.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* Say one of the lines in JK.voice: the recorded clip, or else the device's voice. */
  function speak(key) {
    hush();
    var text = (JK.voice || {})[key];
    // Before the first touch nothing may sound, and a line that starts late is worse than none.
    if (!enabled || !touched || !text) return;
    var c = context(), n = voiceNo;
    if (!c) {
      deviceVoice(text);
      return;
    }
    var late = setTimeout(function () {
      if (n !== voiceNo) return;
      voiceNo++;
      deviceVoice(text);
    }, VOICE_WAIT);
    buffer('voice/' + key).then(function (b) {
      if (n !== voiceNo) return;
      clearTimeout(late);
      if (!b) {
        deviceVoice(text);
        return;
      }
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(out);
      s.onended = function () {
        if (voice !== s) return;
        voice = null;
        duck(false);
      };
      voice = s;
      duck(true);
      s.start();
    });
  }

  function hush() {
    voiceNo++;
    if (voice) {
      var s = voice;
      voice = null;
      s.onended = null;
      try { s.stop(); } catch (e) { /* ignore */ }
      duck(false);
    }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }

  /* ---------- Start ---------- */

  // A phone in a pocket must not keep playing: no sound while the page is hidden.
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try {
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    } catch (e) { /* ignore */ }
  });

  // After the page itself has loaded, so the sounds do not slow down the first screen.
  window.addEventListener('load', preload);

  JK.audio = {
    fx: fx,
    speak: speak,
    hush: hush,
    music: music,
    unlock: unlock,
    files: files,
    setEnabled: function (v) {
      enabled = !!v;
      if (!enabled) hush();
      syncMusic();
    },
    // For the tests: what is loaded and what is playing.
    status: function () {
      return { music: playing ? playing.name : null, loaded: Object.keys(buffers).sort(), speaking: !!voice };
    }
  };
})();
