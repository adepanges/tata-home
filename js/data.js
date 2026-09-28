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
// RUANG.label  : [x, y] posisi label (opsional, default tengah ruangan)
// RUANG.mobil  : n  -> n mobil di carport (juga tampil di 3D)

export const LAHAN = { w: 10, h: 12 };
export const TINGGI_LANTAI = 3;
export const TEBAL_PELAT = 0.12;
export const TEBAL_DINDING = 0.15;

export const TAHAP = {
  1: { nama: "Tahap 1 – Lantai 1",          warna: "#e8a33d" },
  2: { nama: "Tahap 2 – Tangga + Lantai 2", warna: "#4f9d5a" },
};

// Ukuran void di atas living room (ganti ke 3 untuk void 3×3)
export const VOID = 4;
const LIV = { x: 4, y: 5.5, w: 6, h: 6.5 };  // living room
// void di pojok kanan-belakang living room; tangga L ada di dalamnya
const VOID_RECT = { x: LIV.x + LIV.w - VOID, y: LIV.y + LIV.h - VOID, w: VOID, h: VOID };

// Tangga L di dalam void: naik menyusuri dinding belakang (ke kanan),
// bordes di pojok kanan-belakang, lalu naik menyusuri dinding kanan (ke depan)
// dan tiba di selasar lantai 2 pada tepi depan void.
export function tanggaL(v, lebar = 1, optrede = 0.175, antrede = 0.27) {
  const N = Math.round(TINGGI_LANTAI / optrede);  // jumlah optrede sampai lantai 2
  const naik = TINGGI_LANTAI / N;
  const bordes = { x: v.x + v.w - lebar, y: v.y + v.h - lebar, w: lebar, h: lebar };
  const len2 = bordes.y - v.y;
  const n2 = Math.max(1, Math.round(len2 / antrede)), d2 = len2 / n2;
  const n1 = Math.max(1, N - 2 - n2);
  const d1 = Math.min(antrede, (v.w - lebar) / n1);
  const x0 = bordes.x - n1 * d1;
  const anak = [];
  for (let i = 1; i <= n1; i++)
    anak.push({ x: x0 + (i - 1) * d1, y: bordes.y, w: d1, h: lebar, top: i * naik });
  anak.push({ ...bordes, top: (n1 + 1) * naik, bordes: true });
  for (let j = 1; j <= n2; j++)
    anak.push({ x: bordes.x, y: bordes.y - j * d2, w: lebar, h: d2, top: (n1 + 1 + j) * naik });
  const c = lebar / 2;
  return {
    anak, jumlah: N, naik,
    panah: [[x0 + 0.1, bordes.y + c], [bordes.x + c, bordes.y + c], [bordes.x + c, v.y + 0.1]],
  };
}

