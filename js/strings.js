/*
 * Everything the player reads or hears is in this file, in Indonesian, so it
 * can be reviewed and changed in one place. Nothing else in js/ contains
 * interface text.
 *
 * Words in the Kerinci language marked CHECK have not been confirmed by a
 * native speaker. Dialects differ from village to village, so replace them
 * with the form used where the children who play this live.
 */
window.JK = window.JK || {};

JK.text = {
  title: ['Jelajah', 'Kerinci'],
  greeting: 'Apo kabar, uhang Kincai?', // CHECK: "How are you, people of Kerinci?"
  invite: 'Ayo keliling Bumi Sakti Alam Kerinci!',

  play: 'Main',
  start: 'Mulai',
  again: 'Main lagi',
  toMap: 'Ke peta',
  toHome: 'Ke halaman depan',
  listen: 'Dengarkan',
  sound: 'Suara',
  stamps: 'Stempel',
  yes: 'Ya',
  no: 'Tidak',

  mapAsk: 'Aku Belang. Mau ke mana kita?',
  mapLocked: function (left) { return 'Kumpulkan ' + left + ' stempel lagi, lalu kita mendaki Gunung Kerinci!'; },
  mapOpen: 'Semua stempel terkumpul. Ayo mendaki Gunung Kerinci!',
  mapDone: 'Hebat! Kamu sudah menjelajahi seluruh Kerinci.',
  mapLake: 'Danau Gunung Tujuh',
  locked: ' (terkunci)',

  ready: 'Siap?',
  go: 'Mulai!',
  quitAsk: 'Kembali ke peta?',

  praise: ['', 'Bagus!', 'Hebat!', 'Luar biasa!'],
  starsOf: function (n) { return n + ' dari 3 bintang'; },
  newStamp: 'Stempel baru!',
  didYouKnow: 'Tahukah kamu?',
  kerinciWord: 'Kata Kerinci',
  means: 'artinya',
  mountainOpen: 'Gunung Kerinci sekarang terbuka!',
  allDone: 'Kamu sudah menjelajahi seluruh Kerinci!',

  bookTitle: 'Buku Stempel',
  bookAria: function (n, total) { return 'Buku Stempel, ' + n + ' dari ' + total + ' stempel'; },
  bookPick: 'Sentuh stempel untuk membaca ceritanya.',
  bookEmpty: 'Mainkan dulu tempat ini untuk mendapat stempelnya.',
  stampAria: function (place, stars) { return place + (stars ? ', ' + stars + ' bintang' : ', belum ada stempel'); },
  reset: 'Mulai dari awal',
  resetAsk: 'Hapus semua stempel dan mulai dari awal?',

  tea: { bush: 'Semak teh', shoot: 'Pucuk teh', caterpillar: 'Ulat' },

  forest: { bush: 'Semak' },
  animals: {
    tiger: 'Harimau sumatera',
    tapir: 'Tapir',
    bear: 'Beruang madu',
    hornbill: 'Burung rangkong',
    siamang: 'Siamang'
  },

  market: { closed: 'Kartu tertutup' },
  goods: {
    cinnamon: 'Kayu manis',
    shoot: 'Daun teh',
    coffee: 'Kopi',
    potato: 'Kentang',
    rice: 'Padi',
    fish: 'Ikan semah'
  },

  rhythm: {
    pads: ['Gong', 'Gendang', 'Rebana', 'Tepuk tangan'],
    watch: 'Lihat dan dengar dulu…',
    yourTurn: 'Sekarang giliranmu!',
    good: 'Bagus!',
    tryAgain: 'Coba lagi ya. Lihat dulu…'
  },

  // The posts on the climb. Every height but the summit's is approximate.
  mountain: {
    posts: [
      { name: 'Pintu Rimba', height: 1800 },
      { name: 'Shelter 1', height: 2500 },
      { name: 'Shelter 2', height: 3000 },
      { name: 'Shelter 3', height: 3300 },
      { name: 'Puncak Gunung Kerinci', height: 3805 }
    ],
    about: 'sekitar ',
    meters: ' meter',
    tap: 'Sentuh! Sentuh!'
  },

  // The sentence on the result screen, by place id.
  result: {
    tea: function (n) { return 'Kamu memetik ' + n + ' pucuk teh!'; },
    lake: function (n) { return 'Kamu menangkap ' + n + ' ikan!'; },
    forest: function (n) { return 'Kamu memotret ' + n + ' satwa rimba!'; },
    rhythm: function () { return 'Kamu mengikuti irama Rentak Kudo!'; },
    market: function (n) { return 'Semua pasangan ketemu dalam ' + n + ' kali coba!'; },
    mountain: function () { return 'Kamu sampai di puncak, 3.805 meter!'; }
  }
};

