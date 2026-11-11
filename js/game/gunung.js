/* Mendaki Gunung Kerinci: sentuh layar berkali-kali untuk melangkah dari pos ke pos sampai puncak. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.seni, A = JK.audio;
  var LANGKAH = 9; // jumlah langkah di antara dua pos

  function ribuan(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  JK.game.gunung = function (g) {
    var T = JK.teks, jalur = S.jalurGunung, pos = T.pos;
    var total = (jalur.length - 1) * LANGKAH, n = 0, usai = false;

    g.panggung.innerHTML = S.latar.gunung +
      '<p class="gunung-pos" aria-live="polite"></p>' +
      '<div class="gunung-ajak">' + S.ikon('tangan') + '<span>' + T.sentuh + '</span></div>';
    g.panggung.classList.add('geser');
    g.panggung.tabIndex = 0;
    g.panggung.setAttribute('role', 'button');
    g.panggung.setAttribute('aria-label', T.sentuh);

    var pendaki = g.panggung.querySelector('#pendaki');
    var badan = g.panggung.querySelector('.pendaki-badan');
    var papan = g.panggung.querySelector('.gunung-pos');
    var ajak = g.panggung.querySelector('.gunung-ajak');
    var svg = g.panggung.querySelector('.latar-gunung');

    function tampilPos(i) {
      papan.innerHTML = '<b>' + pos[i].nama + '</b><span>' + (i === pos.length - 1 ? '' : 'sekitar ') + ribuan(pos[i].tinggi) + ' meter</span>';
      JK.kilas(papan, 'muncul');
    }

    function letak() {
      var ruas = Math.min(jalur.length - 2, Math.floor(n / LANGKAH));
      var f = (n - ruas * LANGKAH) / LANGKAH;
      var a = jalur[ruas], b = jalur[ruas + 1];
      pendaki.setAttribute('transform', 'translate(' + (a[0] + (b[0] - a[0]) * f).toFixed(1) + ' ' + (a[1] + (b[1] - a[1]) * f).toFixed(1) + ')');
      g.skor(ribuan(Math.round(pos[ruas].tinggi + (pos[ruas + 1].tinggi - pos[ruas].tinggi) * f)) + ' m');
      g.waktu(n / total);
    }

    function langkah() {
      if (usai || !g.sesi.jalan) return;
      n++;
      letak();
      JK.kilas(badan, 'lompat');
      if (n === 3) ajak.classList.add('hilang');

      if (n === total) {
        usai = true;
        svg.classList.add('sampai');
        tampilPos(pos.length - 1);
        A.efek.sorak();
        g.sesi.tunda(function () { g.selesai({ bintang: 3, pesan: T.hasil.gunung() }); }, 1900);
      } else if (n % LANGKAH === 0) {
        tampilPos(n / LANGKAH);
        A.efek.benar();
      } else {
        A.efek.langkah(n);
      }
    }

    JK.ketuk(g.panggung, langkah);
    tampilPos(0);
    letak();
  };
})();
