/* Tea picking (Kayu Aro): tap the tea shoots that pop up, leave the caterpillars alone. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.art, A = JK.audio;
  var DURATION = 40000;

  JK.game.tea = function (g) {
    var T = JK.text, score = 0, over = false, bushes = [];

    g.stage.innerHTML = S.scenes.tea + '<div class="tea-field"></div>';
    var field = g.stage.querySelector('.tea-field');

    for (var i = 0; i < 9; i++) {
      var b = JK.el('button', 'bush', '<span class="bush-item"></span>' + S.icon('teaBush', 'bush-leaves'));
      b.type = 'button';
      b.setAttribute('aria-label', T.tea.bush);
      field.appendChild(b);
      bushes.push({ el: b, item: b.firstChild, kind: null, task: null });
    }
    bushes.forEach(function (bush) { JK.onTap(bush.el, function () { tap(bush); }); });

    function hide(bush) {
      bush.kind = null;
      bush.el.classList.remove('up');
      bush.el.setAttribute('aria-label', T.tea.bush);
      g.clock.cancel(bush.task);
    }

    function popUp() {
      if (over) return;
      var progress = Math.min(1, g.clock.t / DURATION);
      var free = bushes.filter(function (bush) { return !bush.kind; });
      if (free.length) {
        var bush = free[JK.rand(free.length)];
        bush.kind = Math.random() < 0.2 ? 'caterpillar' : 'shoot';
        bush.item.innerHTML = S.icon(bush.kind);
        bush.el.classList.add('up');
        bush.el.setAttribute('aria-label', T.tea[bush.kind]);
        bush.task = g.clock.after(function () { hide(bush); }, 1800 - 500 * progress);
      }
      g.clock.after(popUp, 950 - 400 * progress);
    }

    function tap(bush) {
      if (over || !g.clock.running || !bush.kind) return;
      if (bush.kind === 'shoot') {
        score++;
        g.score(score);
        A.fx.pick();
        var plus = JK.el('span', 'plus', '+1');
        bush.el.appendChild(plus);
        g.clock.after(function () { plus.remove(); }, 600);
      } else {
        A.fx.oops();
        JK.replay(bush.el, 'shake');
      }
      hide(bush);
    }

    g.clock.each(function (dt, t) {
      g.progress(1 - t / DURATION);
      if (t >= DURATION && !over) {
        over = true;
        g.finish({ stars: score >= 20 ? 3 : score >= 10 ? 2 : 1, message: T.result.tea(score) });
      }
    });
    g.clock.after(popUp, 300);
  };
})();
