// Everything a player reads, in Indonesian, in one place: the new game keeps the rule
// that js/strings.js follows for the live game, so the text can be reviewed together.
// Technical words with no everyday Indonesian form (fps, draw call, GPU) stay as they are.

export const text = {
  title: 'Jelajah Kerinci (versi uji)',
  loading: 'Memuat pasar…',
  loadFailed: (why: string) => `Gagal memuat: ${why}. Coba muat ulang halaman.`,
  noWebGL2: 'HP ini belum bisa menampilkan grafik 3D-nya: WebGL2 tidak tersedia.',
  rotate: 'Putar HP ke posisi mendatar.',
  help: 'Seret di layar untuk berjalan, atau ketuk tempat yang dituju.',

  // Buttons.
  fullscreen: 'Layar penuh',
  bench: 'Uji kinerja',
  hideHud: 'Sembunyikan angka',
  showHud: 'Angka',
  copy: 'Salin hasil',
  copied: 'Tersalin. Tempel ke percakapan.',
  copyFailed: 'Tidak bisa menyalin otomatis: pilih teks di bawah lalu salin.',
  close: 'Tutup',

  // The numbers.
  hud: {
    fps: (fps: number, low: number, ms: number, p95: number) =>
      `fps ${fps} (terendah ${low}) · ${ms.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms`,
    draw: (calls: number, triangles: number) => `${calls} draw call · ${(triangles / 1000).toFixed(1)} rb segitiga`,
    view: (w: number, h: number, ratio: number) => `layar ${w}×${h} · rasio ${ratio.toFixed(2)}`,
    memory: (js: string, gpu: number) => `memori JS ${js} · GPU ±${gpu.toFixed(0)} MB (perkiraan)`,
    download: (mb: number, seconds: number) => `unduhan ${mb.toFixed(2)} MB · siap dalam ${seconds.toFixed(1)} dtk`,
    scene: (stalls: number, people: number, tex: string, unique: boolean) =>
      `${stalls} lapak (${tex}${unique ? ', tekstur sendiri-sendiri' : ''}) · ${people} orang`,
    gpu: (name: string) => `GPU ${name}`,
    version: (label: string) => `versi ${label}`,
    unknown: 'tidak diketahui',
  },

  // The benchmark.
  benchRunning: (step: number, steps: number, ratio: number, left: number) =>
    `Uji kinerja ${step}/${steps}: rasio layar ${ratio.toFixed(2)}, ${left} dtk lagi. Jangan sentuh layar.`,
  soakRunning: (left: number) => `Uji panas: ${left} dtk lagi. Jangan sentuh layar.`,
  benchDone: 'Uji kinerja selesai.',
  suiteDone: 'Rangkaian uji kinerja selesai.',
  suiteStep: (step: number, steps: number, name: string) => `Rangkaian ${step}/${steps}, ${name}.`,
  suiteNames: {
    standard: 'standar (lapak 2K, antialiasing)',
    'tex-1k': 'tekstur lapak 1K',
    'no-aa': 'tanpa antialiasing',
    'unique-16': '16 lapak, tekstur sendiri-sendiri',
    'npcs-24': '24 penduduk',
  },
  benchRow: (ratio: number, w: number, h: number, fps: number, p95: number, slow: number) =>
    `rasio ${ratio.toFixed(2)} (${w}×${h}): ${fps} fps, p95 ${p95.toFixed(1)} ms, ${slow}% bingkai lewat 33 ms`,
};
