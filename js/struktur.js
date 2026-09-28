// Sistem struktur kolom & balok — PERKIRAAN AWAL untuk diskusi, bukan desain final.
// Perhitungan final wajib oleh insinyur struktur (SNI 2847 beton, SNI 1727 beban, SNI 1726 gempa).
//
// Isi modul:
//  - grid as kolom (A–E arah x, 1–4 arah y) dan daftar kolom per lantai
//  - daftar balok per level: level 1 = sloof, level 2 = di bawah pelat lantai 2,
//    level 3 = di bawah pelat rooftop (+ ring balok parapet & ruang tangga)
//  - jenis balok (induk/anak) diturunkan otomatis: kedua ujung di kolom = induk, selain itu anak
//  - analisa dinding di atas pelat (dari modelDinding) → rekomendasi (a) / (b) / (c)
//  - jalur beban sederhana: pelat → balok anak → balok induk → kolom, lalu dimensi dari aturan praktis
//    (L/10–L/12, L/15) yang dicek momen kasar; dihitung dua kali: dinding atas hebel vs bata merah.
import { RUANG, BUKAAN, TINGGI_LANTAI, TINGGI_PARAPET, TINGGI_BUKAAN, MATERIAL_DINDING, BERAT_BATA_MERAH, BERAT_KACA, PARTISI, partisiDi } from "./data.js";
import { modelDinding, tiangPendopo } from "./model.js";

const EPS = 1e-6;
const sama = (a, b, tol = 1e-3) => Math.abs(a - b) < tol;
const bulat5 = (cm) => Math.ceil(cm / 5 - 1e-9) * 5;
export const fmtM = (n) => (+n.toFixed(2)).toString().replace(".", ",");

// ================== GRID ==================
// x = 4 : dinding foyer + dinding KM + tepi void; x = 6 : dinding living/garasi, foyer, studio;
// x = 8 : dinding K. Utama / KM Dalam (lantai 2); y = 4 : tepi void; y = 6,5 : garasi/studio.
export const GRID_X = [["A", 0], ["B", 4], ["C", 6], ["D", 8], ["E", 12]];
export const GRID_Y = [["1", 0], ["2", 4], ["3", 6.5], ["4", 10]];
const namaX = (x) => (GRID_X.find(([, v]) => sama(v, x)) || [`x${fmtM(x)}`])[0];
const namaY = (y) => (GRID_Y.find(([, v]) => sama(v, y)) || [`y${fmtM(y)}`])[0];
const posAs = (as) => [GRID_X.find(([n]) => n === as[0])[1], GRID_Y.find(([n]) => n === as.slice(1))[1]];

// ================== ASUMSI BEBAN ==================
export const ASUMSI = {
  beton: 2400,                   // kg/m³
  pelat: { 2: 0.12, 3: 0.15 },   // m — lantai 2 12 cm, rooftop 15 cm (taman, tandon, pendopo)
  sdl: { 2: 100, 3: 130 },       // kg/m² finishing + plafon + ME; rooftop: screed miring + waterproofing
  ll: { 2: 200, 3: 300 },        // kg/m² hunian (SNI 1727 ±1,92 kPa); rooftop dipakai berkumpul
  basah: 100,                    // kg/m² tambahan KM: screed, waterproofing, keramik lantai & dinding
  taman: 500,                    // kg/m² media tanam basah ±30 cm (disarankan planter box/media ringan)
  tangga: 800,                   // kg/m² pelat tangga + anak tangga + beban hidup
  fc: 250,                       // kg/cm² (±25 MPa)
  tanah: 10000,                  // kg/m² daya dukung tanah izin asumsi (WAJIB dicek sondir)
  faktor: 1.3,                   // faktor beban rata-rata (1,2 D + 1,6 L)
};
const BERAT_ALAT = { tandon: 1100, pemanasAir: 300, acOutdoor: 60, pompa: 30, antena: 40, parabola: 30 };
const NAMA_ALAT = { tandon: "Tandon 1000 L", pemanasAir: "Pemanas air surya", acOutdoor: "AC outdoor", pompa: "Pompa" };

// ================== KOLOM ==================
// [as, sampai]: 3 = menerus sampai pelat rooftop; 2 = hanya lantai 1 (di lantai 2 jatuh di tengah
// K. Tamu / KM, jadi berhenti di bawah pelat lantai 2 dan balok rooftop melompatinya).
const KOLOM_STRUKTUR = [
  ["A1", 3], ["B1", 3], ["C1", 3], ["D1", 3], ["E1", 3],
  ["A2", 3], ["B2", 3], ["C2", 3],                         // D2/E2 tidak ada: tengah & pintu masuk garasi
  ["A3", 3], ["B3", 2], ["C3", 2], ["D3", 3], ["E3", 3],
  ["A4", 3], ["B4", 3], ["C4", 3], ["D4", 3], ["E4", 3],
];
const KET_KOLOM = {
  B1: "sudut void; menonjol sedikit di ujung atas tangga",
  B2: "sudut void, ujung dinding foyer",
  C2: "berdiri bebas di lantai 2 (batas dapur kering–koridor)",
  B3: "hanya lantai 1 (di lantai 2 jatuh di tengah K. Tamu)",
  C3: "hanya lantai 1 (di lantai 2 jatuh di tengah KM)",
  D1: "di tepi utara garasi, tidak menghalangi mobil",
  D3: "di tepi selatan garasi (dinding studio); di lantai 2 berdiri di batas walk-in–kamar utama (open)",
};

