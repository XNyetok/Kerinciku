/* Ikuti Irama (Rentak Kudo): lihat dan dengar urutan bunyi, lalu ulangi. */
(function () {
  'use strict';
  var JK = window.JK, S = JK.seni, A = JK.audio;
  var ALAT = ['gong', 'gendang', 'rebana', 'tepuk'];
  var NAMA = ['Gong', 'Gendang', 'Rebana', 'Tepuk tangan'];
  var PANJANG = [2, 3, 4, 5]; // panjang urutan tiap babak

  JK.game.rentak = function (g) {
    var T = JK.teks.rentak;
    var urutan = [], babak = 0, posisi = 0, giliran = false, salah = 0, salahBabak = 0;

    g.panggung.innerHTML =
      '<div class="rentak-atas">' + S.latar.rentak +
      '<div class="penari">' + S.ikon('penari') + '</div>' +
      '<p class="rentak-status" aria-live="polite"></p></div>' +
      '<div class="rentak-alat">' + ALAT.map(function (n, i) {
        return '<button type="button" class="alat alat-' + i + '" aria-label="' + NAMA[i] + '">' + S.ikon(n) + '</button>';
      }).join('') + '</div>';

    var status = g.panggung.querySelector('.rentak-status');
    var penari = g.panggung.querySelector('.penari');
    var tombol = [].slice.call(g.panggung.querySelectorAll('.alat'));
    tombol.forEach(function (b, i) { JK.ketuk(b, function () { tekan(i); }); });
    g.skor('0/' + PANJANG.length);
    g.waktu(0);

    function nyala(i) {
      tombol[i].classList.add('nyala');
      A.efek[ALAT[i]]();
      g.sesi.tunda(function () { tombol[i].classList.remove('nyala'); }, 300);
    }

    function putar(pesan) {
      giliran = false;
      g.panggung.classList.remove('giliran');
      status.textContent = pesan || T.lihat;
      urutan.forEach(function (n, i) {
        g.sesi.tunda(function () { nyala(n); }, 700 + i * 650);
      });
      g.sesi.tunda(function () {
        giliran = true;
        posisi = 0;
        g.panggung.classList.add('giliran');
        status.textContent = T.giliran;
      }, 700 + urutan.length * 650);
    }

    function mulaiBabak() {
      while (urutan.length < PANJANG[babak]) {
        var n = JK.acak(ALAT.length);
        // hindari bunyi yang sama berturut-turut supaya urutannya jelas
        if (urutan.length && n === urutan[urutan.length - 1]) n = (n + 1 + JK.acak(ALAT.length - 1)) % ALAT.length;
        urutan.push(n);
      }
      putar();
    }

    function babakBerikut(berhasil) {
      giliran = false;
      g.panggung.classList.remove('giliran');
      babak++;
      salahBabak = 0;
      g.skor(babak + '/' + PANJANG.length);
      g.waktu(babak / PANJANG.length);
      if (berhasil) {
        status.textContent = T.bagus;
        g.sesi.tunda(A.efek.benar, 350);
      }
      if (babak === PANJANG.length) {
        g.sesi.tunda(function () {
          g.selesai({ bintang: salah <= 1 ? 3 : salah <= 3 ? 2 : 1, pesan: JK.teks.hasil.rentak() });
        }, 1100);
      } else {
        g.sesi.tunda(mulaiBabak, 1200);
      }
    }

    function tekan(i) {
      if (!giliran || !g.sesi.jalan) return;
      if (i === urutan[posisi]) {
        nyala(i);
        JK.kilas(penari, 'hentak');
        posisi++;
        if (posisi === urutan.length) babakBerikut(true);
        return;
      }
      giliran = false;
      g.panggung.classList.remove('giliran');
      salah++;
      salahBabak++;
      A.efek.ups();
      JK.kilas(tombol[i], 'goyang');
      status.textContent = T.cobaLagi;
      // setelah tiga kali keliru di babak yang sama, lanjut saja supaya tidak buntu
      if (salahBabak >= 3) babakBerikut(false);
      else g.sesi.tunda(function () { putar(T.cobaLagi); }, 700);
    }

    g.sesi.tunda(mulaiBabak, 200);
  };
})();
