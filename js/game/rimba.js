/* Potret Satwa (TNKS): satwa mengintip dari balik semak, sentuh untuk memotretnya. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.seni, A = JK.audio;
  var LAMA = 60000;
  var SATWA = ['harimau', 'tapir', 'beruang', 'rangkong', 'siamang'];
  var TEMPAT = [[6, 10], [62, 6], [34, 30], [66, 40], [4, 50], [38, 60]]; // kiri %, atas %

  JK.game.rimba = function (g) {
    var T = JK.teks, usai = false, dapat = {}, jumlah = 0, semak = [], jedaFoto = 0;

    g.panggung.innerHTML = S.latar.rimba + '<div class="kilat"></div>' +
      '<div class="album">' + SATWA.map(function (n) {
        return '<span class="slot" data-n="' + n + '">' + S.ikon(n) + '</span>';
      }).join('') + '</div><div class="foto" aria-live="polite"></div>';
    var kilat = g.panggung.querySelector('.kilat'), foto = g.panggung.querySelector('.foto');
    g.skor('0/' + SATWA.length);

    TEMPAT.forEach(function (p) {
      var b = JK.el('button', 'intip', '<span class="intip-satwa"></span>' + S.ikon('semak', 'intip-semak'));
      b.type = 'button';
      b.style.left = p[0] + '%';
      b.style.top = p[1] + '%';
      b.setAttribute('aria-label', 'Semak');
      g.panggung.insertBefore(b, kilat);
      var s = { el: b, isi: b.firstChild, satwa: null, tugas: null };
      semak.push(s);
      JK.ketuk(b, function () { potret(s); });
    });

    function sembunyi(s) {
      s.satwa = null;
      s.el.classList.remove('ada');
      s.el.setAttribute('aria-label', 'Semak');
      g.sesi.batal(s.tugas);
    }

    function muncul() {
      if (usai) return;
      var kosong = semak.filter(function (s) { return !s.satwa; });
      var tampil = semak.filter(function (s) { return s.satwa; }).map(function (s) { return s.satwa; });
      if (kosong.length && g.sesi.t >= jedaFoto) {
        var belum = SATWA.filter(function (n) { return !dapat[n] && tampil.indexOf(n) < 0; });
        var calon = belum.length && Math.random() < 0.75 ? belum : SATWA.filter(function (n) { return tampil.indexOf(n) < 0; });
        var s = kosong[JK.acak(kosong.length)];
        s.satwa = calon[JK.acak(calon.length)];
        s.isi.innerHTML = S.ikon(s.satwa);
        s.el.classList.add('ada');
        s.el.setAttribute('aria-label', T.satwa[s.satwa]);
        s.tugas = g.sesi.tunda(function () { sembunyi(s); }, 2000);
      }
      g.sesi.tunda(muncul, 1100);
    }

    function potret(s) {
      if (usai || !g.sesi.jalan || !s.satwa) return;
      var n = s.satwa;
      A.efek.jepret();
      JK.kilas(kilat, 'nyala');
      sembunyi(s);
      if (dapat[n]) return;

      dapat[n] = true;
      jumlah++;
      g.skor(jumlah + '/' + SATWA.length);
      g.panggung.querySelector('.slot[data-n="' + n + '"]').classList.add('dapat');
      foto.innerHTML = '<div class="foto-kartu">' + S.ikon(n) + '<b>' + T.satwa[n] + '</b></div>';
      A.bicara(T.satwa[n]);
      jedaFoto = g.sesi.t + 1300;
      g.sesi.tunda(function () { foto.innerHTML = ''; }, 1500);

      if (jumlah === SATWA.length) {
        usai = true;
        var cepat = g.sesi.t <= 40000;
        g.sesi.tunda(function () { g.selesai({ bintang: cepat ? 3 : 2, pesan: T.hasil.rimba(jumlah) }); }, 1500);
      }
    }

    g.sesi.tiap(function (dt, t) {
      if (usai) return;
      g.waktu(1 - t / LAMA);
      if (t >= LAMA) {
        usai = true;
        g.selesai({ bintang: jumlah >= 3 ? 2 : 1, pesan: T.hasil.rimba(jumlah) });
      }
    });
    g.sesi.tunda(muncul, 300);
  };
})();