export const KOLOM = KOLOM_STRUKTUR.map(([as, sampai]) => {
  const [x, y] = posAs(as);
  return { id: as, x, y, jenis: "struktur", lantai: sampai === 3 ? [1, 2] : [1], ket: KET_KOLOM[as] || "" };
});
// lantai 3: ruang tangga rooftop (kolom struktur A1, A2, B2 diteruskan + kolom praktis) & parapet
for (const as of ["A1", "A2", "B2"]) {
  const [x, y] = posAs(as);
  KOLOM.push({ id: as + "'", x, y, jenis: "praktis", lantai: [3], tinggi: TINGGI_LANTAI, ket: "R. Tangga rooftop", dim: { 3: [15, 15] } });
}
for (const [x, y] of [[1.2, 0], [1.2, 1.9], [4, 1.9]])
  KOLOM.push({ id: `KP ${fmtM(x)}/${fmtM(y)}`, x, y, jenis: "praktis", lantai: [3], tinggi: TINGGI_LANTAI, ket: "R. Tangga rooftop", dim: { 3: [12, 12] } });

// ================== BALOK ==================
const BALOK_DEF = [];
const H = (level, y, a, b, opt = {}) => BALOK_DEF.push({ level, o: "h", pos: y, a, b, ...opt });
const V = (level, x, a, b, opt = {}) => BALOK_DEF.push({ level, o: "v", pos: x, a, b, ...opt });
const DINDING_ANAK = { untukDinding: true };

// ---- level 2: di bawah pelat lantai 2 ----
// dinding void tinggi 6 m: balok ikat selebar dinding (tidak menggantung di atas tangga)
H(2, 0, 0, 4, { jenis: "void", dalamDinding: true, ket: "balok ikat dinding void 6 m, di dalam tebal dinding (tidak mengurangi ruang bebas tangga)" });
V(2, 0, 0, 4, { jenis: "void", dalamDinding: true, ket: "balok ikat dinding void 6 m, di dalam tebal dinding" });
H(2, 4, 0, 4, { jenis: "void", ket: "tepi void sisi selatan (railing koridor)" });
V(2, 4, 0, 4, { jenis: "void", qTambah: 600, ket: "tepi void sisi timur; ujung atas tangga lt 1 & awal tangga rooftop menumpu di sini" });
for (const [a, b] of [[4, 6], [6, 8], [8, 12]]) H(2, 0, a, b);
H(2, 4, 4, 6);
H(2, 4, 6, 8, { ket: "membagi pelat garasi; dari kolom C2 ke balok as D" });
H(2, 4, 8, 12, { ket: "membagi pelat garasi 4 × 6,5 m; dinding K. Utama/studio di atasnya" });
for (const y of [6.5, 10]) for (const [a, b] of [[0, 4], [4, 6], [6, 8], [8, 12]]) H(2, y, a, b);
for (const x of [0, 4]) { V(2, x, 4, 6.5); V(2, x, 6.5, 10); }
V(2, 6, 0, 4); V(2, 6, 4, 6.5); V(2, 6, 6.5, 10);
V(2, 8, 0, 6.5, { ket: "bentang garasi 6,5 m tanpa kolom tengah" });
V(2, 8, 6.5, 10);
V(2, 12, 0, 6.5, { ket: "bentang pintu masuk garasi 6,5 m (tidak boleh ada kolom)" });
V(2, 12, 6.5, 10);
// balok anak khusus untuk dinding hebel lantai 2
for (const [a, b] of [[0, 4], [4, 6], [6, 8]]) H(2, 5, a, b, { ...DINDING_ANAK, ket: "dinding kamar/KM sepanjang koridor" });
for (const [a, b] of [[5, 6.5], [6.5, 10]]) V(2, 2.5, a, b, { ...DINDING_ANAK, ket: "dinding K. Anak | K. Tamu" });
for (const [a, b] of [[5, 6.5], [6.5, 10]]) V(2, 5, a, b, { ...DINDING_ANAK, ket: "dinding KM & KM Dalam (basah)" });
H(2, 7.5, 5, 6, { ...DINDING_ANAK, ket: "dinding KM Dalam (basah)" });
H(2, 7.5, 6, 8, { ...DINDING_ANAK, ket: "dinding walk-in/KM | KM Dalam (basah)" });
for (const [a, b] of [[5, 6.5], [6.5, 7.5]]) V(2, 6.8, a, b, { ...DINDING_ANAK, ket: "dinding KM | walk-in (basah, sebagian di atas garasi)" });

// ---- balok tangga rooftop (melayang di void): bordes di pojok barat daya, elevasi +5,12 ----
const ELEV_BORDES = TINGGI_LANTAI + 2.12;
V(3, 0, 0, 4, { jenis: "tangga", elev: ELEV_BORDES, dalamDinding: true,
  ket: "balok bordes di dalam dinding barat; sekaligus balok ikat tengah tinggi dinding void" });
H(3, 3.925, 0, 1, { jenis: "kantilever", elev: ELEV_BORDES, qTambah: 800, ket: "kantilever 1 m dari kolom A2 memikul tepi bordes" });

