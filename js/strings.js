/*
 * Everything the player reads or hears is in this file, in Indonesian, so it
 * can be reviewed and changed in one place. Nothing else in js/ contains
 * interface text.
 *
 * The words in the Kerinci language have been confirmed by a native speaker.
 * Dialects differ from village to village: mark a new word CHECK until a
 * native speaker has confirmed it.
 */
window.JK = window.JK || {};

JK.text = {
  title: ['Jelajah', 'Kerinci'],
  greeting: 'Apo kabar, uhang Kincai?', // "How are you, people of Kerinci?"
  invite: 'Ayo keliling Bumi Sakti Alam Kerinci!',
  credit: 'Dibuat oleh',
  creditSite: 'nyetok.id',

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
  close: 'Tutup',

  // The note behind the "i" button on the title screen.
  about: 'Tentang permainan ini',
  aboutTitle: 'Masih terus dikembangkan',
  aboutText: [
    'Jelajah Kerinci masih terus dikembangkan. Mungkin masih ada kekurangan dan kesalahan, dan kami terus memperbaikinya.',
    'Informasi tentang Kerinci di sini kami susun sebaik mungkin, tetapi bisa saja ada yang kurang tepat. Bahasa dan adat juga bisa berbeda di tiap dusun.'
  ],
  aboutReport: 'Menemukan yang keliru? Beri tahu kami',
  aboutReportUrl: 'https://github.com/XNyetok/Kerinciku/issues',

  mapAsk: 'Aku Belang. Mau ke mana kita?',
  mapLocked: 'Puncak Gunung Kerinci belum dibuka. Tunggu ya!',
  mapDone: 'Hebat! Semua stempel sudah terkumpul. Tunggu tempat baru, ya!',
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
  allDone: 'Semua tempat sudah kamu jelajahi. Tunggu tempat baru, ya!',

  bookTitle: 'Buku Stempel',
  bookAria: function (n, total) { return 'Buku Stempel, ' + n + ' dari ' + total + ' stempel'; },
  bookPick: 'Sentuh stempel untuk membaca ceritanya.',
  bookEmpty: 'Mainkan dulu tempat ini untuk mendapat stempelnya.',
  bookSoon: 'Tempat ini belum dibuka. Tunggu ya!',
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
    mountain: function () { return 'Kamu sampai di puncak, 3.805 meter di atas permukaan laut!'; }
  }
};

/*
 * The places on the map.
 *   x, y   where the pin sits (the map is 360 x 500)
 *   soon   a place that is not open yet: its pin is locked and it gives no stamp.
 *          New places are added to this list; the summit waits until last.
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
    word: { kerinci: 'aro', meaning: 'pohon ara, sejenis beringin' }
  },
  {
    id: 'forest', icon: 'hornbill', color: '#1d7a4a', x: 54, y: 236,
    short: 'Rimba TNKS',
    place: 'Taman Nasional Kerinci Seblat',
    title: 'Potret Satwa',
    how: 'Satwa mengintip dari balik semak. Sentuh untuk memotretnya!',
    fact: 'Taman Nasional Kerinci Seblat adalah taman nasional terluas di Sumatra. Harimau sumatera tinggal di sini. Yuk, kita jaga hutannya!',
    word: { kerinci: 'imbo', meaning: 'hutan' }
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
    word: { kerinci: 'kulit manaih', meaning: 'kayu manis' }
  },
  {
    id: 'lake', icon: 'fish', color: '#2f7fd1', x: 240, y: 432,
    short: 'Danau Kerinci',
    place: 'Danau Kerinci',
    title: 'Tangkap Ikan',
    how: 'Geser perahu ke kiri dan ke kanan untuk menangkap ikan. Hindari eceng gondok!',
    fact: 'Danau Kerinci adalah danau terbesar di Kerinci. Di perairan Kerinci hidup ikan semah, ikan yang terkenal dari daerah ini.',
    word: { kerinci: 'aye', meaning: 'air' }
  },
  {
    id: 'mountain', icon: 'mountain', color: '#5f7d8c', x: 118, y: 80, soon: true,
    short: 'G. Kerinci',
    place: 'Gunung Kerinci',
    title: 'Mendaki Gunung',
    how: 'Sentuh layar berkali-kali untuk melangkah sampai ke puncak!',
    fact: 'Gunung Kerinci adalah gunung berapi tertinggi di Indonesia, dan masih aktif. Tingginya 3.805 meter di atas permukaan laut. Kerinci juga gunung tertinggi di Pulau Sumatra.',
    word: { kerinci: 'Kincai', meaning: 'Kerinci' }
  }
];

/*
 * What the recorded narration says, by clip (audio/voice/<name>.mp3). The same
 * text is what the device's own voice reads when a clip cannot be loaded.
 *
 * A clip has to be recorded again when its text changes: `npm run check`
 * compares these lines with scripts/voice.json, the text each clip was
 * recorded from (docs/audio.md).
 */
JK.voice = (function () {
  var T = JK.text, v = {};
  JK.places.forEach(function (l) {
    v['intro-' + l.id] = l.title + '. ' + l.how;
    v['fact-' + l.id] = l.fact + ' ' + T.kerinciWord + ': ' + l.word.kerinci + ', ' + T.means + ' ' + l.word.meaning + '.';
  });
  Object.keys(T.animals).forEach(function (k) { v['animal-' + k] = T.animals[k]; });
  Object.keys(T.goods).forEach(function (k) { v['goods-' + k] = T.goods[k]; });
  [1, 2, 3].forEach(function (n) { v['praise-' + n] = T.praise[n]; });
  v['map-ask'] = T.mapAsk;
  v['map-done'] = T.mapDone;
  return v;
})();
