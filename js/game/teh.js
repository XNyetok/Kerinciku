/* Petik Teh (Kayu Aro): sentuh pucuk teh yang muncul, jangan sentuh ulat. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.seni, A = JK.audio;
  var LAMA = 40000;

  JK.game.teh = function (g) {
    var skor = 0, usai = false, semak = [];

    g.panggung.innerHTML = S.latar.teh + '<div class="teh-kebun"></div>';
    var kebun = g.panggung.querySelector('.teh-kebun');

    for (var i = 0; i < 9; i++) {
      var b = JK.el('button', 'semak', '<span class="semak-isi"></span>' + S.ikon('semakTeh', 'semak-daun'));
      b.type = 'button';
      b.setAttribute('aria-label', 'Semak teh');
      kebun.appendChild(b);
      semak.push({ el: b, isi: b.firstChild, jenis: null, tugas: null });
    }
    semak.forEach(function (s) { JK.ketuk(s.el, function () { sentuh(s); }); });

    function sembunyi(s) {
      s.jenis = null;
      s.el.classList.remove('ada');
      s.el.setAttribute('aria-label', 'Semak teh');
      g.sesi.batal(s.tugas);
    }

    function muncul() {
      if (usai) return;
      var maju = Math.min(1, g.sesi.t / LAMA);
      var kosong = semak.filter(function (s) { return !s.jenis; });
      if (kosong.length) {
        var s = kosong[JK.acak(kosong.length)];
        s.jenis = Math.random() < 0.2 ? 'ulat' : 'pucuk';
        s.isi.innerHTML = S.ikon(s.jenis);
        s.el.classList.add('ada');
        s.el.setAttribute('aria-label', s.jenis === 'ulat' ? 'Ulat' : 'Pucuk teh');
        s.tugas = g.sesi.tunda(function () { sembunyi(s); }, 1800 - 500 * maju);
      }
      g.sesi.tunda(muncul, 950 - 400 * maju);
    }

    function sentuh(s) {
      if (usai || !g.sesi.jalan || !s.jenis) return;
      if (s.jenis === 'pucuk') {
        skor++;
        g.skor(skor);
        A.efek.petik();
        var p = JK.el('span', 'plus', '+1');
        s.el.appendChild(p);
        g.sesi.tunda(function () { p.remove(); }, 600);
      } else {
        A.efek.ups();
        JK.kilas(s.el, 'goyang');
      }
      sembunyi(s);
    }

    g.sesi.tiap(function (dt, t) {
      g.waktu(1 - t / LAMA);
      if (t >= LAMA && !usai) {
        usai = true;
        g.selesai({ bintang: skor >= 20 ? 3 : skor >= 10 ? 2 : 1, pesan: JK.teks.hasil.teh(skor) });
      }
    });
    g.sesi.tunda(muncul, 300);
  };
})();
