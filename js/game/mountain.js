/* Mountain climb (Gunung Kerinci): tap again and again to walk from post to post, up to the summit. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.art, A = JK.audio;
  var STEPS = 9; // steps between two posts

  /* 3805 -> "3.805", the way Indonesian writes thousands. */
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  JK.game.mountain = function (g) {
    var T = JK.text, M = T.mountain, path = S.mountainPath, posts = M.posts;
    var total = (path.length - 1) * STEPS, n = 0, over = false;

    g.stage.innerHTML = S.scenes.mountain +
      '<p class="mountain-post" aria-live="polite"></p>' +
      '<div class="mountain-hint">' + S.icon('hand') + '<span>' + M.tap + '</span></div>';
    g.stage.classList.add('drag');
    g.stage.tabIndex = 0;
    g.stage.setAttribute('role', 'button');
    g.stage.setAttribute('aria-label', M.tap);

    var climber = g.stage.querySelector('#climber');
    var body = g.stage.querySelector('.climber-body');
    var sign = g.stage.querySelector('.mountain-post');
    var hint = g.stage.querySelector('.mountain-hint');
    var svg = g.stage.querySelector('.scene-mountain');

    function showPost(i) {
      sign.innerHTML = '<b>' + posts[i].name + '</b><span>' + (i === posts.length - 1 ? '' : M.about) + thousands(posts[i].height) + M.meters + '</span>';
      JK.replay(sign, 'pop');
    }

    function place() {
      var leg = Math.min(path.length - 2, Math.floor(n / STEPS));
      var f = (n - leg * STEPS) / STEPS;
      var a = path[leg], b = path[leg + 1];
      climber.setAttribute('transform', 'translate(' + (a[0] + (b[0] - a[0]) * f).toFixed(1) + ' ' + (a[1] + (b[1] - a[1]) * f).toFixed(1) + ')');
      g.score(thousands(Math.round(posts[leg].height + (posts[leg + 1].height - posts[leg].height) * f)) + ' m');
      g.progress(n / total);
    }

    function step() {
      if (over || !g.clock.running) return;
      n++;
      place();
      JK.replay(body, 'hop');
      if (n === 3) hint.classList.add('gone');

      if (n === total) {
        over = true;
        svg.classList.add('summit');
        showPost(posts.length - 1);
        A.fx.cheer();
        g.clock.after(function () { g.finish({ stars: 3, message: T.result.mountain() }); }, 1900);
      } else if (n % STEPS === 0) {
        showPost(n / STEPS);
        A.fx.right();
      } else {
        A.fx.step(n);
      }
    }

    JK.onTap(g.stage, step);
    showPost(0);
    place();
  };
})();
