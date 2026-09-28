// Model dinding bersama untuk denah 2D dan model 3D.
// Semua dinding berupa garis sumbu (horizontal "h" di y=pos, vertikal "v" di x=pos)
// dengan rentang a..b. Dinding yang berimpit digabung, lalu dipotong oleh pintu/jendela.
import { TEBAL_DINDING } from "./data.js";

const EPS = 1e-6;
const sama = (a, b) => Math.abs(a - b) < 1e-6;

export const BERDINDING = ["ruang", "balkon", "mezanin", "void"];

export const overlap = (a, b) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

// Railing dibuka di titik tangga tiba (anak tangga teratas menempel sisi ini)
function diUjungTangga(ruang, dibangun, o, pos, m) {
  return ruang.some((t) => {
    if (t.jenis !== "tangga" || !dibangun(t)) return false;
    const a = t.anak[t.anak.length - 1];
    return o === "h"
      ? m > a.x && m < a.x + a.w && (sama(a.y, pos) || sama(a.y + a.h, pos))
      : m > a.y && m < a.y + a.h && (sama(a.x, pos) || sama(a.x + a.w, pos));
  });
}

// Pecah tiap sisi ruangan jadi segmen "wall" / "rail" (sisi terbuka dibuang).
// Void & mezanin saling terbuka; mezanin diberi railing di sisi yang menghadap void.
export function segmenSisi(ruang, dibangun, r) {
  const terbukaKe = ["void", "mezanin"];
  const tetangga = ruang.filter((o) => o !== r && o.lantai === r.lantai && dibangun(o) && terbukaKe.includes(o.jenis));
  const sisi = [
    { o: "h", pos: r.y,       a: r.x, b: r.x + r.w },
    { o: "h", pos: r.y + r.h, a: r.x, b: r.x + r.w },
    { o: "v", pos: r.x,       a: r.y, b: r.y + r.h },
    { o: "v", pos: r.x + r.w, a: r.y, b: r.y + r.h },
  ];
  const STEP = 0.05, hasil = [];
  for (const s of sisi) {
    let cur = null;
    for (let t = s.a; t < s.b - EPS; t += STEP) {
      const m = t + STEP / 2;
      let kind = r.jenis === "balkon" ? "rail" : "wall";
      if (terbukaKe.includes(r.jenis)) {
        const n = tetangga.find((o) => s.o === "h"
          ? m > o.x && m < o.x + o.w && (sama(o.y, s.pos) || sama(o.y + o.h, s.pos))
          : m > o.y && m < o.y + o.h && (sama(o.x, s.pos) || sama(o.x + o.w, s.pos)));
        if (n) kind = r.jenis === "mezanin" && n.jenis === "void" && !diUjungTangga(ruang, dibangun, s.o, s.pos, m)
          ? "rail" : "none";
      }
      const b = Math.min(t + STEP, s.b);
      if (cur && cur.kind === kind) cur.b = b;
      else hasil.push(cur = { ...s, a: t, b, kind });
    }
  }
  return hasil.filter((x) => x.kind !== "none");
}

// ---- operasi interval ----
function gabung(iv) {
  const s = [...iv].sort((p, q) => p.a - q.a), out = [];
  for (const i of s) {
    const last = out[out.length - 1];
    if (last && i.a <= last.b + EPS) last.b = Math.max(last.b, i.b);
    else out.push({ ...i });
  }
  return out;
}
function kurangi(iv, potong) {
  let hasil = iv;
  for (const c of potong)
    hasil = hasil.flatMap((p) => c.b <= p.a + EPS || c.a >= p.b - EPS ? [p] : [
      ...(c.a > p.a + EPS ? [{ ...p, b: c.a }] : []),
      ...(c.b < p.b - EPS ? [{ ...p, a: c.b }] : []),
    ]);
  return hasil;
}

// Hasil: { dinding: [{o,pos,a,b,tahap}], railing: [...], bukaan: [{...bukaan, tahap}] }
// Dinding sudah diperpanjang setengah tebal di ujungnya supaya sudut tersambung rapi.
export function modelDinding(ruang, semuaBukaan, lantai, dibangun) {
  const garis = new Map();
  for (const r of ruang) {
    if (r.lantai !== lantai || !dibangun(r) || !BERDINDING.includes(r.jenis)) continue;
    for (const s of segmenSisi(ruang, dibangun, r)) {
      const key = `${s.o}|${s.pos.toFixed(3)}`;
      if (!garis.has(key)) garis.set(key, { o: s.o, pos: s.pos, wall: [], rail: [] });
      garis.get(key)[s.kind].push({ a: s.a, b: s.b, tahap: r.tahap });
    }
  }
  const t2 = TEBAL_DINDING / 2;
  const out = { dinding: [], railing: [], bukaan: [] };
  const bukaanLantai = semuaBukaan.filter((b) => b.lantai === lantai);
  for (const g of garis.values()) {
    const semua = gabung(g.wall);
    for (const r of kurangi(gabung(g.rail), semua)) out.railing.push({ o: g.o, pos: g.pos, ...r });
    const disini = bukaanLantai.filter((b) => b.garis === g.o && sama(b.pos, g.pos) &&
      semua.some((w) => b.a < w.b - EPS && b.b > w.a + EPS));
    for (const b of disini) {
      const tahap = Math.min(...g.wall.filter((w) => b.a < w.b && b.b > w.a).map((w) => w.tahap));
      out.bukaan.push({ ...b, tahap });
    }
    const perTahap = new Map();
    for (const w of g.wall) perTahap.set(w.tahap, [...(perTahap.get(w.tahap) || []), w]);
    for (const [tahap, ivs] of perTahap) {
      const panjang = gabung(ivs).map((w) => ({ ...w, a: w.a - t2, b: w.b + t2 }));
      for (const w of kurangi(panjang, disini)) out.dinding.push({ o: g.o, pos: g.pos, a: w.a, b: w.b, tahap });
    }
  }
  return out;
}
