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
- **Open space** lantai 1: living, r. makan, dapur, foyer & selasar menyatu (daftar `TANPA_DINDING`); satu-satunya sekat
  adalah dinding foyer (rak sepatu) segaris dinding KM, dapur–r. makan dipisah meja island. Lantai 2: studio kerja terbuka
  ke dapur kering/koridor, walk-in terbuka ke kamar utama, dinding kaca geser ke balkon.
- **Tahap 3 – Rooftop**: tangga melayang ke atap, rumah tangga beratap, pendopo (deck kayu, tiang besi,
  atap limasan ringan uPVC warna coklat), tembok parapet 130 cm, zona instalasi air, air panas, AC outdoor, antena & komunikasi.
- **Struktur kolom & balok** (perkiraan awal): toggle *Struktur* di denah 2D (grid as A–E / 1–4, kolom, balok putus-putus
  per jenis + ukuran b/h, dinding di atas pelat kuning/merah, beban terpusat rooftop) dan di 3D (kolom & balok beton,
  dinding transparan: bata merah lantai 1, hebel lantai 2 & rooftop). Tabel ringkasan: kolom per lantai, panjang balok
  per jenis, beban dinding hebel vs pembanding bata merah, dan dinding yang perlu perhatian.
  **Perhitungan final wajib oleh insinyur struktur** (SNI 2847, SNI 1727, SNI 1726); pondasi & kolom tahap 1 dihitung
  untuk beban akhir 3 lantai.

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
| `js/struktur.js` | Grid, kolom, balok (induk/anak/void/sloof/ring…), analisa dinding di atas pelat, jalur beban & dimensi awal |
| `js/ringkasanStruktur.js` | Tabel ringkasan & legenda struktur |

## Mengubah denah (`js/data.js`)

- `LAHAN`, `JALAN`: ukuran lahan di denah (x ke kanan, y ke bawah) dan sisi yang menghadap jalan (`"kanan"` / `"atas"`)
- `RUANG`: tiap ruangan `x, y, w, h` (m), `lantai`, `tahap`, `jenis`,
  `finish` (`keramik` | `parket` | `basah` | `beton`), `perabot` (`[tipe, cx, cy, rotasi, w?, h?]`), `label` (opsional)
  - `jenis`: `"ruang"` berdinding + atap, `"terbuka"` hanya lantai (carport), `"balkon"`,
    `"tangga"` (`tanggaL()` / `tanggaLurus()`), `"void"`, `"mezanin"` (railing ke arah void),
    `"rooftop"` (lantai atap + parapet), `"pendopo"`, `"zona"` (penanda area instalasi)
  - `grup`: beberapa persegi dengan grup sama = satu ruangan (bentuk L), tanpa dinding di antaranya
- `BUKAAN`: pintu/jendela di dinding `garis` `"h"` (y=pos) / `"v"` (x=pos), rentang `a..b`,
  `tipe` `pintu` | `bukaan` | `jendela` | `boven` | `jendelaTinggi`; pintu punya `engsel` (`"a"`/`"b"`) dan `buka` (+1/−1)
- `MATERIAL_DINDING`: material & berat dinding per lantai (bata merah lt 1, hebel lt 2 & rooftop)
- `TANPA_DINDING`: pasangan ruangan bersebelahan tanpa dinding (open space)
- `VOID`: ukuran void (4 → 4×4 m, 3 → 3×3 m); tangga L ikut menyesuaikan
