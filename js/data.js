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
//   "rooftop" = lantai atap terbuka, dikelilingi tembok parapet (TINGGI_PARAPET)
//   "pendopo" = paviliun terbuka: deck kayu, tiang, atap limasan
//   "zona"    = penanda area (instalasi, jemuran) — hanya garis & label, isinya lewat perabot;
//               kanopi: true = diberi atap polikarbonat; diAtap: true = isinya di atas atap ruang tangga
//   "taman"   = taman kecil (rumput) di atas lantai lain
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
export const TINGGI_PARAPET = 1.3;

export const TAHAP = {
  1: { nama: "Tahap 1 – Lantai 1",          warna: "#e8a33d" },
  2: { nama: "Tahap 2 – Tangga + Lantai 2", warna: "#4f9d5a" },
  3: { nama: "Tahap 3 – Rooftop",           warna: "#4a78b8" },
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

// Tangga lurus di dalam persegi v, naik ke arah `arah` ("+x" | "-x" | "+y" | "-y").
export function tanggaLurus(v, arah = "-x", optrede = 0.175) {
  const N = Math.round(TINGGI_LANTAI / optrede), naik = TINGGI_LANTAI / N, n = N - 1;
  const horiz = arah.endsWith("x"), neg = arah.startsWith("-");
  const len = horiz ? v.w : v.h, d = len / n;
  const anak = [];
  for (let i = 1; i <= n; i++) {
    const off = neg ? len - i * d : (i - 1) * d;
    anak.push(horiz ? { x: v.x + off, y: v.y, w: d, h: v.h, top: i * naik }
                    : { x: v.x, y: v.y + off, w: v.w, h: d, top: i * naik });
  }
  const c = horiz ? v.y + v.h / 2 : v.x + v.w / 2;
  const [a0, a1] = neg ? [len - 0.1, 0.1] : [0.1, len - 0.1];
  const panah = horiz ? [[v.x + a0, c], [v.x + a1, c]] : [[c, v.y + a0], [c, v.y + a1]];
  return { anak, jumlah: N, naik, panah };
}

// tangga L ke rooftop, melayang di dalam void: lengan 1 menyusuri sisi selatan void ke barat,
// bordes di pojok barat daya, lengan 2 menyusuri dinding barat ke utara
const TANGGA_ATAS = { x: 0, y: 1.9, w: 4, h: 2.1 };

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
  // dapur kering + mesin cuci, terbuka ke void; tangga tiba di sini
  { nama: "Dapur Kering", x: VOID, y: 0, w: 7 - VOID, h: 4, lantai: 2, tahap: 2, jenis: "mezanin", finish: "keramik",
    label: [5.3, 2.4],
    perabot: [["mesinCuci", 6.6, 0.5, 0], ["counter", 6.6, 2.2, 0, 0.6, 2.4], ["sink", 6.6, 1.8, 90], ["kompor", 6.6, 2.9, 90]] },
  { nama: "Mezanin", x: 0, y: VOID, w: VOID, h: 4 - VOID, lantai: 2, tahap: 2, jenis: "mezanin", finish: "parket" },
  // satu koridor; bagian kirinya sekaligus tempat memandang ke void
  { nama: "Koridor", x: 0, y: 4, w: 8, h: 1, lantai: 2, tahap: 2, jenis: "mezanin", finish: "parket", label: [5.6, 4.45] },
  { nama: "Studio Kerja", x: 7, y: 0, w: 3.5, h: 4, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [8.7, 2.6],
    perabot: [["mejaKerja", 8.5, 0.45, 0, 2.0, 0.6], ["kursi", 8.5, 1.05, 180], ["rak", 7.3, 2.4, 0, 0.35, 1.8]] },
  { nama: "Balkon", x: 10.5, y: 0, w: 1.5, h: 4, lantai: 2, tahap: 2, jenis: "balkon", finish: "keramik",
    label: [11.25, 3.2],
    perabot: [["kursi", 11.25, 0.8, 90], ["kursi", 11.25, 1.6, 90]] },
  // ---- suite utama: kamar → walk-in closet → KM dalam ----
  { nama: "K. Tidur Utama", x: 8, y: 4, w: 4, h: 6, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [10.2, 6.9],
    perabot: [["kasur", 10.3, 8.9, 180, 1.8, 2.0], ["sofa", 10.5, 4.55, 0, 1.8, 0.8]] },
  { nama: "Walk-in", x: 6.8, y: 5, w: 1.2, h: 2.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [7.55, 6.0],
    perabot: [["lemari", 7.2, 6.25, 270, 2.0, 0.6]] },
  { nama: "KM Dalam", x: 5, y: 7.5, w: 3, h: 2.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "basah",
    label: [6.5, 8.35],
    perabot: [["wastafel", 5.3, 8.0, 270], ["wastafel", 5.3, 8.6, 270], ["kloset", 6.3, 9.55, 180], ["shower", 7.45, 9.45, 0, 0.9, 0.9]] },
  // ---- kamar anak, kamar tamu, KM bersama ----
  { nama: "K. Anak", x: 0, y: 5, w: 2.5, h: 5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [1.45, 7.2],
    perabot: [["kasur", 0.65, 8.9, 180, 1.0, 2.0], ["mejaKerja", 0.35, 6.3, 270, 1.2, 0.6], ["kursi", 0.95, 6.3, 90],
              ["lemari", 2.15, 8.6, 90, 1.4, 0.6]] },
  { nama: "K. Tamu", x: 2.5, y: 5, w: 2.5, h: 5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [3.5, 7.1],
    perabot: [["kasur", 3.5, 8.9, 180], ["lemari", 4.7, 6.3, 90, 1.4, 0.6]] },
  { nama: "KM", x: 5, y: 5, w: 1.8, h: 2.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "basah",
    label: [5.55, 6.1],
    perabot: [["kloset", 5.4, 7.05, 180], ["shower", 6.3, 7.0, 0], ["wastafel", 6.55, 5.6, 90]] },

  // ---- Tahap 3: tangga ke rooftop + lantai 3 (rooftop terbuka, tanpa kamar) ----
  // tangga lurus berangkat dari dapur kering (sebelah tempat tangga bawah tiba), naik ke barat
  { nama: "Tangga Rooftop", ...TANGGA_ATAS, lantai: 2, tahap: 3, jenis: "tangga",
    ...tanggaL(TANGGA_ATAS, { flipX: true }, 1, 0.175, 0.28) },
  // rumah tangga beratap (bentuk L): lubang tangga + bordes 1,2 × 1 m tempat tangga tiba,
  // pintu di bordes langsung membuka ke rooftop
  { nama: "Lubang Tangga", ...TANGGA_ATAS, lantai: 3, tahap: 3, jenis: "void", grup: "r-tangga", label: false,
    lubangTangga: true },
  { nama: "R. Tangga", x: 0, y: 0.7, w: 1.2, h: 1.2, lantai: 3, tahap: 3, jenis: "ruang", grup: "r-tangga", finish: "keramik",
    label: false },
  // lantai rooftop, dikelilingi tembok parapet 130 cm
  { nama: "Rooftop", x: 0, y: 0, w: 12, h: 0.7, lantai: 3, tahap: 3, jenis: "rooftop", grup: "rooftop", finish: "beton", label: false },
  { nama: "Rooftop", x: 1.2, y: 0.7, w: 10.8, h: 1.2, lantai: 3, tahap: 3, jenis: "rooftop", grup: "rooftop", finish: "beton",
    label: [3.2, 1.2] },
  { nama: "Rooftop", x: 4, y: 1.9, w: 8, h: 2.1, lantai: 3, tahap: 3, jenis: "rooftop", grup: "rooftop", finish: "beton", label: false },
  { nama: "Rooftop", x: 0, y: 4, w: 12, h: 6, lantai: 3, tahap: 3, jenis: "rooftop", grup: "rooftop", finish: "beton", label: false,
    perabot: [["pot", 4.7, 1.0, 0], ["pot", 11.4, 1.0, 0]] },
  // pendopo untuk berkumpul: deck kayu, tiang besi, atap limasan genteng
  { nama: "Pendopo", x: 5.5, y: 1.5, w: 5, h: 6, lantai: 3, tahap: 3, jenis: "pendopo", finish: "deck",
    label: [8, 2.25],
    perabot: [["sofa", 8, 3.2, 0], ["sofa", 8, 5.8, 180], ["kursi", 9.6, 4.5, 90], ["kursi", 6.4, 4.5, 270],
              ["mejaTamu", 8, 4.5, 0, 1.2, 0.6]] },
  // taman kecil berumput di selatan pendopo
  { nama: "Taman", x: 4.6, y: 8.1, w: 7.2, h: 1.75, lantai: 3, tahap: 3, jenis: "taman", finish: "rumput",
    perabot: [["pot", 5.1, 8.6, 0], ["pot", 11.3, 8.6, 0], ["pot", 11.3, 9.35, 0], ["kursi", 7.4, 9.2, 0], ["kursi", 8.6, 9.2, 0]] },
  { nama: "Taman", x: 10.9, y: 1.5, w: 0.9, h: 6.4, lantai: 3, tahap: 3, jenis: "taman", finish: "rumput", label: false,
    perabot: [["pot", 11.35, 2.3, 0], ["pot", 11.35, 4.6, 0], ["pot", 11.35, 6.9, 0]] },
  // pemanas air surya di tempat terbuka (butuh sinar matahari langsung)
  { nama: "Air Panas", x: 0.3, y: 4.15, w: 3.5, h: 1.15, lantai: 3, tahap: 3, jenis: "zona",
    perabot: [["pemanasAir", 2.05, 4.72, 0, 2.0, 1.0]] },
  // semua instalasi terpusat di bawah atap polikarbonat sederhana
  { nama: "Instalasi · atap polikarbonat", x: 0.15, y: 5.45, w: 3.85, h: 4.4, lantai: 3, tahap: 3, jenis: "zona", kanopi: true,
    perabot: [["acOutdoor", 0.4, 5.95, 270], ["acOutdoor", 0.4, 6.95, 270], ["acOutdoor", 0.4, 7.95, 270], ["acOutdoor", 0.4, 8.95, 270],
              ["jemuran", 2.35, 6.4, 0, 2.7, 0.6], ["tandon", 1.6, 9.2, 0], ["tandon", 2.9, 9.2, 0], ["pompa", 3.6, 8.2, 0]] },
  // antena, radio, parabola & penangkal petir di atas atap ruang tangga (titik tertinggi, tidak terhalang)
  { nama: "Antena & Komunikasi (di atap R. Tangga)", x: 0.15, y: 2.05, w: 3.7, h: 1.8, lantai: 3, tahap: 3, jenis: "zona",
    diAtap: true,
    perabot: [["antena", 0.8, 3.0, 0], ["parabola", 2.6, 3.0, 0]] },
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
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 4,    a: 7.3, b: 8.1, engsel: "a", buka: -1 },  // studio kerja
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 10.5, a: 1.6, b: 2.5, engsel: "a", buka: +1 },  // ke balkon
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 8,    a: 4.1, b: 4.9, engsel: "a", buka: +1 },  // K. utama
  { lantai: 2, tipe: "bukaan",  garis: "v", pos: 8,    a: 5.4, b: 6.2 },                          // kamar–walk-in
  { lantai: 2, tipe: "bukaan",  garis: "h", pos: 7.5,  a: 7.0, b: 7.9 },                          // walk-in–KM dalam
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 5,    a: 5.2, b: 5.9, engsel: "a", buka: +1 },  // KM bersama
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 5,    a: 1.5, b: 2.3, engsel: "b", buka: +1 },  // K. anak
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 5,    a: 2.7, b: 3.5, engsel: "a", buka: +1 },  // K. tamu
  { lantai: 2, tipe: "jendela", garis: "h", pos: 0,    a: 5.0, b: 6.2 },
  { lantai: 2, tipe: "jendela", garis: "h", pos: 0,    a: 7.8, b: 9.2 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 12,   a: 5.2, b: 7.2 },
  { lantai: 2, tipe: "boven",   garis: "h", pos: 10,   a: 6.0, b: 6.6 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 0,    a: 7.8, b: 9.2 },
  { lantai: 2, tipe: "jendela", garis: "h", pos: 10,   a: 2.9, b: 4.1 },
  { lantai: 2, tipe: "jendelaTinggi", garis: "v", pos: 0, a: 0.3, b: 1.8 },  // cahaya ke void
  // lantai 3
  { lantai: 3, tipe: "pintu",   garis: "v", pos: 1.2,  a: 0.9, b: 1.7, engsel: "a", buka: +1 },   // bordes → rooftop
  { lantai: 2, tipe: "jendelaTinggi", garis: "h", pos: 0, a: 0.5, b: 3.5 },
];

// tinggi bukaan dari lantai: [ambang bawah, ambang atas]
export const TINGGI_BUKAAN = {
  pintu: [0, 2.1], bukaan: [0, 2.4], jendela: [0.9, 2.1], boven: [1.7, 2.1], jendelaTinggi: [0.3, 2.6],
};

export const BANGUNAN = ["ruang", "mezanin"];         // dihitung luas bangunan
// void bukan lantai; tangga di dalam ruang lain; pendopo & zona sudah termasuk luas rooftop
export const TIDAK_DIHITUNG = ["void", "tangga", "pendopo", "zona", "taman"];
