/* Fishing (Danau Kerinci): slide the boat to catch fish, steer clear of the water hyacinth. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.art, A = JK.audio;
  var DURATION = 40000;

  JK.game.lake = function (g) {
    var score = 0, over = false, floaters = [];
    var W = 1, H = 1, left = 0, line = 0.82; // line: where the boat sits, 0..1 from the top of the stage
    var boatX = 0.5, targetX = 0.5, slowed = 0;

    g.stage.innerHTML = S.scenes.lake + '<div class="boat">' + S.icon('boat') + '</div>';
    g.stage.classList.add('drag');
    var boat = g.stage.querySelector('.boat');

    function measure() {
      var r = g.stage.getBoundingClientRect(), b = boat.getBoundingClientRect();
      W = r.width || 1;
      H = r.height || 1;
      left = r.left;
      line = (b.top + b.height * 0.55 - r.top) / H;
    }
    measure();
    window.addEventListener('resize', measure);

    function steer(e) {
      if (e.type === 'pointermove' && e.pointerType !== 'mouse' && !e.buttons && e.pressure === 0) return;
      targetX = Math.max(0.12, Math.min(0.88, (e.clientX - left) / W));
    }
    function key(e) {
      if (e.key === 'ArrowLeft') targetX = Math.max(0.12, targetX - 0.14);
      else if (e.key === 'ArrowRight') targetX = Math.min(0.88, targetX + 0.14);
      else return;
      e.preventDefault();
    }
    g.stage.addEventListener('pointerdown', steer);
    g.stage.addEventListener('pointermove', steer);
    window.addEventListener('keydown', key);
    g.clock.onStop(function () {
      window.removeEventListener('resize', measure);
      window.removeEventListener('keydown', key);
    });

    function add() {
      if (over) return;
      var progress = Math.min(1, g.clock.t / DURATION);
      var kind = Math.random() < 0.27 ? 'hyacinth' : 'fish';
      var el = JK.el('div', 'floater floater-' + kind, S.icon(kind));
      g.stage.insertBefore(el, boat);
      floaters.push({
        el: el, kind: kind,
        x: 0.12 + Math.random() * 0.76, y: -0.1,
        speed: 0.24 + 0.2 * progress + Math.random() * 0.06,
        phase: Math.random() * 6.28
      });
      g.clock.after(add, 900 - 380 * progress);
    }

    function hit(f) {
      if (f.kind === 'fish') {
        score++;
        g.score(score);
        A.fx.splash();
        var plus = JK.el('span', 'plus', '+1');
        boat.appendChild(plus);
        g.clock.after(function () { plus.remove(); }, 600);
      } else {
        slowed = 800;
        A.fx.oops();
        JK.replay(boat, 'shake');
      }
    }

    g.clock.each(function (dt, t) {
      g.progress(1 - t / DURATION);
      if (slowed > 0) slowed -= dt;
      boatX += (targetX - boatX) * (1 - Math.exp(-dt / (slowed > 0 ? 450 : 70)));
      boat.style.transform = 'translate3d(' + (boatX * W) + 'px,0,0)';

      for (var i = floaters.length - 1; i >= 0; i--) {
        var f = floaters[i];
        f.y += f.speed * dt / 1000;
        var x = f.x + (f.kind === 'fish' ? Math.sin(t / 320 + f.phase) * 0.035 : 0);
        var caught = f.y > line - 0.07 && f.y < line + 0.07 && Math.abs(x - boatX) < 0.16;
        if (caught) hit(f);
        if (caught || f.y > 1.12) {
          f.el.remove();
          floaters.splice(i, 1);
        } else {
          f.el.style.transform = 'translate3d(' + (x * W) + 'px,' + (f.y * H) + 'px,0)';
        }
      }

      if (t >= DURATION && !over) {
        over = true;
        g.finish({ stars: score >= 18 ? 3 : score >= 9 ? 2 : 1, message: JK.text.result.lake(score) });
      }
    });
    g.clock.after(add, 300);
  };
})();