// ---- level 3: di bawah pelat rooftop ----
for (const [a, b] of [[0, 4], [4, 6], [6, 8], [8, 12]]) H(3, 0, a, b);
H(3, 1.9, 0, 4, { jenis: "void", qTambah: 500, ket: "tepi lubang tangga; dinding R. Tangga di atasnya; ujung atas tangga rooftop menumpu" });
H(3, 4, 0, 4, { jenis: "void", ket: "tepi lubang tangga sisi selatan + dinding R. Tangga" });
H(3, 4, 4, 6);
H(3, 4, 6, 8, { ket: "membagi pelat rooftop di atas garasi" });
H(3, 4, 8, 12, { ket: "membagi pelat rooftop di atas garasi; balok anak as x = 10 menumpu di sini" });
H(3, 6.5, 0, 4, { ket: "membagi pelat 4 × 6 m (kolom B3 tidak menerus)" });
H(3, 6.5, 8, 12);
for (const [a, b] of [[0, 4], [4, 6], [6, 8], [8, 12]]) H(3, 10, a, b);
V(3, 0, 0, 4); V(3, 0, 4, 6.5); V(3, 0, 6.5, 10);
V(3, 4, 0, 4, { jenis: "void", ket: "tepi lubang tangga sisi timur + dinding R. Tangga" });
V(3, 4, 4, 10, { ket: "bentang 6 m (B3 berhenti di lt 1); 2 tandon di atas balok ini dekat kolom B4" });
V(3, 6, 0, 4); V(3, 6, 4, 10, { ket: "bentang 6 m (C3 berhenti di lt 1); tiang pendopo di atasnya" });
V(3, 8, 0, 6.5); V(3, 8, 6.5, 10);
for (const [a, b] of [[0, 4], [4, 6.5], [6.5, 10]]) V(3, 10, a, b, { ket: "tiang pendopo timur tepat di atas balok ini" });
V(3, 12, 0, 6.5); V(3, 12, 6.5, 10);

// ---- level 1: sloof di bawah semua dinding lantai 1 + pengikat antar pondasi ----
for (const y of [0, 6.5, 10]) for (const [a, b] of [[0, 4], [4, 6], [6, 8], [8, 12]]) H(1, y, a, b, { jenis: "sloof" });
H(1, 4, 0, 4, { jenis: "sloof" }); H(1, 4, 4, 6, { jenis: "sloof" });
for (const x of [0, 4, 6]) for (const [a, b] of [[0, 4], [4, 6.5], [6.5, 10]]) V(1, x, a, b, { jenis: "sloof" });
V(1, 8, 0, 6.5, { jenis: "sloof", ket: "pengikat pondasi di bawah lantai garasi" });
V(1, 8, 6.5, 10, { jenis: "sloof" });
V(1, 12, 0, 6.5, { jenis: "sloof", ket: "pengikat pondasi di bawah pintu masuk garasi" });
V(1, 12, 6.5, 10, { jenis: "sloof" });
H(1, 8, 4, 6, { jenis: "sloof", ket: "dinding KM" });
V(1, 10, 6.5, 10, { jenis: "sloof", ket: "dinding studio | halaman" });

// ================== DINDING (dari modelDinding) ==================
const semua = () => true;
const berat = (lantai, bata) => (bata && lantai > 1 ? BERAT_BATA_MERAH : MATERIAL_DINDING[lantai].berat);

// kelompokkan segmen dinding + bukaan pada satu garis jadi satu "run" dinding
function runDinding(lantai) {
  const m = modelDinding(RUANG, BUKAAN, lantai, semua);
  const grup = new Map();
  const tambah = (jenis, o, pos, item) => {
    const k = `${jenis}|${o}|${pos.toFixed(3)}`;
    if (!grup.has(k)) grup.set(k, { jenis, o, pos, item: [] });
    grup.get(k).item.push(item);
  };
  for (const d of m.dinding) tambah("dinding", d.o, d.pos, { a: d.a, b: d.b, seg: d });
  for (const b of m.bukaan) tambah("dinding", b.garis, b.pos, { a: b.a, b: b.b, bukaan: b });
  for (const p of m.parapet) tambah("parapet", p.o, p.pos, { a: p.a, b: p.b, seg: p });
  const hasil = [];
  for (const g of grup.values()) {
    const it = g.item.sort((p, q) => p.a - q.a);
    let cur = null;
    for (const i of it) {
      if (cur && i.a <= cur.b + 0.02) { cur.b = Math.max(cur.b, i.b); cur.item.push(i); }
      else hasil.push(cur = { lantai, jenis: g.jenis, o: g.o, pos: g.pos, a: i.a, b: i.b, item: [i] });
    }
  }
  for (const r of hasil) {
    r.panjang = r.b - r.a;
    r.tinggi = r.jenis === "parapet" ? TINGGI_PARAPET : TINGGI_LANTAI;
    // luas bidang dinding: bagian padat penuh + bagian di atas/bawah bukaan
    const luasItem = (i) => {
      const L = i.b - i.a;
      if (i.seg) return L * r.tinggi;
      const [bawah, atas] = TINGGI_BUKAAN[i.bukaan.tipe];
      return L * (r.tinggi - (atas - bawah));
    };
    // berat per bagian: partisi gipsum (ruang kerja) atau material lantai; bata = pembanding
    const beratItem = (i, bata) => (partisiDi(lantai, r.o, r.pos, (i.a + i.b) / 2) ? PARTISI.material.berat : berat(lantai, bata));
    r.luas = r.item.reduce((s, i) => s + luasItem(i), 0);
    r.partisi = r.item.some((i) => partisiDi(lantai, r.o, r.pos, (i.a + i.b) / 2));
    // kaca (kaca geser, jendela, kaca mati): kusen aluminium + kaca
    r.beratKaca = r.item.filter((i) => i.bukaan && i.bukaan.tipe !== "pintu" && i.bukaan.tipe !== "bukaan")
      .reduce((s, i) => { const [bw, at] = TINGGI_BUKAAN[i.bukaan.tipe]; return s + (i.b - i.a) * (at - bw) * BERAT_KACA; }, 0);
    r.W = r.item.reduce((s, i) => s + luasItem(i) * beratItem(i, false), 0) + r.beratKaca;
    r.WBata = r.item.reduce((s, i) => s + luasItem(i) * beratItem(i, true), 0) + r.beratKaca;
    r.segmen = r.item.filter((i) => i.seg).map((i) => i.seg);
    r.nama = namaDinding(r);
  }
  return hasil.filter((r) => r.panjang > 0.35);
}

