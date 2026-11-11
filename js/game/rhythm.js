/* Rhythm (Rentak Kudo): watch and hear a pattern of instruments, then repeat it. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.art, A = JK.audio;
  var PADS = ['gong', 'drum', 'rebana', 'clap'];
  var LENGTHS = [2, 3, 4, 5]; // pattern length in each round

  JK.game.rhythm = function (g) {
    var T = JK.text.rhythm;
    var pattern = [], round = 0, position = 0, yourTurn = false, mistakes = 0, roundMistakes = 0;

    g.stage.innerHTML =
      '<div class="rhythm-top">' + S.scenes.rhythm +
      '<div class="dancer">' + S.icon('dancer') + '</div>' +
      '<p class="rhythm-status" aria-live="polite"></p></div>' +
      '<div class="rhythm-pads">' + PADS.map(function (n, i) {
        return '<button type="button" class="pad pad-' + i + '" aria-label="' + T.pads[i] + '">' + S.icon(n) + '</button>';
      }).join('') + '</div>';

    var status = g.stage.querySelector('.rhythm-status');
    var dancer = g.stage.querySelector('.dancer');
    var pads = [].slice.call(g.stage.querySelectorAll('.pad'));
    pads.forEach(function (b, i) { JK.onTap(b, function () { press(i); }); });
    g.score('0/' + LENGTHS.length);
    g.progress(0);

    function light(i) {
      pads[i].classList.add('lit');
      A.fx[PADS[i]]();
      g.clock.after(function () { pads[i].classList.remove('lit'); }, 300);
    }

    function show(message) {
      yourTurn = false;
      g.stage.classList.remove('your-turn');
      status.textContent = message || T.watch;
      pattern.forEach(function (n, i) {
        g.clock.after(function () { light(n); }, 700 + i * 650);
      });
      g.clock.after(function () {
        yourTurn = true;
        position = 0;
        g.stage.classList.add('your-turn');
        status.textContent = T.yourTurn;
      }, 700 + pattern.length * 650);
    }

    function startRound() {
      while (pattern.length < LENGTHS[round]) {
        var n = JK.rand(PADS.length);
        // Never the same sound twice in a row, so the pattern stays easy to follow.
        if (pattern.length && n === pattern[pattern.length - 1]) n = (n + 1 + JK.rand(PADS.length - 1)) % PADS.length;
        pattern.push(n);
      }
      show();
    }

    function nextRound(won) {
      yourTurn = false;
      g.stage.classList.remove('your-turn');
      round++;
      roundMistakes = 0;
      g.score(round + '/' + LENGTHS.length);
      g.progress(round / LENGTHS.length);
      if (won) {
        status.textContent = T.good;
        g.clock.after(A.fx.right, 350);
      }
      if (round === LENGTHS.length) {
        g.clock.after(function () {
          g.finish({ stars: mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1, message: JK.text.result.rhythm() });
        }, 1100);
      } else {
        g.clock.after(startRound, 1200);
      }
    }

    function press(i) {
      if (!yourTurn || !g.clock.running) return;
      if (i === pattern[position]) {
        light(i);
        JK.replay(dancer, 'stomp');
        position++;
        if (position === pattern.length) nextRound(true);
        return;
      }
      yourTurn = false;
      g.stage.classList.remove('your-turn');
      mistakes++;
      roundMistakes++;
      A.fx.oops();
      JK.replay(pads[i], 'shake');
      status.textContent = T.tryAgain;
      // After three slips in the same round, move on, so no child gets stuck.
      if (roundMistakes >= 3) nextRound(false);
      else g.clock.after(function () { show(T.tryAgain); }, 700);
    }

    g.clock.after(startRound, 200);
  };
})();
