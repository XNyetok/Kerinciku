# Ikut membantu

Terima kasih sudah tertarik. Proyek ini masih muda, jadi perubahan kecil dan terfokus jauh
lebih mudah diperiksa daripada perombakan besar.

Bantuan yang paling dibutuhkan saat ini bukan kode: **koreksi kata bahasa Kerinci** dan
**fakta tentang Kerinci** dari orang yang mengenalnya (lihat tabel di `README.md`).

## Sebelum mengirim pull request

1. *Fork* repositori ini dan buat cabang dari `main`.
2. Jalankan `./scripts/setup-hooks.sh` sekali. Skrip itu memasang pemeriksaan yang berjalan
   sebelum setiap commit.
3. Pasang `gitleaks` bila belum ada:

   ```sh
   brew install gitleaks
   ```

4. Jalankan `npm run check && npm test`, dan `npm run test:e2e` bila mengubah permainan.
5. Pastikan `git status` hanya menampilkan berkas yang memang ingin Anda ubah.

## Yang tidak akan digabung

Repositori ini publik dan berlisensi longgar, jadi beberapa aturan bersifat mutlak.

- **Tanpa rahasia.** Kunci API, token, kata sandi, alamat server, kunci privat, berkas
  `.env`. Pemeriksaan sebelum commit menolak kasus yang umum; jangan menambah pengecualian
  untuk kasus Anda.
- **Tanpa data pribadi.** Alamat e-mail, nomor telepon, nomor identitas, alamat rumah,
  alamat IP, jalur folder dari komputer Anda, foto atau tangkapan layar yang memuat orang
  atau akun orang lain. Nama anak-anak yang mencoba permainan tidak boleh dicatat di sini.
- **Tanpa aset tak berlisensi.** Gambar, bunyi, dan huruf harus buatan sendiri, milik
  umum, atau berlisensi jelas. Semua gambar permainan saat ini digambar dengan SVG di
  `js/seni.js`.
- **Tanpa berkas hasil olahan.** Jangan meng-commit `node_modules/`, `dist/`, laporan uji,
  atau berkas sementara editor.

Bila rahasia atau data pribadi terlanjur masuk ke sebuah commit, ganti dulu rahasianya,
lalu tulis ulang riwayatnya. Menghapus berkas di commit berikutnya tidak cukup: isinya
tetap ada di riwayat publik.

## Isi tentang Kerinci

- **Fakta** harus bisa ditelusuri. Sebutkan sumbernya di pull request (buku, situs resmi,
  atau narasumber setempat). Bila tidak yakin, pakai kata "sekitar" atau jangan
  dimasukkan.
- **Kata bahasa Kerinci** ditulis seperti diucapkan di satu dusun tertentu. Sebutkan dusun
  atau kecamatannya di pull request, dan hapus tanda `// PERIKSA` hanya bila kata itu
  sudah diperiksa penutur asli.
- **Budaya dan tempat** digambarkan dengan hormat. Aksara, motif, dan tarian tidak boleh
  dikarang.
- Teks untuk anak kelas 1-3: kalimat pendek, kata sehari-hari, tanpa istilah sulit.

## Bahasa

Kode permainan (nama, komentar), teks di dalam permainan, `README.md`, dan dokumen di
`docs/` berbahasa Indonesia. Berkas pendukung (`.github/`, `deploy/`, `scripts/`, `tests/`)
berkomentar bahasa Inggris.

## Commit

Pakai awalan singkat, huruf kecil, kalimat perintah:

```
feat: add a rice field game at Hamparan Rawang
fix: keep the boat on screen on narrow phones
docs: record who checked the Kerinci words
chore: pin gitleaks to 8.30.1
```

Judul di bawah 72 karakter. Isi commit menjelaskan *mengapa*, bukan mengulang isi
perubahan. Judul berbahasa Inggris; isi boleh bahasa Indonesia atau Inggris. Jangan
menambah baris co-author, catatan "dibuat dengan", emoji, atau bahasa iklan.

## Pull request

- Satu topik per pull request. Pisahkan perapian yang tidak berkaitan.
- Jelaskan apa yang berubah bagi pemain dan bagaimana Anda memeriksanya.
- Jaga cabang tetap mengikuti `main`, dan gabungkan commit perbaikan sebelum diperiksa.
- Menggabung pull request tidak langsung mengubah situs. Pemain mendapat perubahan saat
  pengelola menerbitkan rilis (`docs/deploy.md`, Merilis).

## Melaporkan masalah dan ide

Pakai templat *issue*. Jangan menempelkan rahasia, data pribadi, atau tangkapan layar
pribadi: semua *issue* bersifat publik.