function ruangDiSisi(r) {
  return RUANG.filter((o) => o.lantai === r.lantai && !["tangga", "zona", "taman", "pendopo"].includes(o.jenis) &&
    (r.o === "h"
      ? (sama(o.y, r.pos) || sama(o.y + o.h, r.pos)) && o.x < r.b - 0.1 && o.x + o.w > r.a + 0.1
      : (sama(o.x, r.pos) || sama(o.x + o.w, r.pos)) && o.y < r.b - 0.1 && o.y + o.h > r.a + 0.1));
}
function namaDinding(r) {
  const nama = [...new Set(ruangDiSisi(r).map((o) => (o.jenis === "void" && o.lubangTangga ? "R. Tangga" : o.nama)))];
  const garis = r.o === "h" ? `y = ${fmtM(r.pos)}, x ${fmtM(Math.max(r.a, 0))}–${fmtM(Math.min(r.b, 12))}`
                            : `x = ${fmtM(r.pos)}, y ${fmtM(Math.max(r.a, 0))}–${fmtM(Math.min(r.b, 10))}`;
  const jenis = r.jenis === "parapet" ? "Parapet" : "Dinding";
  return { ruang: `${jenis} ${nama.join(" | ") || "luar"}`, garis };
}

// ================== BALOK: identitas, tumpuan, jenis ==================
const kolomDiLevel = (level, elev) => KOLOM.filter((k) => k.jenis === "struktur" &&
  (elev != null ? k.lantai.includes(Math.floor(elev / TINGGI_LANTAI) + 1) : level === 1 ? true : k.lantai.includes(level - 1)));
const KODE = { induk: "BI", anak: "BA", void: "BV", tangga: "BT", kantilever: "BK", sloof: "S", ring: "RB" };

function ujung(b, t) { return b.o === "h" ? [t, b.pos] : [b.pos, t]; }
function kolomDi(b, [x, y]) { return kolomDiLevel(b.level, b.elev).find((k) => sama(k.x, x, 0.05) && sama(k.y, y, 0.05)); }

export const BALOK = BALOK_DEF.map((d) => {
  const b = { ...d, L: d.b - d.a };
  const kA = kolomDi(b, ujung(b, b.a)), kB = kolomDi(b, ujung(b, b.b));
  b.kolomUjung = [kA, kB];
  b.jenis ||= kA && kB ? "induk" : "anak";
  if (b.jenis === "kantilever") b.kolomUjung = [kA, null];
  const garis = b.o === "h" ? `${namaY(b.pos)}/${namaX(b.a)}–${namaX(b.b)}` : `${namaX(b.pos)}/${namaY(b.a)}–${namaY(b.b)}`;
  b.id = `${KODE[b.jenis]}${b.level} ${garis}`;
  // tahap: sloof & kolom lt 1 = tahap 1; balok induk/void lantai k dicor sebagai ring balok tahap k-1
  // (ukuran sudah ukuran final); balok anak & tangga ikut pelatnya.
  b.tahap = b.jenis === "sloof" ? 1 : ["induk", "void"].includes(b.jenis) ? b.level - 1 : b.level;
  return b;
});

// ring balok: puncak parapet & puncak dinding R. Tangga (dari model dinding rooftop)
const RUN = { 1: runDinding(1), 2: runDinding(2), 3: runDinding(3) };
for (const r of RUN[3]) {
  const parapet = r.jenis === "parapet";
  BALOK.push({ level: 3, o: r.o, pos: r.pos, a: r.a, b: r.b, L: r.panjang, jenis: "ring", tahap: 3,
    elev: 2 * TINGGI_LANTAI + (parapet ? TINGGI_PARAPET : TINGGI_LANTAI), dim: parapet ? [12, 15] : [12, 20],
    id: `RB3 ${r.o === "h" ? "y" : "x"}${fmtM(r.pos)} ${parapet ? "parapet" : "R. Tangga"}`,
    ket: parapet ? "ring balok puncak parapet 130 cm" : "ring balok puncak dinding R. Tangga, menumpu pelat atapnya" });
}
// kolom praktis parapet: di ujung, di setiap as kolom struktur, dan jarak maks ±3 m
for (const r of RUN[3].filter((r) => r.jenis === "parapet")) {
  const a = Math.max(r.a, 0), b = Math.min(r.b, r.o === "h" ? 12 : 10);
  const titik = [a, b, ...KOLOM.filter((k) => k.jenis === "struktur" && k.lantai.includes(2) &&
    sama(r.o === "h" ? k.y : k.x, r.pos)).map((k) => (r.o === "h" ? k.x : k.y)).filter((t) => t > a && t < b)];
  const urut = [...new Set(titik.map((t) => +t.toFixed(3)))].sort((p, q) => p - q);
  const isi = [];
  for (let i = 0; i < urut.length - 1; i++) {
    isi.push(urut[i]);
    const n = Math.ceil((urut[i + 1] - urut[i]) / 3 - 1e-9);
    for (let j = 1; j < n; j++) isi.push(urut[i] + ((urut[i + 1] - urut[i]) * j) / n);
  }
  isi.push(urut[urut.length - 1]);
  for (const t of isi) {
    const [x, y] = r.o === "h" ? [t, r.pos] : [r.pos, t];
    if (KOLOM.some((k) => k.lantai.includes(3) && sama(k.x, x, 0.05) && sama(k.y, y, 0.05))) continue;
    KOLOM.push({ id: `KP ${fmtM(x)}/${fmtM(y)}`, x, y, jenis: "praktis", lantai: [3], tinggi: TINGGI_PARAPET, ket: "parapet", dim: { 3: [12, 12] } });
  }
}