/*
 * The places on the map.
 *   x, y   where the pin sits (the map is 360 x 500)
 *   final  the last place: it opens once every other stamp is collected
 *   word   one word in the Kerinci language, introduced at that place
 */
JK.places = [
  {
    id: 'tea', icon: 'shoot', color: '#3fae5a', x: 236, y: 152,
    short: 'Kayu Aro',
    place: 'Kebun Teh Kayu Aro',
    title: 'Petik Teh',
    how: 'Sentuh pucuk teh yang muncul. Jangan sentuh ulat ya!',
    fact: 'Kebun teh Kayu Aro terletak di kaki Gunung Kerinci. Kebun ini luas sekali dan sudah ada sejak sekitar 100 tahun lalu.',
    word: { kerinci: 'aro', meaning: 'pohon ara, sejenis beringin' } // CHECK
  },
  {
    id: 'forest', icon: 'hornbill', color: '#1d7a4a', x: 54, y: 236,
    short: 'Rimba TNKS',
    place: 'Taman Nasional Kerinci Seblat',
    title: 'Potret Satwa',
    how: 'Satwa mengintip dari balik semak. Sentuh untuk memotretnya!',
    fact: 'Taman Nasional Kerinci Seblat adalah taman nasional terluas di Sumatra. Harimau sumatera tinggal di sini. Yuk, kita jaga hutannya!',
    word: { kerinci: 'imbo', meaning: 'hutan' } // CHECK
  },
  {
    id: 'rhythm', icon: 'drum', color: '#d9582b', x: 256, y: 264,
    short: 'Rentak Kudo',
    place: 'Tari Rentak Kudo',
    title: 'Ikuti Irama',
    how: 'Lihat dan dengar urutan bunyinya, lalu ulangi!',
    fact: 'Rentak Kudo adalah tarian dari Kerinci. Para penari menghentakkan kaki seperti kuda dengan gembira.',
    word: { kerinci: 'kudo', meaning: 'kuda' }
  },
  {
    id: 'market', icon: 'cinnamon', color: '#b5651d', x: 138, y: 338,
    short: 'Sungai Penuh',
    place: 'Pasar Sungai Penuh',
    title: 'Cari Pasangan',
    how: 'Buka dua kartu. Cari gambar yang sama!',
    fact: 'Kerinci adalah penghasil kayu manis terbesar di Indonesia. Kulit pohonnya dikeringkan menjadi bumbu yang harum.',
    word: { kerinci: 'kulit manih', meaning: 'kayu manis' } // CHECK
  },
  {
    id: 'lake', icon: 'fish', color: '#2f7fd1', x: 240, y: 432,
    short: 'Danau Kerinci',
    place: 'Danau Kerinci',
    title: 'Tangkap Ikan',
    how: 'Geser perahu ke kiri dan ke kanan untuk menangkap ikan. Hindari eceng gondok!',
    fact: 'Danau Kerinci adalah danau terbesar di Kerinci. Di perairan Kerinci hidup ikan semah, ikan yang terkenal dari daerah ini.',
    word: { kerinci: 'ayik', meaning: 'air' } // CHECK
  },
  {
    id: 'mountain', icon: 'mountain', color: '#5f7d8c', x: 118, y: 80, final: true,
    short: 'G. Kerinci',
    place: 'Gunung Kerinci',
    title: 'Mendaki Gunung',
    how: 'Sentuh layar berkali-kali untuk melangkah sampai ke puncak!',
    fact: 'Gunung Kerinci tingginya 3.805 meter. Ini gunung berapi tertinggi di Indonesia!',
    word: { kerinci: 'Kincai', meaning: 'Kerinci' }
  }
];
