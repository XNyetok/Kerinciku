/* Memory cards (the market in Sungai Penuh): find the pairs of Kerinci's produce. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.art, A = JK.audio;
  var GOODS = ['cinnamon', 'shoot', 'coffee', 'potato', 'rice', 'fish'];
  var MOTIF = '<svg class="motif" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 14L86 50L50 86L14 50z" fill="none" stroke="#f2c94c" stroke-width="6" stroke-linejoin="round"/><path d="M50 34L66 50L50 66L34 50z" fill="#f2c94c"/></svg>';

  JK.game.market = function (g) {
    var T = JK.text, tries = 0, pairs = 0, open = [], locked = false;

    g.stage.innerHTML = '<div class="market-board"></div><p class="market-name" aria-live="polite"></p>';
    var board = g.stage.querySelector('.market-board'), name = g.stage.querySelector('.market-name');
    g.progress(0);

    JK.shuffle(GOODS.concat(GOODS)).forEach(function (kind) {
      var b = JK.el('button', 'card',
        '<span class="card-inner"><span class="card-back">' + MOTIF + '</span>' +
        '<span class="card-front">' + S.icon(kind) + '<b>' + T.goods[kind] + '</b></span></span>');
      b.type = 'button';
      b.setAttribute('aria-label', T.market.closed);
      board.appendChild(b);
      var card = { el: b, kind: kind, open: false, done: false };
      JK.onTap(b, function () { flip(card); });
    });

    function close(card) {
      card.open = false;
      card.el.classList.remove('open');
      card.el.setAttribute('aria-label', T.market.closed);
    }

    function flip(card) {
      if (locked || !g.clock.running || card.open || card.done) return;
      card.open = true;
      card.el.classList.add('open');
      card.el.setAttribute('aria-label', T.goods[card.kind]);
      A.fx.flip();
      open.push(card);
      if (open.length < 2) return;

      tries++;
      g.score(tries);
      var a = open[0], b = open[1];
      open = [];
      locked = true;

      if (a.kind === b.kind) {
        pairs++;
        g.progress(pairs / GOODS.length);
        g.clock.after(function () {
          a.done = b.done = true;
          a.el.classList.add('matched');
          b.el.classList.add('matched');
          name.textContent = T.goods[a.kind];
          JK.replay(name, 'pop');
          A.fx.right();
          A.speak('goods-' + a.kind);
          locked = false;
          if (pairs === GOODS.length) {
            g.clock.after(function () {
              g.finish({ stars: tries <= 10 ? 3 : tries <= 15 ? 2 : 1, message: T.result.market(tries) });
            }, 1100);
          }
        }, 380);
      } else {
        g.clock.after(function () {
          close(a);
          close(b);
          locked = false;
        }, 950);
      }
    }
  };
})();