const balokPikul = (level) => BALOK.filter((b) => b.level === level && !["ring", "sloof", "tangga", "kantilever"].includes(b.jenis));
const menutupi = (b, o, pos, t, tol = 0.13) => b.o === o && Math.abs(b.pos - pos) <= tol && t >= b.a - EPS && t <= b.b + EPS;

// ================== ANALISA DINDING DI ATAS PELAT ==================
function adaRuang(lantai, x, y, f) {
  return RUANG.some((r) => r.lantai === lantai && f(r) && x > r.x + EPS && x < r.x + r.w - EPS && y > r.y + EPS && y < r.y + r.h - EPS);
}
const GARASI = RUANG.filter((r) => r.lantai === 1 && r.jenis === "terbuka" && r.w * r.h > 20);

function cakupan(r, daftar) {
  const kena = daftar.filter((b) => b.o === r.o && Math.abs(b.pos - r.pos) <= 0.13 && b.a < r.b - EPS && b.b > r.a + EPS);
  const tutup = kena.reduce((s, b) => s + Math.min(b.b, r.b) - Math.max(b.a, r.a), 0);
  return { balok: kena, fraksi: tutup / r.panjang };
}
// balok sejajar terdekat di kiri/kanan titik tengah dinding, dan balok tegak lurus pembatas panel
function panel(level, o, pos, t, daftar) {
  const sejajar = daftar.filter((b) => b.o === o && t >= b.a - EPS && t <= b.b + EPS);
  const kiri = Math.max(-Infinity, ...sejajar.filter((b) => b.pos < pos - 0.13).map((b) => b.pos));
  const kanan = Math.min(Infinity, ...sejajar.filter((b) => b.pos > pos + 0.13).map((b) => b.pos));
  const tegak = daftar.filter((b) => b.o !== o && pos >= b.a - EPS && pos <= b.b + EPS);
  const p0 = Math.max(-Infinity, ...tegak.filter((b) => b.pos < t - EPS).map((b) => b.pos));
  const p1 = Math.min(Infinity, ...tegak.filter((b) => b.pos > t + EPS).map((b) => b.pos));
  return { d1: pos - kiri, d2: kanan - pos, bentang: kanan - kiri, Lp: p1 - p0 };
}

function analisaDinding(r) {
  const lv = r.lantai;
  r.bebanGaris = r.W / r.panjang;
  r.bebanGarisBata = r.WBata / r.panjang;
  if (lv === 1) {
    const c = cakupan(r, BALOK.filter((b) => b.jenis === "sloof"));
    r.status = c.fraksi > 0.85 ? "sloof" : "b";
    r.balok = c.balok;
    r.rekomendasi = c.fraksi > 0.85 ? "Bata merah di atas sloof → langsung ke pondasi." : "Tambahkan sloof di bawah dinding ini.";
    return r;
  }
  const dasar = balokPikul(lv).filter((b) => !b.untukDinding);
  const c0 = cakupan(r, dasar);
  const cAll = cakupan(r, balokPikul(lv));
  r.balok = cAll.balok;
  const t = (r.a + r.b) / 2;
  const tengahRuas = (x, y) => [x, y];
  const [mx, my] = r.o === "h" ? tengahRuas(t, r.pos) : tengahRuas(r.pos, t);
  const sisi = ruangDiSisi(r);
  r.basah = sisi.some((o) => o.finish === "basah");
  r.garasi = GARASI.some((g) => (r.o === "h"
    ? r.pos > g.y + 0.1 && r.pos < g.y + g.h - 0.1 && r.a < g.x + g.w && r.b > g.x
    : r.pos > g.x + 0.1 && r.pos < g.x + g.w - 0.1 && r.a < g.y + g.h && r.b > g.y));
  r.tepiVoid = sisi.some((o) => o.jenis === "void");
  if (c0.fraksi > 0.85) {
    r.status = "balok";
    r.rekomendasi = `Duduk di atas ${c0.balok.map((b) => b.id).join(", ")} — tidak perlu tindakan khusus.`;
    return r;
  }
  const p = panel(lv, r.o, r.pos, t, dasar);
  r.panel = p;
  const d = Math.min(p.d1, p.d2), rasio = d / p.bentang;
  const searahBentang = p.Lp <= p.bentang / 2;   // pelat satu arah sejajar dinding: dinding menghubungkan dua tumpuan
  let rek, alasan;
  if (r.basah) { rek = "b"; alasan = "dinding KM: beban screed, waterproofing, keramik & peralatan basah"; }
  // partisi ringan (kaca geser, ≤ ±60% dinding hebel penuh): cukup pelat + tulangan tambahan, juga di atas garasi
  else if (r.bebanGaris <= 200) { rek = "a"; alasan = `partisi ringan (${r.partisi ? "gipsum + rockwool kedap suara" : "dinding kaca"}), ±${Math.round(r.bebanGaris)} kg/m`; }
  else if (r.garasi) { rek = "b"; alasan = "di atas bentang besar garasi"; }
  else if (r.tepiVoid) { rek = "b"; alasan = "tepi void/lubang tangga"; }
  else if (r.panjang <= 3 && (rasio <= 0.25 || searahBentang)) {
    rek = "a"; alasan = searahBentang ? "pendek & searah bentang pelat (menghubungkan dua balok)" : `pendek & dekat balok (${fmtM(d)} m ≤ ¼ bentang ${fmtM(p.bentang)} m)`;
  } else if (d <= 0.5) { rek = "c"; alasan = `hanya ${fmtM(d)} m dari as balok`; }
  else {
    rek = "b";
    alasan = r.panjang > 3 ? `panjang ${fmtM(r.panjang)} m > 3 m` : "";
    if (rasio > 0.25) alasan += `${alasan ? ", " : ""}di tengah bentang pelat (${fmtM(d)} m dari balok, bentang ${fmtM(p.bentang)} m)`;
  }
  r.status = rek;
  r.alasan = alasan;
  r.perluPerhatian = rek !== "a";
  const anak = cAll.balok.filter((b) => b.untukDinding);
  r.ditangani = cAll.fraksi > 0.85 && anak.length > 0;
  const teks = {
    a: "Cukup di atas pelat + tulangan tambahan (mis. 2 D10 memanjang di bawah dinding dan tulangan pelat dirapatkan).",
    b: "Perlu balok anak di bawah dinding.",
    c: "Geser dinding ke garis balok terdekat, atau beri balok anak.",
  }[rek];
  r.rekomendasi = `${teks}${r.ditangani ? ` Sudah dimasukkan: ${anak.map((b) => `${b.id} (${b.dim[0]}/${b.dim[1]})`).join(", ")}.` : ""}`;
  return r;
}

