# Kebijakan keamanan

## Melaporkan celah keamanan

Kirim e-mail ke **debi@elysiumx.org** berisi rinciannya. Mohon jangan membuka *issue*
publik untuk hal yang bisa disalahgunakan sebelum diperbaiki.

Sertakan:

- apa masalahnya dan di mana letaknya (berkas, alamat, atau commit)
- cara mengulanginya, atau contoh pembuktian
- dampak yang Anda perkirakan

Laporan akan dijawab dalam beberapa hari. Proyek ini dikelola satu orang, jadi mohon beri
waktu yang wajar sebelum mengumumkannya.

## Rahasia atau data pribadi yang bocor

Bila Anda melihat rahasia atau data pribadi seseorang terbit di repositori ini, kirim
e-mail ke alamat di atas dengan nomor commit-nya. Jangan mengutip isinya dan jangan
membuka *issue* publik: repositori ini publik, dan setiap *issue* bisa ditemukan mesin
pencari.

## Data yang dikumpulkan permainan

Tidak ada. Permainan tidak mengirim apa pun ke server selain meminta berkasnya sendiri:
tidak ada analitik, kuki, akun, iklan, atau pustaka pihak ketiga. Stempel dan setelan suara
disimpan di perangkat pemain (`localStorage`) dan tidak pernah keluar dari sana.

Pemain permainan ini adalah anak-anak. Bila Anda yakin situs yang berjalan berperilaku
lain dari uraian di atas, itu masalah yang layak dilaporkan.

## Cakupan

Laporan yang relevan antara lain:

- rahasia atau data pribadi yang masuk ke repositori atau riwayatnya
- penyisipan skrip (*cross-site scripting*) atau pelonggaran *Content-Security-Policy*
- pembobolan lewat dependensi atau alur build dan deploy
- aset tak berlisensi yang ikut terbit

## Di luar cakupan

- temuan yang memerlukan browser yang dimodifikasi atau perangkat yang sudah dikuasai
- keluaran pemindai otomatis tanpa cara mengulanginya

## Versi yang didukung

Hanya rilis terbaru yang menerima perbaikan.