export const RUANG = [
  // ---- Tahap 1, lantai 1 (full 10 × 12 m) ----
  { nama: "Carport", x: 4, y: 0, w: 6, h: 5.5, lantai: 1, tahap: 1, jenis: "terbuka", finish: "beton",
    mobil: 2, label: [7, 5.05],
    perabot: [["mobil", 5.7, 2.6, 0], ["mobil", 8.3, 2.6, 0]] },
  { nama: "Studio", x: 0, y: 0, w: 4, h: 4.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "parket",
    perabot: [["mejaKerja", 2.0, 0.45, 0, 1.6, 0.6], ["kursi", 2.0, 1.05, 180],
              ["rak", 0.3, 2.3, 0, 0.35, 2.0], ["sofa", 2.0, 4.0, 180, 1.8, 0.8]] },
  { nama: "Dapur", x: 0, y: 4.5, w: 4, h: 5, lantai: 1, tahap: 1, jenis: "ruang", finish: "keramik",
    label: [2.6, 5.2],
    perabot: [["counter", 0.4, 6.35, 0, 0.6, 3.3], ["kompor", 0.4, 5.3, 90], ["sink", 0.4, 6.75, 90],
              ["kulkas", 0.45, 8.45, 90], ["mejaMakan", 2.5, 7.1, 0]] },
  { nama: "Toilet", x: 0, y: 9.5, w: 2, h: 2.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "basah",
    label: [1.1, 10.7],
    perabot: [["kloset", 1.0, 11.55, 180], ["wastafel", 0.3, 10.4, 270]] },
  { nama: "KM Kecil", x: 2, y: 9.5, w: 2, h: 2.5, lantai: 1, tahap: 1, jenis: "ruang", finish: "basah",
    label: [3.0, 10.6],
    perabot: [["shower", 3.45, 11.45, 0], ["wastafel", 2.3, 11.6, 270]] },
  { nama: "Living Room", ...LIV, lantai: 1, tahap: 1, jenis: "ruang", finish: "keramik",
    label: [7.6, 6.7],
    perabot: [["tv", 4.3, 9.4, 270], ["mejaTamu", 5.3, 9.4, 0, 0.5, 1.0], ["sofa", 6.5, 9.4, 90]] },

  // ---- Tahap 2: tangga L di void + lantai 2 full 10 × 12 m (usulan) ----
  { nama: "Tangga", ...VOID_RECT, lantai: 1, tahap: 2, jenis: "tangga", ...tanggaL(VOID_RECT) },
  { nama: "Void", ...VOID_RECT, lantai: 2, tahap: 2, jenis: "void" },
  { nama: "K. Tidur Utama", x: 0, y: 0, w: 4, h: 4.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [2.0, 3.35],
    perabot: [["kasur", 1.1, 2.1, 270], ["lemari", 1.4, 4.1, 0, 2.2, 0.6]] },
  { nama: "K. Tidur 3", x: 4, y: 0, w: 3, h: 4.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [5.6, 3.55],
    perabot: [["kasur", 5.9, 2.1, 90], ["lemari", 4.4, 1.2, 90, 1.6, 0.6]] },
  { nama: "R. Santai", x: 7, y: 0, w: 3, h: 4.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [8.5, 3.7],
    perabot: [["sofa", 9.45, 2.2, 90], ["tv", 7.3, 2.2, 270], ["mejaTamu", 8.3, 2.2, 0, 0.5, 1.0]] },
  { nama: "Koridor", x: 0, y: 4.5, w: 10, h: 1, lantai: 2, tahap: 2, jenis: "mezanin", finish: "parket" },
  { nama: "K. Tidur 2", x: 0, y: 5.5, w: 4, h: 4, lantai: 2, tahap: 2, jenis: "ruang", finish: "parket",
    label: [2.0, 6.1],
    perabot: [["kasur", 1.1, 7.5, 270], ["lemari", 1.4, 9.1, 0, 2.0, 0.6]] },
  { nama: "KM Atas", x: 0, y: 9.5, w: 4, h: 2.5, lantai: 2, tahap: 2, jenis: "ruang", finish: "basah",
    label: [2.2, 10.4],
    perabot: [["kloset", 0.8, 11.55, 180], ["wastafel", 0.3, 10.2, 270], ["shower", 2.5, 11.45, 0]] },
  { nama: "Mezanin", x: LIV.x, y: LIV.y, w: LIV.w - VOID, h: LIV.h, lantai: 2, tahap: 2, jenis: "mezanin",
    finish: "parket", label: [5.15, 6.6],
    perabot: [["rak", 4.3, 8.3, 0, 0.35, 2.0]] },
  { nama: "Selasar", x: VOID_RECT.x, y: LIV.y, w: VOID, h: LIV.h - VOID, lantai: 2, tahap: 2, jenis: "mezanin",
    finish: "parket" },
].filter((r) => r.w > 0 && r.h > 0);