// ================== JALUR BEBAN & DIMENSI ==================
function bebanArea(level, x, y) {
  if (!adaRuang(level, x, y, (r) => ["ruang", "mezanin", "balkon", "rooftop"].includes(r.jenis))) return 0;
  if (adaRuang(level, x, y, (r) => r.jenis === "void")) return 0;
  let q = ASUMSI.pelat[level] * ASUMSI.beton + ASUMSI.sdl[level] + ASUMSI.ll[level];
  if (adaRuang(level, x, y, (r) => r.finish === "basah")) q += ASUMSI.basah;
  if (adaRuang(level, x, y, (r) => r.jenis === "taman")) q += ASUMSI.taman;
  return q;
}
// lebar tributari satu sisi (pembagian pelat 45°: trapesium/segitiga)
function lebarTrib(s, t) { return s >= t ? ((2 * s - t) * t) / (4 * s) : s / 4; }

function dimensi(b, M) {
  const Mu = ASUMSI.faktor * M;  // kg·m
  const rasio = { induk: 12, void: 12, anak: 15, tangga: 12, kantilever: 6 }[b.jenis] || 12;
  const hRule = (b.L * 100) / rasio;
  const hMin = b.jenis === "anak" ? 25 : 30;
  for (let h = hMin; h <= 120; h += 5) {
    const lebar = b.dalamDinding ? 15 : Math.max(b.jenis === "anak" ? 15 : 20, bulat5(h * 0.5));
    const d = h - 5;
    const kapasitas = (0.9 * 30 * lebar * d * d) / 100;  // Rn ±3 MPa (ρ ±1%) → kg·m
    if (h >= hRule - 1e-6 && kapasitas >= Mu) return [lebar, h];
  }
  return [40, 120];
}

