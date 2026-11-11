/* Wildlife photos (the national park): animals peek out of the bushes, tap to photograph them. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.art, A = JK.audio;
  var DURATION = 60000;
  var ANIMALS = ['tiger', 'tapir', 'bear', 'hornbill', 'siamang'];
  var SPOTS = [[6, 10], [62, 6], [34, 30], [66, 40], [4, 50], [38, 60]]; // left %, top %

  JK.game.forest = function (g) {
    var T = JK.text, over = false, taken = {}, count = 0, spots = [], quietUntil = 0;

    g.stage.innerHTML = S.scenes.forest + '<div class="flash"></div>' +
      '<div class="album">' + ANIMALS.map(function (n) {
        return '<span class="slot" data-animal="' + n + '">' + S.icon(n) + '</span>';
      }).join('') + '</div><div class="photo" aria-live="polite"></div>';
    var flash = g.stage.querySelector('.flash'), photo = g.stage.querySelector('.photo');
    g.score('0/' + ANIMALS.length);

    SPOTS.forEach(function (p) {
      var b = JK.el('button', 'spot', '<span class="spot-animal"></span>' + S.icon('bush', 'spot-bush'));
      b.type = 'button';
      b.style.left = p[0] + '%';
      b.style.top = p[1] + '%';
      b.setAttribute('aria-label', T.forest.bush);
      g.stage.insertBefore(b, flash);
      var spot = { el: b, holder: b.firstChild, animal: null, task: null };
      spots.push(spot);
      JK.onTap(b, function () { shoot(spot); });
    });

    function hide(spot) {
      spot.animal = null;
      spot.el.classList.remove('up');
      spot.el.setAttribute('aria-label', T.forest.bush);
      g.clock.cancel(spot.task);
    }

    function peek() {
      if (over) return;
      var free = spots.filter(function (s) { return !s.animal; });
      var showing = spots.filter(function (s) { return s.animal; }).map(function (s) { return s.animal; });
      if (free.length && g.clock.t >= quietUntil) {
        // Mostly animals the child has not photographed yet, so the album fills up.
        var missing = ANIMALS.filter(function (n) { return !taken[n] && showing.indexOf(n) < 0; });
        var pool = missing.length && Math.random() < 0.75 ? missing : ANIMALS.filter(function (n) { return showing.indexOf(n) < 0; });
        var spot = free[JK.rand(free.length)];
        spot.animal = pool[JK.rand(pool.length)];
        spot.holder.innerHTML = S.icon(spot.animal);
        spot.el.classList.add('up');
        spot.el.setAttribute('aria-label', T.animals[spot.animal]);
        spot.task = g.clock.after(function () { hide(spot); }, 2000);
      }
      g.clock.after(peek, 1100);
    }

    function shoot(spot) {
      if (over || !g.clock.running || !spot.animal) return;
      var n = spot.animal;
      A.fx.shutter();
      JK.replay(flash, 'lit');
      hide(spot);
      if (taken[n]) return;

      taken[n] = true;
      count++;
      g.score(count + '/' + ANIMALS.length);
      g.stage.querySelector('.slot[data-animal="' + n + '"]').classList.add('got');
      photo.innerHTML = '<div class="photo-card">' + S.icon(n) + '<b>' + T.animals[n] + '</b></div>';
      A.speak(T.animals[n]);
      quietUntil = g.clock.t + 1300;
      g.clock.after(function () { photo.innerHTML = ''; }, 1500);

      if (count === ANIMALS.length) {
        over = true;
        var quick = g.clock.t <= 40000;
        g.clock.after(function () { g.finish({ stars: quick ? 3 : 2, message: T.result.forest(count) }); }, 1500);
      }
    }

    g.clock.each(function (dt, t) {
      if (over) return;
      g.progress(1 - t / DURATION);
      if (t >= DURATION) {
        over = true;
        g.finish({ stars: count >= 3 ? 2 : 1, message: T.result.forest(count) });
      }
    });
    g.clock.after(peek, 300);
  };
})();
