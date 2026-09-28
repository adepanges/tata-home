# tata-home

Visualisasi **denah rumah bertumbuh** (2D + 3D) dalam satu file HTML.

- **2D**: SVG, skala meter, pilih Lantai 1 / Lantai 2
- **3D**: [Three.js](https://threejs.org) — dinding di-extrude dari data denah, ruangan tahap baru "tumbuh" dengan animasi
- Slider **Tahap** untuk melihat rumah dari tahap 1 → tahap akhir; rencana tahap berikutnya tampil transparan
- Ringkasan luas per tahap dan kumulatif

## Menjalankan

Buka `index.html` di browser (butuh internet untuk memuat Three.js dari CDN), atau:

```sh
python3 -m http.server 8000   # lalu buka http://localhost:8000
```

## Mengubah denah

Edit konstanta di bagian `DATA DENAH` pada `index.html`:

- `LAHAN` — ukuran lahan (m)
- `TAHAP` — nama & warna tiap tahap
- `RUANG` — daftar ruangan: `x, y, w, h` (m, y=0 = sisi depan/jalan), `lantai`, `tahap`,
  `jenis` (`"ruang"` berdinding, `"terbuka"` hanya lantai, `"balkon"` lantai + railing)
