/* Alur utama: beranda -> peta -> pengantar -> permainan -> hasil, ditambah buku stempel. */
(function () {
  'use strict';
  var JK = window.JK, T = JK.teks, S = JK.seni, A = JK.audio, D = JK.simpan;
  var app = document.getElementById('app');
  var sesi = null;   // jam permainan yang sedang berjalan
  var nomor = 0;     // bertambah tiap ganti layar, untuk membatalkan jeda yang tertinggal
  var layarKini = '';
  var versiBaru = false;
  var UTAMA = JK.lokasi.filter(function (l) { return !l.akhir; });

  function $(s) { return app.querySelector(s); }
  function cari(id) { return JK.lokasi.filter(function (l) { return l.id === id; })[0]; }
  function punya(l) { return D.data.stempel[l.id] > 0; }
  function jumlahCap() { return JK.lokasi.filter(punya).length; }
  function capUtama() { return UTAMA.filter(punya).length; }
  function terkunci(l) { return !!l.akhir && capUtama() < UTAMA.length; }

  function pasang(kelas, html) {
    if (sesi) { sesi.henti(); sesi = null; }
    A.diam();
    nomor++;
    app.innerHTML = '<section class="layar ' + kelas + '">' + html + '</section>';
    layarKini = kelas.split(' ')[0];
    muatVersiBaru();
    return app.firstElementChild;
  }

  /* Warna tempat dipasang lewat CSSOM, bukan atribut style, supaya lolos CSP yang ketat. */
  function warnai(el, warna) { el.style.setProperty('--warna', warna); }

  /* Versi baru sudah terunduh: muat ulang, tetapi hanya di beranda atau peta, jangan di tengah permainan. */
  function muatVersiBaru() {
    if (versiBaru && (layarKini === 'beranda' || layarKini === 'peta')) {
      versiBaru = false;
      location.reload();
    }
  }

  function nanti(fn, ms) {
    var n = nomor;
    setTimeout(function () { if (n === nomor) fn(); }, ms);
  }

  function tb(id, ikon, label) {
    return '<button class="tb-bulat" id="' + id + '" type="button" aria-label="' + label + '">' + S.ikon(ikon) + '</button>';
  }

  function tbSuara() {
    return '<button class="tb-bulat" id="suara" type="button" aria-label="' + T.suara + '" aria-pressed="' + D.data.suara + '">' +
      S.ikon(D.data.suara ? 'suara' : 'bisu') + '</button>';
  }

  function pasangSuara() {
    var b = $('#suara');
    if (!b) return;
    b.onclick = function () {
      D.data.suara = !D.data.suara;
      D.tulis();
      A.atur(D.data.suara);
      b.innerHTML = S.ikon(D.data.suara ? 'suara' : 'bisu');
      b.setAttribute('aria-pressed', D.data.suara);
      A.efek.ketuk();
    };
  }

  function bintang(n, kelas) {
    var s = '';
    for (var i = 0; i < 3; i++) {
      s += '<span class="bt' + (i < n ? ' dapat' : '') + '">' + S.ikon('bintang') + '</span>';
    }
    return '<div class="' + kelas + '" role="img" aria-label="' + n + ' dari 3 bintang">' + s + '</div>';
  }

  function kartuFakta(l) {
    return '<div class="kf-atas"><h3>' + T.tahukah + '</h3>' +
      '<button class="tb-dengar" id="dengar" type="button" aria-label="' + T.dengar + '">' + S.ikon('suara') + '</button></div>' +
      '<p>' + l.fakta + '</p>' +
      '<p class="kata"><span>' + T.kataKerinci + '</span> <b>' + l.kata.kerinci + '</b> ' + T.artinya + ' ' + l.kata.arti + '</p>';
  }

  function bacakanFakta(l) {
    A.bicara(l.fakta + ' ' + T.kataKerinci + ': ' + l.kata.kerinci + ', ' + T.artinya + ' ' + l.kata.arti + '.');
  }

  /* Kotak tanya Ya/Tidak. */
  function tanya(teks, ya, tidak) {
    var o = JK.el('div', 'tirai',
      '<div class="kotak" role="dialog" aria-modal="true" aria-label="' + teks + '"><p>' + teks + '</p><div class="baris">' +
      '<button class="tb tb-kedua" type="button" data-j="t">' + T.tidak + '</button>' +
      '<button class="tb" type="button" data-j="y">' + T.ya + '</button></div></div>');
    app.firstElementChild.appendChild(o);
    o.querySelector('[data-j="t"]').focus();
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      o.remove();
      A.efek.ketuk();
      if (b.getAttribute('data-j') === 'y') ya();
      else if (tidak) tidak();
    });
  }

  /* ---------- Pindah layar (tombol kembali di HP ikut bekerja) ---------- */

  function tingkat() { return history.state && history.state.t || 0; }
  function dorong(t) { try { history.pushState({ t: t }, ''); } catch (e) { /* abaikan */ } }

  function keBeranda() {
    if (tingkat() >= 1) history.go(-tingkat());
    else beranda();
  }

  function kePeta() {
    if (tingkat() === 2) history.back();
    else {
      if (tingkat() !== 1) dorong(1);
      peta();
    }
  }

  function keDalam(fn) {
    if (tingkat() === 0) dorong(1);
    if (tingkat() !== 2) dorong(2);
    fn();
  }

  window.addEventListener('popstate', function () {
    if (tingkat() >= 1) peta();
    else beranda();
  });

  /* ---------- Beranda ---------- */

  function beranda() {
    pasang('beranda',
      S.latar.beranda +
      '<header class="bar"><span></span>' + tbSuara() + '</header>' +
      '<div class="beranda-isi"><p class="sapa">' + T.sapa + '</p>' +
      '<h1>' + T.judul[0] + '<br>' + T.judul[1] + '</h1>' +
      '<p class="ajak">' + T.ajak + '</p></div>' +
      '<div class="beranda-bawah">' + S.ikon('harimau', 'belang') +
      '<button class="tb tb-besar" id="main" type="button">' + S.ikon('main') + T.main + '</button>' +
      '<p class="versi">' + (JK.versi === 'dev' ? '' : 'v' + JK.versi.split('+')[0]) + '</p></div>');
    pasangSuara();
    $('#main').onclick = function () {
      A.efek.ketuk();
      kePeta();
    };
  }

  /* ---------- Peta ---------- */

  function peta() {
    var status = {};
    JK.lokasi.forEach(function (l) {
      status[l.id] = { bintang: D.data.stempel[l.id] || 0, kunci: terkunci(l) };
    });
    var n = jumlahCap(), semua = JK.lokasi.length;
    var kata = n === semua ? T.petaTamat : capUtama() === UTAMA.length ? T.petaTerbuka : T.petaTanya;

    pasang('peta',
      '<header class="bar">' + tb('rumah', 'rumah', T.keBeranda) +
      '<button class="lencana" id="buku" type="button" aria-label="' + T.bukuJudul + ', ' + n + ' dari ' + semua + ' stempel">' +
      S.ikon('bintang') + '<span>' + T.stempel + ' ' + n + '/' + semua + '</span></button>' + tbSuara() + '</header>' +
      '<div class="peta-wadah">' + S.peta(status) + '</div>' +
      '<div class="gelembung">' + S.ikon('harimau', 'belang') + '<p id="kata" aria-live="polite">' + kata + '</p></div>');
    pasangSuara();
    $('#rumah').onclick = function () { A.efek.ketuk(); keBeranda(); };
    $('#buku').onclick = function () { A.efek.ketuk(); keDalam(buku); };

    function pilih(id) {
      var l = cari(id);
      if (terkunci(l)) {
        A.efek.ups();
        $('#kata').textContent = T.petaTerkunci(UTAMA.length - capUtama());
        JK.kilas($('.gelembung'), 'goyang');
        return;
      }
      A.efek.ketuk();
      keDalam(function () { pengantar(id); });
    }

    [].forEach.call(app.querySelectorAll('.pin'), function (p) {
      var id = p.getAttribute('data-id');
      p.addEventListener('click', function () { pilih(id); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilih(id); }
      });
    });
  }

  /* ---------- Pengantar tempat ---------- */

  function pengantar(id) {
    var l = cari(id);
    pasang('pengantar',
      '<header class="bar">' + tb('kembali', 'kembali', T.kePeta) + '<span></span>' + tbSuara() + '</header>' +
      '<div class="pengantar-isi">' +
      '<div class="pengantar-gambar">' + S.ikon(l.ikon) + '</div>' +
      '<p class="tempat">' + l.tempat + '</p><h2>' + l.nama + '</h2><p class="cara">' + l.cara + '</p>' +
      '<button class="tb-teks" id="dengar" type="button">' + S.ikon('suara') + T.dengar + '</button></div>' +
      '<div class="bawah"><button class="tb tb-besar" id="mulai" type="button">' + S.ikon('main') + T.mulai + '</button></div>');
    warnai($('.pengantar-isi'), l.warna);
    pasangSuara();
    var baca = function () { A.bicara(l.nama + '. ' + l.cara); };
    $('#kembali').onclick = function () { A.efek.ketuk(); kePeta(); };
    $('#dengar').onclick = baca;
    $('#mulai').onclick = function () { A.efek.ketuk(); mainkan(id); };
    baca();
  }

  /* ---------- Permainan ---------- */

  function mainkan(id) {
    var l = cari(id);
    if (typeof JK.game[id] !== 'function') {
      // berkas game ini gagal dimuat: tampilkan ajakan muat ulang, jangan biarkan layar macet
      var gagal = document.getElementById('gagal');
      if (gagal) gagal.hidden = false;
      return;
    }
    pasang('main main-' + id,
      '<header class="bar hud">' + tb('keluar', 'silang', T.kePeta) +
      '<div class="hud-waktu"><i id="waktu"></i></div>' +
      '<div class="hud-skor">' + S.ikon(l.ikon) + '<b id="skor">0</b></div></header>' +
      '<div class="panggung" id="panggung"></div>' +
      '<div class="aba" id="aba"><span>' + T.siap + '</span></div>');

    var s = sesi = new JK.Sesi();
    var waktu = $('#waktu'), skor = $('#skor'), aba = $('#aba'), tamat = false, mulai = false;

    JK.game[id]({
      panggung: $('#panggung'),
      sesi: s,
      skor: function (v) {
        skor.textContent = v;
        JK.kilas(skor.parentNode, 'denyut');
      },
      waktu: function (f) { waktu.style.transform = 'scaleX(' + Math.max(0, Math.min(1, f)) + ')'; },
      selesai: function (h) {
        if (tamat) return;
        tamat = true;
        s.henti();
        nanti(function () { hasil(id, h); }, 500);
      }
    });

    nanti(function () {
      aba.innerHTML = '<span>' + T.ayo + '</span>';
      A.efek.benar();
    }, 800);
    nanti(function () {
      aba.remove();
      mulai = true;
      if (!tahan) s.mulai();
    }, 1400);

    // Tombol keluar menjeda permainan dulu dan bertanya, supaya sentuhan tak sengaja tidak menghapus permainan.
    var tahan = false;
    $('#keluar').onclick = function () {
      if (tamat || tahan) return;
      tahan = true;
      A.efek.ketuk();
      s.jeda();
      tanya(T.keluarTanya, kePeta, function () {
        tahan = false;
        if (mulai) s.mulai();
      });
    };
  }

  /* ---------- Hasil ---------- */

  function hasil(id, h) {
    var l = cari(id), lama = D.data.stempel[id] || 0;
    var sebelum = capUtama() === UTAMA.length;
    if (h.bintang > lama) {
      D.data.stempel[id] = h.bintang;
      D.tulis();
    }
    var catatan = l.akhir ? T.tamat : (!sebelum && capUtama() === UTAMA.length ? T.gunungTerbuka : '');

    var el = pasang('hasil',
      '<div class="hasil-isi">' +
      bintang(h.bintang, 'hasil-bintang') +
      '<div class="cap' + (lama ? '' : ' baru') + '">' + S.ikon(l.ikon) + (lama ? '' : '<span>' + T.capBaru + '</span>') + '</div>' +
      '<h2>' + T.pujian[h.bintang] + '</h2><p class="hasil-pesan">' + h.pesan + '</p>' +
      (catatan ? '<p class="hasil-catatan">' + catatan + '</p>' : '') +
      '<div class="kartu-fakta">' + kartuFakta(l) + '</div></div>' +
      '<div class="bawah dua"><button class="tb tb-kedua" id="lagi" type="button">' + S.ikon('ulang') + T.lagi + '</button>' +
      '<button class="tb" id="peta" type="button">' + S.ikon('peta') + T.kePeta + '</button></div>');

    warnai($('.hasil-isi'), l.warna);
    $('#lagi').onclick = function () { A.efek.ketuk(); mainkan(id); };
    $('#peta').onclick = function () { A.efek.ketuk(); kePeta(); };
    $('#dengar').onclick = function () { bacakanFakta(l); };

    for (var i = 0; i < h.bintang; i++) (function (k) { nanti(function () { A.efek.bintang(k); }, 250 + k * 350); })(i);
    if (!lama || l.akhir) {
      nanti(A.efek.sorak, 1400);
      taburan(el);
    }
  }

  function taburan(el) {
    var warna = ['#ffc93c', '#e8553d', '#3fae5a', '#2f7fd1', '#fff'], w = JK.el('div', 'taburan');
    for (var i = 0; i < 28; i++) {
      var k = JK.el('i');
      k.style.left = (Math.random() * 100) + '%';
      k.style.background = warna[i % warna.length];
      k.style.animationDelay = (Math.random() * 0.9) + 's';
      k.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      w.appendChild(k);
    }
    el.appendChild(w);
  }

  /* ---------- Buku stempel ---------- */

  function buku() {
    pasang('buku',
      '<header class="bar">' + tb('kembali', 'kembali', T.kePeta) + '<h2>' + T.bukuJudul + '</h2>' + tbSuara() + '</header>' +
      '<div class="buku-isi"><div class="buku-kisi">' + JK.lokasi.map(function (l) {
        var b = D.data.stempel[l.id] || 0;
        return '<button type="button" class="cap-kotak' + (b ? ' punya' : '') + '" data-id="' + l.id +
          '" aria-label="' + l.tempat + (b ? ', ' + b + ' bintang' : ', belum ada stempel') + '">' +
          '<span class="cap">' + S.ikon(b ? l.ikon : 'tanya') + '</span><span class="cap-nama">' + l.pendek + '</span>' +
          bintang(b, 'cap-bintang') + '</button>';
      }).join('') + '</div>' +
      '<div class="kartu-fakta" id="rinci" aria-live="polite"><p>' + T.bukuPilih + '</p></div>' +
      '<button class="tb-teks" id="hapus" type="button">' + S.ikon('ulang') + T.hapus + '</button></div>');
    pasangSuara();
    $('#kembali').onclick = function () { A.efek.ketuk(); kePeta(); };
    $('#hapus').onclick = function () {
      tanya(T.hapusTanya, function () {
        D.data.stempel = {};
        D.tulis();
        buku();
      });
    };
    [].forEach.call(app.querySelectorAll('.cap-kotak'), function (b) {
      warnai(b, cari(b.getAttribute('data-id')).warna);
      b.onclick = function () {
        var l = cari(b.getAttribute('data-id')), rinci = $('#rinci');
        A.efek.ketuk();
        [].forEach.call(app.querySelectorAll('.cap-kotak'), function (x) { x.classList.toggle('pilih', x === b); });
        if (!punya(l)) {
          rinci.innerHTML = '<h3>' + l.tempat + '</h3><p>' + T.bukuKosong + '</p>';
          return;
        }
        rinci.innerHTML = kartuFakta(l);
        $('#dengar').onclick = function () { bacakanFakta(l); };
      };
    });
  }

  /* ---------- Mulai ---------- */

  D.baca();
  A.atur(D.data.suara);
  // Peramban baru mengizinkan bunyi setelah sentuhan pertama.
  document.addEventListener('pointerdown', function () { A.siap(); }, { passive: true });
  // Cegah menu konteks saat anak menekan lama.
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  if (tingkat() >= 1) peta();
  else beranda();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // Saat service worker versi baru mengambil alih, halaman lama masih memakai berkas lama.
    var adaPengendali = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!adaPengendali) { adaPengendali = true; return; } // pemasangan pertama: tidak perlu muat ulang
      versiBaru = true;
      muatVersiBaru();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* tetap bisa main tanpa mode luring */ });
    });
  }

  // Pintu samping untuk pengujian: membuka sebuah layar langsung dari konsol peramban.
  JK.uji = { peta: peta, mainkan: mainkan, hasil: hasil, buku: buku, pengantar: pengantar };
})();
