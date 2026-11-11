/* Cari Pasangan (Pasar Sungai Penuh): kartu memori hasil bumi Kerinci. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.seni, A = JK.audio;
  var JENIS = ['kayumanis', 'pucuk', 'kopi', 'kentang', 'padi', 'ikan'];
  var MOTIF = '<svg class="motif" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 14L86 50L50 86L14 50z" fill="none" stroke="#f2c94c" stroke-width="6" stroke-linejoin="round"/><path d="M50 34L66 50L50 66L34 50z" fill="#f2c94c"/></svg>';

  JK.game.pasar = function (g) {
    var T = JK.teks, coba = 0, cocok = 0, terbuka = [], kunci = false;

    g.panggung.innerHTML = '<div class="pasar-papan"></div><p class="pasar-nama" aria-live="polite"></p>';
    var papan = g.panggung.querySelector('.pasar-papan'), nama = g.panggung.querySelector('.pasar-nama');
    g.waktu(0);

    JK.kocok(JENIS.concat(JENIS)).forEach(function (jenis) {
      var b = JK.el('button', 'kartu',
        '<span class="kartu-dalam"><span class="kartu-belakang">' + MOTIF + '</span>' +
        '<span class="kartu-depan">' + S.ikon(jenis) + '<b>' + T.barang[jenis] + '</b></span></span>');
      b.type = 'button';
      b.setAttribute('aria-label', 'Kartu tertutup');
      papan.appendChild(b);
      var k = { el: b, jenis: jenis, buka: false, selesai: false };
      JK.ketuk(b, function () { balik(k); });
    });

    function tutup(k) {
      k.buka = false;
      k.el.classList.remove('buka');
      k.el.setAttribute('aria-label', 'Kartu tertutup');
    }

    function balik(k) {
      if (kunci || !g.sesi.jalan || k.buka || k.selesai) return;
      k.buka = true;
      k.el.classList.add('buka');
      k.el.setAttribute('aria-label', T.barang[k.jenis]);
      A.efek.balik();
      terbuka.push(k);
      if (terbuka.length < 2) return;

      coba++;
      g.skor(coba);
      var a = terbuka[0], b = terbuka[1];
      terbuka = [];
      kunci = true;

      if (a.jenis === b.jenis) {
        cocok++;
        g.waktu(cocok / JENIS.length);
        g.sesi.tunda(function () {
          a.selesai = b.selesai = true;
          a.el.classList.add('cocok');
          b.el.classList.add('cocok');
          nama.textContent = T.barang[a.jenis];
          JK.kilas(nama, 'muncul');
          A.efek.benar();
          A.bicara(T.barang[a.jenis]);
          kunci = false;
          if (cocok === JENIS.length) {
            g.sesi.tunda(function () {
              g.selesai({ bintang: coba <= 10 ? 3 : coba <= 15 ? 2 : 1, pesan: T.hasil.pasar(coba) });
            }, 1100);
          }
        }, 380);
      } else {
        g.sesi.tunda(function () {
          tutup(a);
          tutup(b);
          kunci = false;
        }, 950);
      }
    }
  };
})();
