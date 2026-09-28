// ================== DATA DENAH ==================
// Satuan meter. x ke kanan, y ke belakang (y=0 = sisi depan/jalan).
//
// RUANG.jenis:
//   "ruang"   = berdinding penuh + atap
//   "terbuka" = hanya lantai (carport)
//   "balkon"  = lantai + railing
//   "tangga"  = tangga; bentuk & anak tangganya dihitung oleh tanggaL()
//   "mezanin" = lantai atas di tepi void: railing di sisi yang menghadap void
//   "void"    = lubang tembus 2 lantai: tanpa pelat lantai, dinding luar + atap
// RUANG.finish : pola lantai di denah — "keramik" | "parket" | "basah" | "beton"
// RUANG.perabot: [tipe, cx, cy, rotasi°, w?, h?]  (titik tengah, lihat simbol.js)
// RUANG.label  : [x, y] posisi label (opsional, default tengah ruangan; false = tanpa label)
// RUANG.grup   : potongan dengan grup sama = satu ruangan (bentuk L), tanpa dinding di antaranya
// perabot "mobil" juga tampil sebagai mobil di 3D

// Orientasi mengikuti sketsa awal: jalan di sisi KANAN (x = 12), lebar muka 10 m (arah y).
export const LAHAN = { w: 12, h: 10 };
export const JALAN = "kanan";           // "atas" | "kanan" — sisi lahan yang menghadap jalan
export const TINGGI_LANTAI = 3;
export const TEBAL_PELAT = 0.12;
export const TEBAL_DINDING = 0.15;

export const TAHAP = {
  1: { nama: "Tahap 1 – Lantai 1",          warna: "#e8a33d" },
  2: { nama: "Tahap 2 – Tangga + Lantai 2", warna: "#4f9d5a" },
};

// Void di pojok kiri-atas living room (ganti ke 3 untuk void 3×3); tangga L ada di dalamnya
export const VOID = 4;
const VOID_RECT = { x: 0, y: 0, w: VOID, h: VOID };

