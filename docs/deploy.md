# Rilis dan deploy

Permainan ini adalah situs statis. Menggabung perubahan ke `main` hanya menjalankan
pemeriksaan. Pemain baru mendapat perubahan ketika pengelola mendorong tag versi lalu
menerbitkan draf rilis yang dibuatnya. Penerbitan itu menyalin rilis ke VPS lewat SSH, ke
folder rilis yang baru, lalu memindahkan `current` ke folder itu. VPS menjalankan nginx
lewat aaPanel; panel tetap memegang vhost dan sertifikatnya.

```
PR, gabung ke main ─► CI: pindai rahasia, periksa berkas dan data pribadi,
                      pemeriksaan statis, uji unit, build, uji browser   (tanpa deploy)

git tag vX.Y.Z, push ─► Release: pemeriksaan yang sama pada tag itu, lalu DRAF
                        rilis GitHub berisi situs dan SHA256SUMS
                     │
                     ▼  pengelola memeriksa catatan rilis lalu menerbitkannya
                  Deploy: unduh berkas rilis, cocokkan sidik jarinya
                     │
                     ▼  rsync lewat SSH (pengguna deploy tanpa hak istimewa)
VPS  /www/wwwroot/kerinciku.web.id/releases/20261112000000-a1b2c3d/
                     │
                     ▼  deploy/remote.sh: periksa unggahan, pindahkan current
     current ─► rilis baru, previous ─► rilis sebelumnya
```

```
/www/wwwroot/kerinciku.web.id/
  .well-known/                 pemeriksaan Let's Encrypt, dikelola panel
  releases/
    20261112000000-a1b2c3d/    satu folder per deploy (waktu UTC, commit), lima terbaru disimpan
  current -> releases/...      yang sedang tayang, dipindah seketika saat deploy
  previous -> releases/...     tujuan rollback
```

Satu berkas di server berasal dari repositori ini tetapi dipasang dengan tangan:
`deploy/nginx/kerinciku-rewrite.conf` sebagai aturan *rewrite* situs. Rilis tidak pernah
menyentuh konfigurasi nginx (lihat *Mengubah konfigurasi server*).

## Persiapan satu kali

1. **DNS** — `A kerinciku.web.id → <IP server>`, `CNAME www → kerinciku.web.id`.
2. **Situs di aaPanel** — Website → Add site. Domain `kerinciku.web.id`, folder
   `/www/wwwroot/kerinciku.web.id`, tanpa PHP, tanpa basis data, tanpa FTP.
3. **Sertifikat di aaPanel** — Site → SSL → Let's Encrypt → verifikasi berkas. Panel
   menyimpan dan memperpanjang sertifikatnya sendiri.
4. **Folder rilis** — rilis diunggah oleh pengguna deploy yang tidak punya hak istimewa.
   Pengguna itu harus memiliki folder situs, karena `current` dibuat di sana:

   ```sh
   sudo mkdir -p /www/wwwroot/kerinciku.web.id/releases
   sudo chown -R <pengguna-deploy>: /www/wwwroot/kerinciku.web.id
   ```

5. **Kunci SSH untuk CI** — pasangan kunci khusus deploy. Bagian publiknya masuk ke
   `authorized_keys` milik pengguna deploy; bagian privatnya disimpan sebagai *secret*
   repositori `DEPLOY_SSH_KEY`. Jangan pernah meng-commit-nya.
6. **Konfigurasi server** — pasang berkas nginx dengan tangan (lihat *Mengubah
   konfigurasi server*). Tanpa berkas ini situs tidak akan tampil: nginx masih mencari
   berkas di folder situs, bukan di `current`.

## Secret dan variabel repositori

| Nama | Jenis | Isi |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | secret | kunci privat pasangan kunci deploy |
| `DEPLOY_KNOWN_HOSTS` | secret | sidik jari kunci host server (baris `known_hosts`) |
| `DEPLOY_HOST` | secret | alamat server; dijadikan secret supaya disamarkan di log Actions |
| `DEPLOY_USER` | variabel | pengguna deploy |
| `DEPLOY_PORT` | variabel | port SSH |
| `DEPLOY_PATH` | variabel | folder situs, yaitu `/www/wwwroot/kerinciku.web.id` |
| `DEPLOY_ENABLED` | variabel | `true`, atau `false` untuk menghentikan deploy sementara |

Tugas deploy berjalan di *environment* GitHub `production`, yang hanya menerima tag
berpola `v*.*.*`. Cabang, pull request, atau *fork* tidak bisa men-deploy.

Variabel yang belum diisi tiba di workflow sebagai teks kosong, bukan galat. Langkah
pertama tugas deploy ("Check deploy settings") menggagalkan proses bila ada yang kosong
atau bentuknya salah, dan `DEPLOY_PATH` harus jalur mutlak sedalam minimal dua tingkat.
Skrip di server juga menolak memindahkan `current` bila folder rilis barunya tidak lengkap.

Nilai sebenarnya hanya ada di setelan repositori dan catatan pengelola, tidak di berkas
publik ini.

## Merilis

Sehari-hari, buka pull request dan gabungkan setelah CI hijau. Belum ada yang sampai ke
pemain. Bila `main` sudah layak tayang:

1. Pastikan `main` hijau di CI.
2. Buat dan dorong tag versi pada `main` terbaru:

   ```sh
   git switch main && git pull --ff-only
   git tag -a vX.Y.Z -m "Jelajah Kerinci X.Y.Z"
   git push origin vX.Y.Z
   ```

3. Workflow **Release** memeriksa bahwa tag berbentuk `vX.Y.Z` dan berada di `main`,
   menjalankan semua pemeriksaan CI padanya, mem-build-nya dengan versi `X.Y.Z`, lalu
   membuat **draf rilis** berisi `kerinciku-site-X.Y.Z.tar.gz` dan `SHA256SUMS`, dengan
   catatan dari pull request yang sudah digabung.