function hitung(bata) {
  const beban = new Map();  // balok → { q, titik: [[posisi, P]] }
  const kolomBeban = new Map();
  for (const k of KOLOM) kolomBeban.set(k, { 1: 0, 2: 0 });
  const bl = BALOK.filter((b) => ["induk", "anak", "void", "tangga", "kantilever"].includes(b.jenis));
  for (const b of bl) beban.set(b, { q: b.qTambah || 0, titik: [] });

  // 1. pelat
  for (const lv of [2, 3]) {
    const pikul = balokPikul(lv);
    for (const b of pikul) {
      const t = (b.a + b.b) / 2;
      const p = panel(lv, b.o, b.pos, t, pikul);
      for (const [dir, d] of [[-1, p.d1 + 0], [1, p.d2]]) {
        // p.d1/d2 diukur dari b.pos ke balok sejajar; untuk balok sendiri gunakan tetangga sejajar
        const tetangga = pikul.filter((o) => o !== b && o.o === b.o && t >= o.a - EPS && t <= o.b + EPS && (o.pos - b.pos) * dir > 0.13);
        if (!tetangga.length) continue;
        const jarak = Math.min(...tetangga.map((o) => Math.abs(o.pos - b.pos)));
        const [sx, sy] = b.o === "h" ? [t, b.pos + (dir * jarak) / 3] : [b.pos + (dir * jarak) / 3, t];
        const w = bebanArea(lv, sx, sy);
        beban.get(b).q += lebarTrib(Math.min(p.Lp, b.L * 1.5), jarak) * w;
        void d;
      }
    }
  }
  // 2. dinding (hebel / bata) + atap R. Tangga
  const atapTangga = 10.7 * (0.1 * ASUMSI.beton + 100 + 100) + BERAT_ALAT.antena + BERAT_ALAT.parabola;
  const panjangTangga = RUN[3].filter((r) => r.jenis === "dinding").reduce((s, r) => s + r.panjang, 0);
  for (const lv of [2, 3]) {
    const pikul = balokPikul(lv);
    for (const r of RUN[lv]) {
      let W = bata ? r.WBata : r.W;
      if (lv === 3 && r.jenis === "dinding") W += (atapTangga * r.panjang) / panjangTangga;
      const c = cakupan(r, pikul);
      if (c.fraksi > 0.85) {
        for (const b of c.balok) beban.get(b).q += (W * (Math.min(b.b, r.b) - Math.max(b.a, r.a))) / r.panjang / b.L;
      } else {
        // di atas pelat: dibagi ke dua balok sejajar pengapit (hukum tuas)
        const t = (r.a + r.b) / 2;
        const sej = pikul.filter((b) => b.o === r.o && t >= b.a - EPS && t <= b.b + EPS);
        const kiri = sej.filter((b) => b.pos < r.pos).sort((p, q) => q.pos - p.pos)[0];
        const kanan = sej.filter((b) => b.pos > r.pos).sort((p, q) => p.pos - q.pos)[0];
        if (kiri && kanan) {
          const L = kanan.pos - kiri.pos;
          beban.get(kiri).q += (W * (kanan.pos - r.pos)) / L / kiri.L;
          beban.get(kanan).q += (W * (r.pos - kiri.pos)) / L / kanan.L;
        }
      }
    }
  }
  // 3. beban terpusat rooftop: alat & tiang pendopo → balok terdekat
  const titikRooftop = [];
  for (const r of RUANG.filter((r) => r.lantai === 3)) {
    for (const [tipe, x, y] of r.perabot || []) if (BERAT_ALAT[tipe] && !r.diAtap) titikRooftop.push({ nama: NAMA_ALAT[tipe] || tipe, x, y, P: BERAT_ALAT[tipe] });
    if (r.jenis === "pendopo") {
      const tiang = tiangPendopo(r);
      const atap = (r.w + 0.4) * (r.h + 0.4) * 25 + r.w * r.h * 60;  // atap uPVC ringan + rangka baja ringan, deck kayu
      for (const [x, y] of tiang) titikRooftop.push({ nama: "tiang pendopo", x, y, P: atap / tiang.length + 50 });
    }
  }
  const pikul3 = balokPikul(3);
  const titikInfo = titikRooftop.map((p) => {
    let best = null;
    for (const b of pikul3) {
      const t = b.o === "h" ? p.x : p.y, jarak = Math.abs((b.o === "h" ? p.y : p.x) - b.pos);
      if (t < b.a - EPS || t > b.b + EPS) continue;
      if (!best || jarak < best.jarak) best = { b, jarak, t };
    }
    if (best) beban.get(best.b).titik.push([best.t, p.P]);
    return { ...p, balok: best?.b, jarak: best?.jarak };
  });
  // 4. tangga: tangga rooftop ±5 m² → bordes (in-wall + kantilever) & balok tepi void
  for (const b of bl.filter((b) => b.jenis === "tangga")) beban.get(b).q += 1.0 * ASUMSI.tangga / 2;

  // 5. penyaluran: balok anak → balok penumpu → kolom (urut dari yang ditumpu)
  const penumpu = new Map();
  for (const b of bl) {
    penumpu.set(b, [b.a, b.b].map((t, i) => {
      if (b.kolomUjung[i]) return { kolom: b.kolomUjung[i] };
      if (b.jenis === "kantilever") return null;
      const [x, y] = ujung(b, t);
      const s = bl.find((o) => o !== b && o.level === b.level && o.o !== b.o && !o.elev === !b.elev &&
        menutupi(o, o.o, o.o === "h" ? y : x, o.o === "h" ? x : y, 0.13));
      return s ? { balok: s, t: s.o === "h" ? x : y } : null;
    }));
  }
  const selesai = new Set(), hasil = new Map();
  const proses = (b) => {
    if (selesai.has(b)) return;
    for (const o of bl) if (!selesai.has(o) && penumpu.get(o).some((s) => s?.balok === b)) proses(o);
    const { q, titik } = beban.get(b);
    let [lebar, h] = b.dim || dimensi(b, (q * b.L * b.L) / 10);
    let qTot = q + (lebar / 100) * (h / 100) * ASUMSI.beton;
    const M = b.jenis === "kantilever"
      ? (qTot * b.L * b.L) / 2 + titik.reduce((s, [t, P]) => s + P * (t - b.a), 0)
      : (qTot * b.L * b.L) / (b.jenis === "anak" ? 8 : 10) + titik.reduce((s, [t, P]) => s + (P * (t - b.a) * (b.b - t)) / b.L, 0);
    if (!b.dim) [lebar, h] = dimensi(b, M);
    qTot = q + (lebar / 100) * (h / 100) * ASUMSI.beton;
    const W = qTot * b.L + titik.reduce((s, [, P]) => s + P, 0);
    let RB = qTot * b.L / 2 + titik.reduce((s, [t, P]) => s + (P * (t - b.a)) / b.L, 0);
    let RA = W - RB;
    if (b.jenis === "kantilever") { RA = W; RB = 0; }
    hasil.set(b, { q: qTot, M, W, dim: [lebar, h], R: [RA, RB] });
    penumpu.get(b).forEach((s, i) => {
      const R = i ? RB : RA;
      if (!s || !R) return;
      if (s.kolom) {
        const lt = b.elev ? Math.floor(b.elev / TINGGI_LANTAI) + 1 : b.level - 1;
        kolomBeban.get(s.kolom)[lt] += R;
      } else beban.get(s.balok).titik.push([s.t, R]);
    });
    selesai.add(b);
  };
  for (const b of bl) proses(b);

  // 6. kolom
  const kolom = new Map();
  for (const k of KOLOM.filter((k) => k.jenis === "struktur")) {
    const kb = kolomBeban.get(k), r = {};
    let P = 0;
    for (const lt of [2, 1]) {
      if (!k.lantai.includes(lt)) continue;
      const minimum = lt === 1 ? 30 : 25;
      P += kb[lt];
      const Ag = (ASUMSI.faktor * (P + 0.3 * 0.3 * TINGGI_LANTAI * ASUMSI.beton)) / (0.3 * ASUMSI.fc);
      const s = Math.max(minimum, bulat5(Math.sqrt(Ag)));
      P += (s / 100) ** 2 * TINGGI_LANTAI * ASUMSI.beton;
      r[lt] = { P, dim: [s, s] };
    }
    r.pondasi = Math.max(1, Math.ceil(Math.sqrt((1.1 * r[1].P) / ASUMSI.tanah) * 10) / 10);
    kolom.set(k, r);
  }
  return { balok: hasil, kolom, titik: titikInfo };
}

