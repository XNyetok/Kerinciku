/* The main flow: title -> map -> introduction -> game -> result, plus the stamp book. */
(function () {
  'use strict';
  var JK = window.JK, T = JK.text, S = JK.art, A = JK.audio, D = JK.store;
  var app = document.getElementById('app');
  var clock = null;       // the clock of the game that is running
  var screenNo = 0;       // goes up on every screen change, to drop delays left behind
  var screenName = '';
  var newVersion = false;
  var said = {};          // the map lines Belang has already said aloud since the page opened
  var OPEN = JK.places.filter(function (l) { return !l.soon; });

  function $(s) { return app.querySelector(s); }
  function find(id) { return JK.places.filter(function (l) { return l.id === id; })[0]; }
  // A place that is not open yet shows no stamp, even one saved while it was open.
  function starsAt(l) { return l.soon ? 0 : D.data.stamps[l.id] || 0; }
  function has(l) { return starsAt(l) > 0; }
  function stampCount() { return OPEN.filter(has).length; }

  function show(className, html) {
    if (clock) { clock.stop(); clock = null; }
    A.hush();
    screenNo++;
    app.innerHTML = '<section class="screen ' + className + '">' + html + '</section>';
    screenName = className.split(' ')[0];
    // A calm loop everywhere, a livelier one in a game. The rhythm game makes its own music.
    A.music(screenName !== 'game' ? 'map' : / game-rhythm$/.test(className) ? '' : 'play');
    loadNewVersion();
    return app.firstElementChild;
  }

  /* A place's colour is set through the CSSOM, not a style attribute, so it passes a strict CSP. */
  function tint(el, color) { el.style.setProperty('--color', color); }

  /* A new version has been downloaded: reload, but only on the title or the map, never mid-game. */
  function loadNewVersion() {
    if (newVersion && (screenName === 'home' || screenName === 'map')) {
      newVersion = false;
      location.reload();
    }
  }

  /* Run fn after ms, unless the screen has changed in the meantime. */
  function later(fn, ms) {
    var n = screenNo;
    setTimeout(function () { if (n === screenNo) fn(); }, ms);
  }

  function roundButton(id, icon, label) {
    return '<button class="btn-round" id="' + id + '" type="button" aria-label="' + label + '">' + S.icon(icon) + '</button>';
  }

  function soundButton() {
    return '<button class="btn-round" id="sound" type="button" aria-label="' + T.sound + '" aria-pressed="' + D.data.sound + '">' +
      S.icon(D.data.sound ? 'soundOn' : 'soundOff') + '</button>';
  }

  function wireSound() {
    var b = $('#sound');
    if (!b) return;
    b.onclick = function () {
      D.data.sound = !D.data.sound;
      D.write();
      A.setEnabled(D.data.sound);
      b.innerHTML = S.icon(D.data.sound ? 'soundOn' : 'soundOff');
      b.setAttribute('aria-pressed', D.data.sound);
      A.fx.tap();
    };
  }

  function stars(n, className) {
    var s = '';
    for (var i = 0; i < 3; i++) {
      s += '<span class="star' + (i < n ? ' got' : '') + '">' + S.icon('star') + '</span>';
    }
    return '<div class="' + className + '" role="img" aria-label="' + T.starsOf(n) + '">' + s + '</div>';
  }

  function factCard(l) {
    return '<div class="fact-head"><h3>' + T.didYouKnow + '</h3>' +
      '<button class="btn-listen" id="listen" type="button" aria-label="' + T.listen + '">' + S.icon('soundOn') + '</button></div>' +
      '<p>' + l.fact + '</p>' +
      '<p class="word"><span>' + T.kerinciWord + '</span> <b>' + l.word.kerinci + '</b> ' + T.means + ' ' + l.word.meaning + '</p>';
  }

  function readFact(l) { A.speak('fact-' + l.id); }

  /* A yes/no dialog. */
  function ask(question, onYes, onNo) {
    var o = JK.el('div', 'overlay',
      '<div class="dialog" role="dialog" aria-modal="true" aria-label="' + question + '"><p>' + question + '</p><div class="row">' +
      '<button class="btn btn-alt" type="button" data-answer="no">' + T.no + '</button>' +
      '<button class="btn" type="button" data-answer="yes">' + T.yes + '</button></div></div>');
    app.firstElementChild.appendChild(o);
    o.querySelector('[data-answer="no"]').focus();
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      o.remove();
      A.fx.tap();
      if (b.getAttribute('data-answer') === 'yes') onYes();
      else if (onNo) onNo();
    });
  }

  /* ---------- Moving between screens (the phone's back button works too) ---------- */

  // History depth: 0 the title, 1 the map, 2 anything deeper.
  function depth() { return history.state && history.state.t || 0; }
  function push(t) { try { history.pushState({ t: t }, ''); } catch (e) { /* ignore */ } }

  function goHome() {
    if (depth() >= 1) history.go(-depth());
    else home();
  }

  function goMap() {
    if (depth() === 2) history.back();
    else {
      if (depth() !== 1) push(1);
      map();
    }
  }

  function goDeeper(fn) {
    if (depth() === 0) push(1);
    if (depth() !== 2) push(2);
    fn();
  }

  window.addEventListener('popstate', function () {
    if (depth() >= 1) map();
    else home();
  });

  /* ---------- Title ---------- */

  function home() {
    show('home',
      S.scenes.home +
      '<header class="bar"><span></span>' + soundButton() + '</header>' +
      '<div class="home-body"><p class="greeting">' + T.greeting + '</p>' +
      '<h1>' + T.title[0] + '<br>' + T.title[1] + '</h1>' +
      '<p class="invite">' + T.invite + '</p></div>' +
      '<div class="home-footer">' + S.icon('tiger', 'mascot') +
      '<button class="btn btn-big" id="play" type="button">' + S.icon('play') + T.play + '</button>' +
      '<p class="version">' + (JK.version === 'dev' ? '' : 'v' + JK.version.split('+')[0]) + '</p>' +
      '<p class="credit">' + T.credit + ' <a href="https://' + T.creditSite + '" target="_blank" rel="noopener">' + T.creditSite + '</a></p></div>');
    wireSound();
    $('#play').onclick = function () {
      A.fx.tap();
      goMap();
    };
  }

  /* ---------- Map ---------- */

  function map() {
    var status = {};
    JK.places.forEach(function (l) {
      status[l.id] = { stars: starsAt(l), locked: !!l.soon };
    });
    var n = stampCount(), total = OPEN.length;
    var line = n === total ? 'map-done' : 'map-ask';
    var say = JK.voice[line];

    show('map',
      '<header class="bar">' + roundButton('home', 'home', T.toHome) +
      '<button class="badge" id="book" type="button" aria-label="' + T.bookAria(n, total) + '">' +
      S.icon('star') + '<span>' + T.stamps + ' ' + n + '/' + total + '</span></button>' + soundButton() + '</header>' +
      '<div class="map-wrap">' + S.map(status) + '</div>' +
      '<div class="bubble">' + S.icon('tiger', 'mascot') + '<p id="say" aria-live="polite">' + say + '</p></div>');
    wireSound();
    $('#home').onclick = function () { A.fx.tap(); goHome(); };
    $('#book').onclick = function () { A.fx.tap(); goDeeper(book); };
    // Belang says each line once, not every time the map comes back.
    if (!said[line]) {
      said[line] = true;
      A.speak(line);
    }

    function choose(id) {
      var l = find(id);
      if (l.soon) {
        A.fx.oops();
        $('#say').textContent = T.mapLocked;
        JK.replay($('.bubble'), 'shake');
        return;
      }
      A.fx.tap();
      goDeeper(function () { intro(id); });
    }

    [].forEach.call(app.querySelectorAll('.pin'), function (p) {
      var id = p.getAttribute('data-id');
      p.addEventListener('click', function () { choose(id); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(id); }
      });
    });
  }

  /* ---------- Introduction to a place ---------- */

  function intro(id) {
    var l = find(id);
    show('intro',
      '<header class="bar">' + roundButton('back', 'back', T.toMap) + '<span></span>' + soundButton() + '</header>' +
      '<div class="intro-body">' +
      '<div class="intro-art">' + S.icon(l.icon) + '</div>' +
      '<p class="place">' + l.place + '</p><h2>' + l.title + '</h2><p class="how">' + l.how + '</p>' +
      '<button class="btn-text" id="listen" type="button">' + S.icon('soundOn') + T.listen + '</button></div>' +
      '<div class="footer"><button class="btn btn-big" id="start" type="button">' + S.icon('play') + T.start + '</button></div>');
    tint($('.intro-body'), l.color);
    wireSound();
    var read = function () { A.speak('intro-' + id); };
    $('#back').onclick = function () { A.fx.tap(); goMap(); };
    $('#listen').onclick = read;
    $('#start').onclick = function () { A.fx.tap(); play(id); };
    read();
  }

  /* ---------- Game ---------- */

  function play(id) {
    var l = find(id);
    if (typeof JK.game[id] !== 'function') {
      // This game's file did not load: offer a reload rather than leave a frozen screen.
      var failed = document.getElementById('load-failed');
      if (failed) failed.hidden = false;
      return;
    }
    show('game game-' + id,
      '<header class="bar hud">' + roundButton('quit', 'close', T.toMap) +
      '<div class="hud-bar"><i id="bar"></i></div>' +
      '<div class="hud-score">' + S.icon(l.icon) + '<b id="score">0</b></div></header>' +
      '<div class="stage" id="stage"></div>' +
      '<div class="countdown" id="countdown"><span>' + T.ready + '</span></div>');

    var c = clock = new JK.Clock();
    var bar = $('#bar'), score = $('#score'), countdown = $('#countdown'), finished = false, started = false;

    JK.game[id]({
      stage: $('#stage'),
      clock: c,
      score: function (v) {
        score.textContent = v;
        JK.replay(score.parentNode, 'pulse');
      },
      progress: function (f) { bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, f)) + ')'; },
      finish: function (outcome) {
        if (finished) return;
        finished = true;
        c.stop();
        later(function () { result(id, outcome); }, 500);
      }
    });

    later(function () {
      countdown.innerHTML = '<span>' + T.go + '</span>';
      A.fx.right();
    }, 800);
    later(function () {
      countdown.remove();
      started = true;
      if (!held) c.start();
    }, 1400);

    // The quit button pauses the game and asks first, so a stray tap does not throw the game away.
    var held = false;
    $('#quit').onclick = function () {
      if (finished || held) return;
      held = true;
      A.fx.tap();
      c.pause();
      ask(T.quitAsk, goMap, function () {
        held = false;
        if (started) c.start();
      });
    };
  }

  /* ---------- Result ---------- */

  function result(id, outcome) {
    var l = find(id), before = starsAt(l);
    var wasDone = stampCount() === OPEN.length;
    if (!l.soon && outcome.stars > before) {
      D.data.stamps[id] = outcome.stars;
      D.write();
    }
    var note = !wasDone && stampCount() === OPEN.length ? T.allDone : '';

    var el = show('result',
      '<div class="result-body">' +
      stars(outcome.stars, 'result-stars') +
      '<div class="stamp' + (before ? '' : ' new') + '">' + S.icon(l.icon) + (before ? '' : '<span>' + T.newStamp + '</span>') + '</div>' +
      '<h2>' + T.praise[outcome.stars] + '</h2><p class="result-message">' + outcome.message + '</p>' +
      (note ? '<p class="result-note">' + note + '</p>' : '') +
      '<div class="fact-card">' + factCard(l) + '</div></div>' +
      '<div class="footer two"><button class="btn btn-alt" id="again" type="button">' + S.icon('redo') + T.again + '</button>' +
      '<button class="btn" id="to-map" type="button">' + S.icon('pin') + T.toMap + '</button></div>');

    tint($('.result-body'), l.color);
    $('#again').onclick = function () { A.fx.tap(); play(id); };
    $('#to-map').onclick = function () { A.fx.tap(); goMap(); };
    $('#listen').onclick = function () { readFact(l); };

    // One after another, so nothing talks over anything else: the stars, the praise, the jingle.
    for (var i = 0; i < outcome.stars; i++) (function (k) { later(function () { A.fx.star(k); }, 250 + k * 350); })(i);
    var afterStars = 250 + outcome.stars * 350 + 150;
    later(function () { A.speak('praise-' + outcome.stars); }, afterStars);
    if (!before) {
      later(A.fx.cheer, afterStars + 800);
      confetti(el);
    }
  }

  function confetti(el) {
    var colors = ['#ffc93c', '#e8553d', '#3fae5a', '#2f7fd1', '#fff'], box = JK.el('div', 'confetti');
    for (var i = 0; i < 28; i++) {
      var piece = JK.el('i');
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 0.9) + 's';
      piece.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      box.appendChild(piece);
    }
    el.appendChild(box);
  }

  /* ---------- Stamp book ---------- */

  function book() {
    show('book',
      '<header class="bar">' + roundButton('back', 'back', T.toMap) + '<h2>' + T.bookTitle + '</h2>' + soundButton() + '</header>' +
      '<div class="book-body"><div class="book-grid">' + JK.places.map(function (l) {
        var n = starsAt(l);
        return '<button type="button" class="stamp-tile' + (n ? ' owned' : '') + '" data-id="' + l.id +
          '" aria-label="' + T.stampAria(l.place, n) + '">' +
          '<span class="stamp">' + S.icon(n ? l.icon : 'question') + '</span><span class="stamp-name">' + l.short + '</span>' +
          stars(n, 'stamp-stars') + '</button>';
      }).join('') + '</div>' +
      '<div class="fact-card" id="detail" aria-live="polite"><p>' + T.bookPick + '</p></div>' +
      '<button class="btn-text" id="reset" type="button">' + S.icon('redo') + T.reset + '</button></div>');
    wireSound();
    $('#back').onclick = function () { A.fx.tap(); goMap(); };
    $('#reset').onclick = function () {
      ask(T.resetAsk, function () {
        D.data.stamps = {};
        D.write();
        book();
      });
    };
    [].forEach.call(app.querySelectorAll('.stamp-tile'), function (b) {
      tint(b, find(b.getAttribute('data-id')).color);
      b.onclick = function () {
        var l = find(b.getAttribute('data-id')), detail = $('#detail');
        A.fx.tap();
        [].forEach.call(app.querySelectorAll('.stamp-tile'), function (x) { x.classList.toggle('picked', x === b); });
        if (!has(l)) {
          detail.innerHTML = '<h3>' + l.place + '</h3><p>' + (l.soon ? T.bookSoon : T.bookEmpty) + '</p>';
          return;
        }
        detail.innerHTML = factCard(l);
        $('#listen').onclick = function () { readFact(l); };
      };
    });
  }

  /* ---------- Start ---------- */

  D.read();
  A.setEnabled(D.data.sound);
  // Browsers allow sound only after a first touch.
  document.addEventListener('pointerdown', function () { A.unlock(); }, { passive: true });
  document.addEventListener('keydown', function () { A.unlock(); });
  // No context menu when a child presses for a long time.
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  if (depth() >= 1) map();
  else home();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // When a new service worker takes over, the open page still runs the old files.
    var controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!controlled) { controlled = true; return; } // the first install: nothing to reload
      newVersion = true;
      loadNewVersion();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* the game still plays, just not offline */ });
    });
  }

  // A side door for tests: opens a screen directly from the browser console.
  JK.debug = { map: map, play: play, result: result, book: book, intro: intro };
})();
