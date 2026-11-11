/*
 * Semua teks permainan ada di berkas ini supaya mudah diperiksa dan diubah.
 *
 * Kata bahasa Kerinci yang bertanda PERIKSA belum dicek oleh penutur asli.
 * Dialek tiap dusun berbeda, jadi silakan ganti dengan ucapan yang dipakai
 * di tempat anak-anak yang akan memainkannya.
 */
window.JK = window.JK || {};

JK.teks = {
  judul: ['Jelajah', 'Kerinci'],
  sapa: 'Apo kabar, uhang Kincai?', // PERIKSA: "Apa kabar, orang Kerinci?"
  ajak: 'Ayo keliling Bumi Sakti Alam Kerinci!',

  main: 'Main',
  mulai: 'Mulai',
  lagi: 'Main lagi',
  kePeta: 'Ke peta',
  keBeranda: 'Ke halaman depan',
  dengar: 'Dengarkan',
  suara: 'Suara',
  stempel: 'Stempel',
  ya: 'Ya',
  tidak: 'Tidak',

  petaTanya: 'Aku Belang. Mau ke mana kita?',
  petaTerkunci: function (sisa) { return 'Kumpulkan ' + sisa + ' stempel lagi, lalu kita mendaki Gunung Kerinci!'; },
  petaTerbuka: 'Semua stempel terkumpul. Ayo mendaki Gunung Kerinci!',
  petaTamat: 'Hebat! Kamu sudah menjelajahi seluruh Kerinci.',

  siap: 'Siap?',
  ayo: 'Mulai!',
  keluarTanya: 'Kembali ke peta?',

  pujian: ['', 'Bagus!', 'Hebat!', 'Luar biasa!'],
  capBaru: 'Stempel baru!',
  tahukah: 'Tahukah kamu?',
  kataKerinci: 'Kata Kerinci',
  artinya: 'artinya',
  gunungTerbuka: 'Gunung Kerinci sekarang terbuka!',
  tamat: 'Kamu sudah menjelajahi seluruh Kerinci!',

  bukuJudul: 'Buku Stempel',
  bukuPilih: 'Sentuh stempel untuk membaca ceritanya.',
  bukuKosong: 'Mainkan dulu tempat ini untuk mendapat stempelnya.',
  hapus: 'Mulai dari awal',
  hapusTanya: 'Hapus semua stempel dan mulai dari awal?',

  satwa: {
    harimau: 'Harimau sumatera',
    tapir: 'Tapir',
    beruang: 'Beruang madu',
    rangkong: 'Burung rangkong',
    siamang: 'Siamang'
  },

  barang: {
    kayumanis: 'Kayu manis',
    pucuk: 'Daun teh',
    kopi: 'Kopi',
    kentang: 'Kentang',
    padi: 'Padi',
    ikan: 'Ikan semah'
  },

  rentak: {
    lihat: 'Lihat dan dengar dulu…',
    giliran: 'Sekarang giliranmu!',
    bagus: 'Bagus!',
    cobaLagi: 'Coba lagi ya. Lihat dulu…'
  },

  // Pos pendakian. Ketinggian pos selain puncak adalah angka kira-kira.
  pos: [
    { nama: 'Pintu Rimba', tinggi: 1800 },
    { nama: 'Shelter 1', tinggi: 2500 },
    { nama: 'Shelter 2', tinggi: 3000 },
    { nama: 'Shelter 3', tinggi: 3300 },
    { nama: 'Puncak Gunung Kerinci', tinggi: 3805 }
  ],
  sentuh: 'Sentuh! Sentuh!',

  hasil: {
    teh: function (n) { return 'Kamu memetik ' + n + ' pucuk teh!'; },
    danau: function (n) { return 'Kamu menangkap ' + n + ' ikan!'; },
    rimba: function (n) { return 'Kamu memotret ' + n + ' satwa rimba!'; },
    rentak: function () { return 'Kamu mengikuti irama Rentak Kudo!'; },
    pasar: function (n) { return 'Semua pasangan ketemu dalam ' + n + ' kali coba!'; },
    gunung: function () { return 'Kamu sampai di puncak, 3.805 meter!'; }
  }
};