const HEBEL = hitung(false), BATA = hitung(true);
for (const b of BALOK) {
  const h = HEBEL.balok.get(b);
  if (h) { b.dim = h.dim; b.beban = h; b.dimBata = BATA.balok.get(b).dim; b.bebanBata = BATA.balok.get(b); }
  else if (b.jenis === "sloof") b.dim = b.L > 5 ? [20, 40] : [20, 30];
}
for (const k of KOLOM) {
  const h = HEBEL.kolom.get(k);
  if (!h) continue;
  k.dim = { 1: h[1].dim, ...(h[2] ? { 2: h[2].dim } : {}) };
  k.P = { 1: h[1].P, ...(h[2] ? { 2: h[2].P } : {}) };
  k.pondasi = h.pondasi;
  const b = BATA.kolom.get(k);
  k.dimBata = { 1: b[1].dim, ...(b[2] ? { 2: b[2].dim } : {}) };
  k.PBata = { 1: b[1].P, ...(b[2] ? { 2: b[2].P } : {}) };
  k.pondasiBata = b.pondasi;
}
export const BEBAN_TITIK = HEBEL.titik;

export const DINDING = [...RUN[1], ...RUN[2], ...RUN[3]].map(analisaDinding);
DINDING.filter((r) => r.perluPerhatian).forEach((r, i) => { r.kode = `W${i + 1}`; });
export const cariDinding = (lantai, o, pos, a, b) =>
  DINDING.find((r) => r.lantai === lantai && r.o === o && sama(r.pos, pos) && a < r.b + EPS && b > r.a - EPS);

// lantai denah tempat balok digambar: sloof di lantai 1, balok level k di denah lantai k,
// balok tangga/bordes di lantai tempat elevasinya berada, ring balok di rooftop
export const lantaiTampil = (b) => (b.elev != null ? Math.floor(b.elev / TINGGI_LANTAI) + 1 : b.level);
export const WARNA_BALOK = {
  induk: "#1f5fa8", anak: "#2e9e5b", void: "#8e44ad", tangga: "#d35400", kantilever: "#c0392b", sloof: "#795548", ring: "#6c7a89",
};
export const NAMA_BALOK = {
  induk: "Balok induk", anak: "Balok anak", void: "Balok tepi void / lubang tangga", tangga: "Balok bordes/tangga",
  kantilever: "Balok kantilever", sloof: "Sloof", ring: "Ring balok",
};
export const WARNA_STATUS = { a: "#e0b000", b: "#d62828", c: "#d62828" };

// ================== RINGKASAN ==================
export function ringkasan() {
  const kolomPerLantai = [1, 2, 3].map((lt) => {
    const ks = KOLOM.filter((k) => k.lantai.includes(lt));
    const ukuran = {};
    for (const k of ks) { const d = (k.dim?.[lt] || [0, 0]).join("/"); ukuran[d] = (ukuran[d] || 0) + 1; }
    return { lantai: lt, jumlah: ks.length, struktur: ks.filter((k) => k.jenis === "struktur").length, praktis: ks.filter((k) => k.jenis === "praktis").length, ukuran };
  });
  const balokPerJenis = [];
  for (const level of [1, 2, 3]) {
    for (const jenis of ["sloof", "induk", "anak", "void", "tangga", "kantilever", "ring"]) {
      // balok bordes/kantilever tangga rooftop ada di tinggi lantai 2 → dikelompokkan ke lantai 2
      const bs = BALOK.filter((b) => (b.jenis === "ring" ? 3 : lantaiTampil(b)) === level && b.jenis === jenis);
      if (!bs.length) continue;
      const ukuran = [...new Set(bs.map((b) => b.dim.join("/")))].sort((p, q) => +p.split("/")[1] - +q.split("/")[1]);
      balokPerJenis.push({ level, jenis, jumlah: bs.length, panjang: bs.reduce((s, b) => s + b.L, 0), ukuran,
        untukDinding: bs.filter((b) => b.untukDinding).length });
    }
  }
  const bebanDinding = [1, 2, 3].map((lt) => {
    const rs = DINDING.filter((r) => r.lantai === lt);
    const luas = rs.reduce((s, r) => s + r.luas, 0);
    const partisi = rs.some((r) => r.partisi) ? ` + ${PARTISI.material.nama.toLowerCase()} (${PARTISI.material.berat} kg/m²) di ruang kerja` : "";
    return { lantai: lt, material: MATERIAL_DINDING[lt].nama + ` (${MATERIAL_DINDING[lt].berat} kg/m²)` + partisi,
      panjang: rs.reduce((s, r) => s + r.panjang, 0), luas,
      berat: rs.reduce((s, r) => s + r.W, 0), beratBata: rs.reduce((s, r) => s + r.WBata, 0) };
  });
  const perhatian = DINDING.filter((r) => r.perluPerhatian);
  const selisihBalok = BALOK.filter((b) => b.dimBata && b.dimBata.join() !== b.dim.join());
  const selisihKolom = KOLOM.filter((k) => k.dimBata && JSON.stringify(k.dimBata) !== JSON.stringify(k.dim));
  return { kolomPerLantai, balokPerJenis, bebanDinding, perhatian, selisihBalok, selisihKolom };
}