// ================== PINTU & JENDELA ==================
// garis: "h" = dinding horizontal di y=pos, "v" = dinding vertikal di x=pos
// a..b : rentang bukaan sepanjang dinding
// tipe : "pintu" | "bukaan" (tanpa daun) | "jendela" | "boven" (jendela atas KM) | "jendelaTinggi"
// pintu: engsel "a"/"b" (ujung mana), buka +1/-1 (daun membuka ke arah +y/+x atau -y/-x)
export const BUKAAN = [
  // lantai 1
  { lantai: 1, tipe: "pintu",   garis: "h", pos: 5.5, a: 5.0, b: 6.0, engsel: "a", buka: +1 },  // pintu utama
  { lantai: 1, tipe: "pintu",   garis: "v", pos: 4,   a: 1.0, b: 1.9, engsel: "a", buka: -1 },  // studio
  { lantai: 1, tipe: "bukaan",  garis: "v", pos: 4,   a: 6.5, b: 7.7 },                          // dapur–living
  { lantai: 1, tipe: "pintu",   garis: "h", pos: 9.5, a: 0.6, b: 1.4, engsel: "b", buka: +1 },  // toilet
  { lantai: 1, tipe: "pintu",   garis: "h", pos: 9.5, a: 2.6, b: 3.4, engsel: "a", buka: +1 },  // KM kecil
  { lantai: 1, tipe: "jendela", garis: "h", pos: 0,   a: 1.0, b: 3.0 },
  { lantai: 1, tipe: "jendela", garis: "v", pos: 0,   a: 6.0, b: 7.5 },
  { lantai: 1, tipe: "boven",   garis: "h", pos: 12,  a: 0.6, b: 1.2 },
  { lantai: 1, tipe: "boven",   garis: "h", pos: 12,  a: 2.7, b: 3.3 },
  { lantai: 1, tipe: "jendela", garis: "v", pos: 10,  a: 6.0, b: 7.5 },
  { lantai: 1, tipe: "jendela", garis: "h", pos: 12,  a: 4.4, b: 5.6 },
  // lantai 2
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 4.5, a: 2.8, b: 3.7, engsel: "b", buka: -1 },  // KT utama
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 4.5, a: 4.3, b: 5.1, engsel: "a", buka: -1 },  // KT 3
  { lantai: 2, tipe: "pintu",   garis: "h", pos: 4.5, a: 7.3, b: 8.1, engsel: "a", buka: -1 },  // R. santai
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 4,   a: 6.0, b: 6.8, engsel: "a", buka: -1 },  // KT 2
  { lantai: 2, tipe: "pintu",   garis: "v", pos: 4,   a: 10.3, b: 11.0, engsel: "b", buka: -1 }, // KM atas
  { lantai: 2, tipe: "jendela", garis: "h", pos: 0,   a: 1.0, b: 3.0 },
  { lantai: 2, tipe: "jendela", garis: "h", pos: 0,   a: 4.8, b: 6.2 },
  { lantai: 2, tipe: "jendela", garis: "h", pos: 0,   a: 7.5, b: 9.5 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 0,   a: 6.5, b: 8.5 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 0,   a: 4.65, b: 5.35 },
  { lantai: 2, tipe: "jendela", garis: "v", pos: 10,  a: 4.65, b: 5.35 },
  { lantai: 2, tipe: "boven",   garis: "h", pos: 12,  a: 1.5, b: 2.1 },
  { lantai: 2, tipe: "jendelaTinggi", garis: "v", pos: 10, a: 8.5, b: 11.5 },  // cahaya ke void
  { lantai: 2, tipe: "jendelaTinggi", garis: "h", pos: 12, a: 6.5, b: 9.5 },
];

// tinggi bukaan dari lantai: [ambang bawah, ambang atas]
export const TINGGI_BUKAAN = {
  pintu: [0, 2.1], bukaan: [0, 2.4], jendela: [0.9, 2.1], boven: [1.7, 2.1], jendelaTinggi: [0.3, 2.6],
};

export const BANGUNAN = ["ruang", "mezanin"];         // dihitung luas bangunan
export const TIDAK_DIHITUNG = ["void", "tangga"];     // void bukan lantai; tangga di dalam ruang lain