/*
 * Daftar tempat di peta.
 *   x, y  : letak pin di peta (peta berukuran 360 x 500)
 *   akhir : tempat terakhir, baru terbuka setelah semua stempel lain terkumpul
 *   kata  : satu kata bahasa Kerinci yang dikenalkan di tempat itu
 */
JK.lokasi = [
  {
    id: 'teh', ikon: 'pucuk', warna: '#3fae5a', x: 236, y: 152,
    pendek: 'Kayu Aro',
    tempat: 'Kebun Teh Kayu Aro',
    nama: 'Petik Teh',
    cara: 'Sentuh pucuk teh yang muncul. Jangan sentuh ulat ya!',
    fakta: 'Kebun teh Kayu Aro terletak di kaki Gunung Kerinci. Kebun ini luas sekali dan sudah ada sejak sekitar 100 tahun lalu.',
    kata: { kerinci: 'aro', arti: 'pohon ara, sejenis beringin' } // PERIKSA
  },
  {
    id: 'rimba', ikon: 'rangkong', warna: '#1d7a4a', x: 54, y: 236,
    pendek: 'Rimba TNKS',
    tempat: 'Taman Nasional Kerinci Seblat',
    nama: 'Potret Satwa',
    cara: 'Satwa mengintip dari balik semak. Sentuh untuk memotretnya!',
    fakta: 'Taman Nasional Kerinci Seblat adalah taman nasional terluas di Sumatra. Harimau sumatera tinggal di sini. Yuk, kita jaga hutannya!',
    kata: { kerinci: 'imbo', arti: 'hutan' } // PERIKSA
  },
  {
    id: 'rentak', ikon: 'gendang', warna: '#d9582b', x: 256, y: 264,
    pendek: 'Rentak Kudo',
    tempat: 'Tari Rentak Kudo',
    nama: 'Ikuti Irama',
    cara: 'Lihat dan dengar urutan bunyinya, lalu ulangi!',
    fakta: 'Rentak Kudo adalah tarian dari Kerinci. Para penari menghentakkan kaki seperti kuda dengan gembira.',
    kata: { kerinci: 'kudo', arti: 'kuda' }
  },
  {
    id: 'pasar', ikon: 'kayumanis', warna: '#b5651d', x: 138, y: 338,
    pendek: 'Sungai Penuh',
    tempat: 'Pasar Sungai Penuh',
    nama: 'Cari Pasangan',
    cara: 'Buka dua kartu. Cari gambar yang sama!',
    fakta: 'Kerinci adalah penghasil kayu manis terbesar di Indonesia. Kulit pohonnya dikeringkan menjadi bumbu yang harum.',
    kata: { kerinci: 'kulit manih', arti: 'kayu manis' } // PERIKSA
  },
  {
    id: 'danau', ikon: 'ikan', warna: '#2f7fd1', x: 240, y: 432,
    pendek: 'Danau Kerinci',
    tempat: 'Danau Kerinci',
    nama: 'Tangkap Ikan',
    cara: 'Geser perahu ke kiri dan ke kanan untuk menangkap ikan. Hindari eceng gondok!',
    fakta: 'Danau Kerinci adalah danau terbesar di Kerinci. Di perairan Kerinci hidup ikan semah, ikan yang terkenal dari daerah ini.',
    kata: { kerinci: 'ayik', arti: 'air' } // PERIKSA
  },
  {
    id: 'gunung', ikon: 'gunung', warna: '#5f7d8c', x: 118, y: 80, akhir: true,
    pendek: 'G. Kerinci',
    tempat: 'Gunung Kerinci',
    nama: 'Mendaki Gunung',
    cara: 'Sentuh layar berkali-kali untuk melangkah sampai ke puncak!',
    fakta: 'Gunung Kerinci tingginya 3.805 meter. Ini gunung berapi tertinggi di Indonesia!',
    kata: { kerinci: 'Kincai', arti: 'Kerinci' }
  }
];
