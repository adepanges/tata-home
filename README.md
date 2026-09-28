# tata-home

Visualisasi **denah rumah bertumbuh** (2D + 3D) untuk rumah lebar muka 10 m × dalam 12 m,
menghadap timur (jalan di sisi kanan denah, utara = atas).

- **Denah 2D** (SVG, gaya gambar kerja): dinding tebal tersambung, pintu dengan busur bukaan,
  jendela, pola lantai (keramik/parket/KM/beton), furnitur, garis ukuran berantai di 4 sisi,
  skala batang. Bisa diunduh sebagai SVG.
- **Model 3D** ([Three.js](https://threejs.org)): dinding, pintu & jendela diambil dari model yang sama
  dengan denah 2D, jadi bukaan di denah otomatis jadi lubang berkaca di 3D.
- Slider **Tahap**: rumah "tumbuh" dari tahap 1 ke tahap akhir; rencana tahap berikutnya tampil transparan.
- Void 4×4 m di living room dengan tangga L di dalamnya, ringkasan luas per tahap.

## Menjalankan

Karena memakai ES modules, buka lewat web server (bukan double-click file):

```sh
python3 -m http.server 8000   # lalu buka http://localhost:8000
```

Preview GitHub Pages: https://adepanges.github.io/tata-home/

## Struktur

| File | Isi |
|---|---|
| `js/data.js` | **Data denah**: lahan, tahap, ruangan, pintu & jendela, tangga L |
| `js/model.js` | Model dinding bersama: gabung dinding berimpit, potong bukaan, railing void |
| `js/denah2d.js` | Render denah 2D (SVG) |
| `js/simbol.js` | Simbol furnitur tampak atas (kasur, sofa, dapur, kloset, mobil, …) |
| `js/tampilan3d.js` | Render model 3D |
| `js/app.js` | Kontrol UI & ringkasan luas |

## Mengubah denah (`js/data.js`)

- `LAHAN`, `JALAN`: ukuran lahan di denah (x ke kanan, y ke bawah) dan sisi yang menghadap jalan (`"kanan"` / `"atas"`)
- `RUANG`: tiap ruangan `x, y, w, h` (m), `lantai`, `tahap`, `jenis`,
  `finish` (`keramik` | `parket` | `basah` | `beton`), `perabot` (`[tipe, cx, cy, rotasi, w?, h?]`), `label` (opsional)
  - `jenis`: `"ruang"` berdinding + atap, `"terbuka"` hanya lantai (carport), `"balkon"`,
    `"tangga"` (bentuk L dihitung `tanggaL()`), `"void"`, `"mezanin"` (railing ke arah void)
- `BUKAAN`: pintu/jendela di dinding `garis` `"h"` (y=pos) / `"v"` (x=pos), rentang `a..b`,
  `tipe` `pintu` | `bukaan` | `jendela` | `boven` | `jendelaTinggi`; pintu punya `engsel` (`"a"`/`"b"`) dan `buka` (+1/−1)
- `VOID`: ukuran void (4 → 4×4 m, 3 → 3×3 m); tangga L ikut menyesuaikan