// Tangga L. Dihitung di bingkai lokal: lengan 1 menyusuri sisi bawah (ke kanan),
// bordes di pojok kanan-bawah, lengan 2 menyusuri sisi kanan (ke atas) dan tiba di tepi atas.
// Bingkai lokal lalu diputar/dicerminkan (transpose, flipX, flipY) ke posisi sebenarnya.
export function tanggaL(v, { transpose = false, flipX = false, flipY = false } = {}, lebar = 1, optrede = 0.175, antrede = 0.27) {
  const W = transpose ? v.h : v.w, H = transpose ? v.w : v.h;
  const N = Math.round(TINGGI_LANTAI / optrede);  // jumlah optrede sampai lantai 2
  const naik = TINGGI_LANTAI / N;
  const bordes = { x: W - lebar, y: H - lebar, w: lebar, h: lebar };
  const len2 = bordes.y;
  const n2 = Math.max(1, Math.round(len2 / antrede)), d2 = len2 / n2;
  const n1 = Math.max(1, N - 2 - n2);
  const d1 = Math.min(antrede, (W - lebar) / n1);
  const x0 = bordes.x - n1 * d1;
  const lokal = [];
  for (let i = 1; i <= n1; i++) lokal.push({ x: x0 + (i - 1) * d1, y: bordes.y, w: d1, h: lebar, top: i * naik });
  lokal.push({ ...bordes, top: (n1 + 1) * naik, bordes: true });
  for (let j = 1; j <= n2; j++) lokal.push({ x: bordes.x, y: bordes.y - j * d2, w: lebar, h: d2, top: (n1 + 1 + j) * naik });

  const titik = ([x, y]) => {
    if (transpose) [x, y] = [y, x];
    if (flipX) x = v.w - x;
    if (flipY) y = v.h - y;
    return [v.x + x, v.y + y];
  };
  const kotak = (r) => {
    const [ax, ay] = titik([r.x, r.y]), [bx, by] = titik([r.x + r.w, r.y + r.h]);
    return { ...r, x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
  };
  const c = lebar / 2;
  return {
    anak: lokal.map(kotak), jumlah: N, naik,
    panah: [[x0 + 0.1, bordes.y + c], [bordes.x + c, bordes.y + c], [bordes.x + c, 0.1]].map(titik),
  };
}

export const RUANG = [
  // ---- Tahap 1, lantai 1 (full 12 × 10 m) ----
  { nama: "Living Room", x: 0, y: 0, w: 6, h: 4, lantai: 1, tahap: 1, jenis: "ruang", finish: "keramik",
    label: [4.6, 3.35],
    perabot: [["tv", 5.75, 2.1, 90], ["mejaTamu", 4.55, 2.1, 0, 0.5, 1.0], ["sofa", 3.3, 2.1, 270]] },
  { nama: "Garasi", x: 6, y: 0, w: 6, h: 6.5, lantai: 1, tahap: 1, jenis: "terbuka", finish: "beton",
    label: [9.2, 6.05],
    perabot: [["mobil", 9.3, 1.9, 90], ["mobil", 9.3, 4.6, 90]] },
  { nama: "Gudang", x: 0, y: 4, w: 2, h: 2.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "keramik",
    perabot: [["rak", 0.3, 5.25, 0, 0.35, 1.9]] },
  { nama: "R. Makan", x: 2, y: 4, w: 4, h: 2.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "keramik",
    label: [5.2, 6.2],
    perabot: [["mejaMakan", 3.8, 5.25, 0]] },
  { nama: "Dapur", x: 0, y: 6.5, w: 4, h: 3.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "keramik",
    perabot: [["counter", 1.8, 9.6, 0, 3.3, 0.6], ["kompor", 1.0, 9.6, 180], ["sink", 2.6, 9.6, 180],
              ["kulkas", 0.45, 7.0, 270]] },
  // area mesin cuci & KM tunggal berbagi dinding basah
  { nama: "Cuci", x: 4, y: 6.5, w: 2, h: 1.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "basah",
    label: [4.75, 7.3],
    perabot: [["mesinCuci", 5.6, 7.55, 0]] },
  { nama: "KM", x: 4, y: 8, w: 2, h: 2, lantai: 1, tahap: 1, jenis: "ruang", finish: "basah",
    label: [5.0, 8.85],
    perabot: [["shower", 4.55, 9.45, 0], ["kloset", 5.55, 9.5, 90], ["wastafel", 5.75, 8.5, 90]] },
  { nama: "Studio", x: 6, y: 6.5, w: 4, h: 3.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "parket",
    label: [8.6, 7.6],
    perabot: [["mejaKerja", 8.4, 9.6, 180, 2.0, 0.6], ["kursi", 8.4, 8.95, 0], ["sofa", 6.55, 8.3, 270, 1.8, 0.8]] },
  // ruang kosong 2 m di depan studio untuk gerbang besar (menyambung dengan garasi)
  { nama: "Halaman", x: 10, y: 6.5, w: 2, h: 3.5, lantai: 1, tahap: 1, jenis: "terbuka", finish: "beton" },

  // ---- Tahap 2: tangga L di void + lantai 2 full 12 × 10 m (usulan) ----
  // tangga: naik menyusuri dinding kiri, bordes di pojok kiri-atas, lalu menyusuri dinding atas ke mezanin
  { nama: "Tangga", ...VOID_RECT, lantai: 1, tahap: 2, jenis: "tangga",
    ...tanggaL(VOID_RECT, { transpose: true, flipX: true, flipY: true }) },
  { nama: "Void", ...VOID_RECT, lantai: 2, tahap: 2, jenis: "void" },
  // dapur kering = ruang pusat lantai 2 (terbuka ke void); tangga tiba di sini dan
  // hampir semua kamar berpintu langsung ke sini, jadi tidak perlu lorong panjang
  { nama: "Dapur Kering", x: VOID, y: 0, w: 7.5 - VOID, h: 5.5, lantai: 2, tahap: 2, jenis: "mezanin", finish: "keramik",
    label: [5.8, 4.3],
    perabot: [["counter", 6.45, 0.45, 0, 1.9, 0.6], ["sink", 6.1, 0.45, 0], ["kompor", 7.0, 0.45, 0],
              ["mejaMakan", 5.8, 2.5, 0], ["mesinCuci", 7.1, 5.1, 0]] },
  { nama: "Mezanin", x: 0, y: VOID, w: VOID, h: 4 - VOID, lantai: 2, tahap: 2, jenis: "mezanin", finish: "parket" },
  { nama: "Studio Kerja", x: 7.5, y: 0, w: 3, h: 4, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [9.0, 2.6],
    perabot: [["mejaKerja", 9.0, 0.45, 0, 2.0, 0.6], ["kursi", 9.0, 1.05, 180], ["rak", 7.8, 1.4, 0, 0.35, 1.6]] },
  { nama: "Balkon", x: 10.5, y: 0, w: 1.5, h: 4, lantai: 2, tahap: 2, jenis: "balkon", finish: "keramik",
    label: [11.25, 3.2],
    perabot: [["kursi", 11.25, 0.8, 90], ["kursi", 11.25, 1.6, 90]] },
  // kamar utama bentuk L (dua potongan satu grup = tanpa dinding di antaranya) + KM dalam
  { nama: "K. Tidur Utama", x: 9.5, y: 4, w: 2.5, h: 6, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket", grup: "kt-utama",
    label: [9.6, 6.9],
    perabot: [["kasur", 10.75, 8.9, 180, 1.8, 2.0], ["lemari", 10.5, 4.4, 0, 2.0, 0.6]] },
  { nama: "K. Tidur Utama", x: 7.5, y: 4, w: 2, h: 3.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket", grup: "kt-utama",
    label: false },
  { nama: "KM Dalam", x: 7.5, y: 7.5, w: 2, h: 2.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "basah",
    label: [8.3, 8.45],
    perabot: [["kloset", 7.9, 9.55, 180], ["shower", 8.95, 9.45, 0], ["wastafel", 7.8, 8.1, 270]] },
  { nama: "K. Anak", x: 0, y: 4, w: 4, h: 3, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [2.9, 5.3],
    perabot: [["kasur", 1.1, 5.2, 270, 1.0, 2.0], ["mejaKerja", 1.0, 6.6, 180, 1.2, 0.5], ["kursi", 1.0, 6.0, 0],
              ["lemari", 3.0, 6.6, 180, 1.6, 0.6]] },
  // selasar pendek ke kamar tamu & KM
  { nama: "Selasar", x: 4, y: 5.5, w: 1, h: 3, lantai: 2, tahap: 2, jenis: "mezanin", finish: "parket", label: false },
  { nama: "KM", x: 5, y: 5.5, w: 2.5, h: 3, lantai: 2, tahap: 2, jenis: "ruang", finish: "basah",
    label: [6.2, 6.9],
    perabot: [["kloset", 5.6, 8.05, 180], ["shower", 6.95, 8.0, 0], ["wastafel", 7.25, 6.2, 90]] },
  // kamar tamu bentuk L
  { nama: "K. Tamu", x: 0, y: 7, w: 4, h: 3, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket", grup: "kt-tamu",
    label: [2.9, 7.6],
    perabot: [["kasur", 1.1, 8.5, 270]] },
  { nama: "K. Tamu", x: 4, y: 8.5, w: 3.5, h: 1.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket", grup: "kt-tamu",
    label: false,
    perabot: [["lemari", 6.2, 9.65, 180, 2.0, 0.6]] },
].filter((r) => r.w > 0 && r.h > 0);

// ================== PINTU & JENDELA ==================
// garis: "h" = dinding horizontal di y=pos, "v" = dinding vertikal di x=pos
// a..b : rentang bukaan sepanjang dinding
// tipe : "pintu" | "bukaan" (tanpa daun) | "jendela" | "boven" (jendela atas KM) | "jendelaTinggi"
// pintu: engsel "a"/"b" (ujung mana), buka +1/-1 (daun membuka ke arah +y/+x atau -y/-x)
export const BUKAAN = [
  // lantai 1
  { lantai: 1, tipe: "pintu",   garis: "v", pos: 6,   a: 4.5, b: 5.5, engsel: "a", buka: -1 },  // masuk dari garasi
  { lantai: 1, tipe: "bukaan",  garis: "h", pos: 4,   a: 2.5, b: 5.5 },                          // living–r. makan
  { lantai: 1, tipe: "pintu",   garis: "v", pos: 2,   a: 5.2, b: 5.9, engsel: "b", buka: -1 },  // gudang
  { lantai: 1, tipe: "bukaan",  garis: "h", pos: 6.5, a: 2.3, b: 3.8 },                          // r. makan–dapur
  { lantai: 1, tipe: "bukaan",  garis: "h", pos: 6.5, a: 4.2, b: 5.8 },                          // r. makan–cuci
  { lantai: 1, tipe: "bukaan",  garis: "v", pos: 4,   a: 6.7, b: 7.8 },                          // dapur–cuci
  { lantai: 1, tipe: "pintu",   garis: "h", pos: 8,   a: 4.2, b: 4.9, engsel: "a", buka: +1 },  // KM
  { lantai: 1, tipe: "pintu",   garis: "h", pos: 6.5, a: 7.0, b: 7.9, engsel: "a", buka: +1 },  // studio
  { lantai: 1, tipe: "jendela", garis: "h", pos: 0,   a: 4.3, b: 5.7 },
  { lantai: 1, tipe: "jendela", garis: "h", pos: 10,  a: 1.8, b: 3.2 },
  { lantai: 1, tipe: "jendela", garis: "v", pos: 0,   a: 7.6, b: 8.9 },
  { lantai: 1, tipe: "boven",   garis: "v", pos: 0,   a: 4.8, b: 5.7 },
  { lantai: 1, tipe: "boven",   garis: "h", pos: 10,  a: 4.6, b: 5.4 },
  { lantai: 1, tipe: "jendela", garis: "v", pos: 10,  a: 7.6, b: 9.4 },
  { lantai: 1, tipe: "jendela", garis: "h", pos: 10,  a: 7.5, b: 9.3 },
  // lantai 2
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 7.5,  a: 2.8, b: 3.6, engsel: "b", buka: +1 },  // studio kerja
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 10.5, a: 1.6, b: 2.5, engsel: "a", buka: +1 },  // ke balkon
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 7.5,  a: 4.3, b: 5.1, engsel: "a", buka: +1 },  // K. utama
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 9.5,  a: 8.0, b: 8.7, engsel: "a", buka: -1 },  // KM dalam
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 4,    a: 4.5, b: 5.3, engsel: "a", buka: -1 },  // K. anak
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 5,    a: 5.8, b: 6.5, engsel: "a", buka: +1 },  // KM
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 8.5,  a: 4.1, b: 4.9, engsel: "a", buka: +1 },  // K. tamu
  { lantai: 2, tipe: "jendela", garis: "h", pos: 0,    a: 8.3, b: 9.7 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 12,   a: 5.2, b: 7.2 },
  { lantai: 2, tipe: "boven",   garis: "h", pos: 10,   a: 8.1, b: 8.7 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 0,    a: 4.8, b: 6.2 },
  { lantai: 2, tipe: "jendela", garis: "h", pos: 10,   a: 2.5, b: 3.7 },
  { lantai: 2, tipe: "jendelaTinggi", garis: "v", pos: 0, a: 0.5, b: 3.5 },  // cahaya ke void
  { lantai: 2, tipe: "jendelaTinggi", garis: "h", pos: 0, a: 0.5, b: 3.5 },
];

// tinggi bukaan dari lantai: [ambang bawah, ambang atas]
export const TINGGI_BUKAAN = {
  pintu: [0, 2.1], bukaan: [0, 2.4], jendela: [0.9, 2.1], boven: [1.7, 2.1], jendelaTinggi: [0.3, 2.6],
};

export const BANGUNAN = ["ruang", "mezanin"];         // dihitung luas bangunan
export const TIDAK_DIHITUNG = ["void", "tangga"];     // void bukan lantai; tangga di dalam ruang lain
