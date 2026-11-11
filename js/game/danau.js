/* Tangkap Ikan (Danau Kerinci): geser perahu untuk menangkap ikan, hindari eceng gondok. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.seni, A = JK.audio;
  var LAMA = 40000;

  JK.game.danau = function (g) {
    var skor = 0, usai = false, benda = [];
    var W = 1, H = 1, kiri = 0, garis = 0.82; // garis: tinggi perahu (0..1 dari atas panggung)
    var px = 0.5, sasaran = 0.5, lambat = 0;

    g.panggung.innerHTML = S.latar.danau + '<div class="perahu">' + S.ikon('perahu') + '</div>';
    g.panggung.classList.add('geser');
    var perahu = g.panggung.querySelector('.perahu');

    function ukur() {
      var r = g.panggung.getBoundingClientRect(), p = perahu.getBoundingClientRect();
      W = r.width || 1;
      H = r.height || 1;
      kiri = r.left;
      garis = (p.top + p.height * 0.55 - r.top) / H;
    }
    ukur();
    window.addEventListener('resize', ukur);

    function arah(e) {
      if (e.type === 'pointermove' && e.pointerType !== 'mouse' && !e.buttons && e.pressure === 0) return;
      sasaran = Math.max(0.12, Math.min(0.88, (e.clientX - kiri) / W));
    }
    function tombol(e) {
      if (e.key === 'ArrowLeft') sasaran = Math.max(0.12, sasaran - 0.14);
      else if (e.key === 'ArrowRight') sasaran = Math.min(0.88, sasaran + 0.14);
      else return;
      e.preventDefault();
    }
    g.panggung.addEventListener('pointerdown', arah);
    g.panggung.addEventListener('pointermove', arah);
    window.addEventListener('keydown', tombol);
    g.sesi.saatHenti(function () {
      window.removeEventListener('resize', ukur);
      window.removeEventListener('keydown', tombol);
    });

    function tambah() {
      if (usai) return;
      var maju = Math.min(1, g.sesi.t / LAMA);
      var jenis = Math.random() < 0.27 ? 'eceng' : 'ikan';
      var el = JK.el('div', 'benda benda-' + jenis, S.ikon(jenis));
      g.panggung.insertBefore(el, perahu);
      benda.push({
        el: el, jenis: jenis,
        x: 0.12 + Math.random() * 0.76, y: -0.1,
        v: 0.24 + 0.2 * maju + Math.random() * 0.06,
        fase: Math.random() * 6.28
      });
      g.sesi.tunda(tambah, 900 - 380 * maju);
    }

    function kena(b) {
      if (b.jenis === 'ikan') {
        skor++;
        g.skor(skor);
        A.efek.cebur();
        var p = JK.el('span', 'plus', '+1');
        perahu.appendChild(p);
        g.sesi.tunda(function () { p.remove(); }, 600);
      } else {
        lambat = 800;
        A.efek.ups();
        JK.kilas(perahu, 'goyang');
      }
    }

    g.sesi.tiap(function (dt, t) {
      g.waktu(1 - t / LAMA);
      if (lambat > 0) lambat -= dt;
      px += (sasaran - px) * (1 - Math.exp(-dt / (lambat > 0 ? 450 : 70)));
      perahu.style.transform = 'translate3d(' + (px * W) + 'px,0,0)';

      for (var i = benda.length - 1; i >= 0; i--) {
        var b = benda[i];
        b.y += b.v * dt / 1000;
        var bx = b.x + (b.jenis === 'ikan' ? Math.sin(t / 320 + b.fase) * 0.035 : 0);
        var tertangkap = b.y > garis - 0.07 && b.y < garis + 0.07 && Math.abs(bx - px) < 0.16;
        if (tertangkap) kena(b);
        if (tertangkap || b.y > 1.12) {
          b.el.remove();
          benda.splice(i, 1);
        } else {
          b.el.style.transform = 'translate3d(' + (bx * W) + 'px,' + (b.y * H) + 'px,0)';
        }
      }

      if (t >= LAMA && !usai) {
        usai = true;
        g.selesai({ bintang: skor >= 18 ? 3 : skor >= 9 ? 2 : 1, pesan: JK.teks.hasil.danau(skor) });
      }
    });
    g.sesi.tunda(tambah, 300);
  };
})();