4. Periksa drafnya (GitHub → Releases): tulis ulang catatannya untuk pemain dan orang tua,
   apa yang berubah di permainan, bukan caranya. Lalu **Publish**.
5. Penerbitan memulai workflow **Deploy**, yang men-deploy persis berkas itu. Sekitar
   semenit kemudian sudah tayang.

Draf tidak pernah sampai ke pemain, dan menghapus draf beserta tagnya membatalkan rilis.
Halaman Releases di GitHub adalah catatan perubahannya; tidak ada `CHANGELOG.md`.

Versi berasal dari tag: `package.json` tetap `0.0.0` dan tidak dinaikkan. Tambalan
(`0.3.1`) untuk perbaikan, minor (`0.4.0`) untuk apa pun yang terasa oleh pemain.

- **Men-deploy ulang sebuah rilis:** `gh workflow run deploy.yml --ref vX.Y.Z` (atau
  Actions → Deploy → Run workflow, pilih tagnya).
- **Menghentikan deploy sementara:** ubah variabel `DEPLOY_ENABLED` menjadi `false`.
  Penerbitan rilis lalu tidak men-deploy apa pun.

Build menuliskan versinya ke `js/versi.js` (tampil kecil di halaman depan) dan ke `sw.js`:

| Build | Label | Contoh |
| --- | --- | --- |
| Rilis | `X.Y.Z+<sha7>` | `0.3.1+a1b2c3d` |
| Build CI lainnya | `0.0.0-dev+<sha7>` | `0.0.0-dev+9f8e7d6` |
| Build lokal atau dibuka langsung | `dev` | `dev` |

## Yang dilakukan sebuah deploy

`.github/workflows/deploy.yml`, untuk rilis yang sudah diterbitkan:

1. Mengunduh berkas situs rilis itu dan mencocokkannya dengan `SHA256SUMS`, lalu
   memastikan isinya memang di-build untuk tag tersebut. Draf, atau rilis tanpa berkas
   itu, berhenti di sini.
2. Memeriksa setelan deploy, lalu `rsync` situs ke `releases/<rilis>/` di folder situs.
   Foldernya selalu baru (`<waktu UTC>-<sha7>`), jadi yang sedang tayang tidak berubah
   selama pengunggahan.
3. Menjalankan `deploy/remote.sh activate` lewat SSH: memeriksa bahwa unggahan lengkap,
   memindahkan `current` dengan `mv -Tf` supaya tidak ada permintaan yang melihat
   peralihan setengah jalan, mencatat sasaran lama sebagai `previous`, dan menyimpan lima
   rilis terbaru ditambah yang ditunjuk `current` dan `previous`.
4. Uji asap: halaman, `sw.js`, skrip, gaya, manifes, dan ikon menjawab 200; `js/versi.js`
   dan `sw.js` yang tayang membawa label rilis ini; dan server mengirim
   *Content-Security-Policy*. Bila uji asap gagal, tugas menjalankan
   `deploy/remote.sh rollback` lalu gagal.

## Mengubah konfigurasi server

Ubah berkas di `deploy/`, gabungkan (CI menjalankan `nginx -t` pada berkas nginx
repositori), lalu pasang dari akun admin di VPS. Situs lain memakai nginx yang sama:
simpan salinan bertanggal, dan selalu jalankan `nginx -t` sebelum memuat ulang.

```sh
F=/www/server/panel/vhost/rewrite/kerinciku.web.id.conf
sudo cp -p "$F" "$F.bak-$(date +%F-%H%M%S)"
sudo install -m 644 /tmp/kerinciku-rewrite.conf "$F"     # disalin dulu dengan scp
sudo nginx -t && sudo nginx -s reload
```

## Rollback

Di server, sebagai pengguna deploy, dari salinan repositori ini atau dengan skrip yang
disalin:

```sh
bash deploy/remote.sh rollback /www/wwwroot/kerinciku.web.id
```

Skrip itu menukar `current` dan `previous`, jadi menjalankannya dua kali membatalkannya.
Tanpa build ulang, tanpa jeda.

Lewat CI, deploy ulang rilis sebelumnya: `gh workflow run deploy.yml --ref v<sebelumnya>`.
Setelah itu perbaiki masalahnya di `main` dan rilis versi baru.

## Catatan

- **CSP tidak mengizinkan skrip atau gaya sebaris.** `scripts/serve.mjs` dan uji browser
  memakai kebijakan yang sama dengan nginx, dan `npm run check` menolak bila keduanya
  berbeda, jadi pelanggaran ketahuan sebelum rilis.
- **Tembolok:** halaman, skrip, dan gaya selalu divalidasi ulang (`no-cache`), sehingga
  deploy terlihat pada pemuatan berikutnya. Ikon ditembolok tujuh hari.
- **Mode luring:** `sw.js` menyimpan seluruh berkas rilis di HP. Build menuliskan label
  rilis dan daftar berkas ke `sw.js`, sehingga setiap rilis mengubah berkas itu; HP lalu
  mengunduh rilis baru ke simpanan baru, membuang yang lama, dan memuat ulang halaman saat
  pemain berada di halaman depan atau peta, tidak di tengah permainan. `sw.js` tidak boleh
  ditembolok server: HP yang menyimpan salinan lama akan terus menayangkan permainan lama.
- Bila mode luring suatu saat harus dimatikan, ganti `sw.js` dengan pekerja yang menghapus
  semua simpanan lalu mencabut dirinya, dan biarkan berkas itu tetap di `/sw.js` selama
  beberapa bulan sampai HP lama mengambilnya.
