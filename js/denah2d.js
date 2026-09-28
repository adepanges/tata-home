// Denah 2D gaya gambar kerja: dinding tebal tersambung, pintu dengan busur bukaan,
// jendela, pola lantai, furnitur, garis ukuran berantai, skala batang.
import { LAHAN, JALAN, RUANG, BUKAAN, TAHAP, TEBAL_DINDING, partisiDi } from "./data.js";
import { modelDinding, tiangPendopo } from "./model.js";
import { gambarPerabot } from "./simbol.js";
import { KOLOM, BALOK, GRID_X, GRID_Y, BEBAN_TITIK, WARNA_BALOK, WARNA_STATUS, cariDinding, lantaiTampil, fmtM } from "./struktur.js";

const PAD = { l: 2.3, t: JALAN === "atas" ? 2.9 : 2.1, r: JALAN === "kanan" ? 2.1 : 1.3, b: 2.9 };
const DINDING = "#2b2b2b";
const fmtUkur = (n) => n.toFixed(2).replace(".", ",");
const halo = 'paint-order="stroke" stroke="#fff" stroke-width="0.08" stroke-linejoin="round"';

const DEFS = `<defs>
  <pattern id="pat-keramik" width="0.6" height="0.6" patternUnits="userSpaceOnUse">
    <rect width="0.6" height="0.6" fill="#f7f5f0"/><path d="M0 0H0.6M0 0V0.6" stroke="#dedad1" stroke-width="0.012"/></pattern>
  <pattern id="pat-basah" width="0.3" height="0.3" patternUnits="userSpaceOnUse">
    <rect width="0.3" height="0.3" fill="#eef3f5"/><path d="M0 0H0.3M0 0V0.3" stroke="#d2dde2" stroke-width="0.01"/></pattern>
  <pattern id="pat-parket" width="1.2" height="0.3" patternUnits="userSpaceOnUse">
    <rect width="1.2" height="0.3" fill="#efe3cf"/>
    <path d="M0 0H1.2M0 0.15H1.2M0 0V0.15M0.6 0.15V0.3" stroke="#dcc9a8" stroke-width="0.012"/></pattern>
  <pattern id="pat-beton" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
    <rect width="0.5" height="0.5" fill="#efefed"/>
    <circle cx="0.1" cy="0.12" r="0.012" fill="#d3d2cd"/><circle cx="0.36" cy="0.3" r="0.01" fill="#d3d2cd"/>
    <circle cx="0.22" cy="0.42" r="0.008" fill="#d3d2cd"/></pattern>
  <pattern id="pat-deck" width="1.8" height="0.15" patternUnits="userSpaceOnUse">
    <rect width="1.8" height="0.15" fill="#dcb68c"/><path d="M0 0H1.8M0 0V0.15" stroke="#b98f63" stroke-width="0.012"/></pattern>
  <pattern id="pat-rumput" width="0.2" height="0.2" patternUnits="userSpaceOnUse">
    <rect width="0.2" height="0.2" fill="#cfe3b8"/><path d="M0.05 0.15l0.02-0.06M0.14 0.08l0.02-0.06" stroke="#8fb46a" stroke-width="0.012"/></pattern>
  <marker id="panah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M0 0L10 5L0 10z" fill="#333"/></marker>
</defs>`;

function garisRantai(nilai, o, off, tepi) {
  const arah = off > tepi ? 1 : -1;
  const out = [], v = [...new Set(nilai.map((n) => +n.toFixed(3)))].sort((a, b) => a - b);
  const L = (x1, y1, x2, y2, s = 'stroke="#555" stroke-width="0.015"') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${s}/>`;
  const P = (a, b) => (o === "h" ? [a, b] : [b, a]);
  out.push(L(...P(v[0], off), ...P(v[v.length - 1], off)));
  for (const n of v) {
    out.push(L(...P(n, tepi + arah * 0.2), ...P(n, off + arah * 0.12), 'stroke="#aaa" stroke-width="0.01"'));
    out.push(L(...P(n - 0.08, off + 0.08), ...P(n + 0.08, off - 0.08), 'stroke="#333" stroke-width="0.025"'));
  }
  for (let i = 0; i < v.length - 1; i++) {
    const len = v[i + 1] - v[i], mid = (v[i] + v[i + 1]) / 2;
    const fs = len < 0.9 ? 0.17 : 0.22;
    const [tx, ty] = P(mid, off - 0.09);
    out.push(`<text x="${tx}" y="${ty}" font-size="${fs}" text-anchor="middle" fill="#333"
      ${o === "v" ? `transform="rotate(-90 ${tx} ${ty})"` : ""}>${fmtUkur(len)}</text>`);
  }
  return out.join("");
}

function gambarBukaan(b) {
  const t = TEBAL_DINDING, h = b.garis === "h";
  const R = (a1, a2, p1, p2, s) => h
    ? `<rect x="${a1}" y="${p1}" width="${a2 - a1}" height="${p2 - p1}" ${s}/>`
    : `<rect x="${p1}" y="${a1}" width="${p2 - p1}" height="${a2 - a1}" ${s}/>`;
  const Ln = (a1, a2, p, s) => h
    ? `<line x1="${a1}" x2="${a2}" y1="${p}" y2="${p}" ${s}/>`
    : `<line y1="${a1}" y2="${a2}" x1="${p}" x2="${p}" ${s}/>`;
  const out = [];
  if (b.tipe === "pintu") {
    const engsel = b.engsel === "b" ? b.b : b.a, ujung = b.engsel === "b" ? b.a : b.b;
    const L = b.b - b.a, d = b.buka * L;
    const [hx, hy] = h ? [engsel, b.pos] : [b.pos, engsel];
    const [lx, ly] = h ? [engsel, b.pos + d] : [b.pos + d, engsel];
    const [ox, oy] = h ? [ujung, b.pos] : [b.pos, ujung];
    const cross = h ? -d * (ujung - engsel) : d * (ujung - engsel);
    out.push(`<path d="M${lx} ${ly}A${L} ${L} 0 0 ${cross > 0 ? 1 : 0} ${ox} ${oy}" fill="none" stroke="#777" stroke-width="0.012" stroke-dasharray="0.05 0.03"/>`);
    out.push(`<line x1="${hx}" y1="${hy}" x2="${lx}" y2="${ly}" stroke="${DINDING}" stroke-width="0.045"/>`);
  } else if (b.tipe === "bukaan") {
    const s = 'stroke="#777" stroke-width="0.012" stroke-dasharray="0.08 0.05"';
    out.push(Ln(b.a, b.b, b.pos - t / 2, s), Ln(b.a, b.b, b.pos + t / 2, s));
  } else {
    out.push(R(b.a, b.b, b.pos - t / 2, b.pos + t / 2, `fill="#fff" stroke="${DINDING}" stroke-width="0.015"`));
    const s = `stroke="#3a6f8f" stroke-width="0.012" ${b.tipe === "boven" ? 'stroke-dasharray="0.05 0.03"' : ""}`;
    out.push(Ln(b.a, b.b, b.pos - 0.02, s), Ln(b.a, b.b, b.pos + 0.02, s));
  }
  return out.join("");
}

function gambarTangga(r, gaya) {
  const out = [];
  const stroke = gaya === "aktif" || gaya === "tiba" ? "#555" : gaya === "bayang" ? "#c9c9c9" : TAHAP[r.tahap].warna;
  const dash = gaya === "rencana" ? 'stroke-dasharray="0.08 0.05"' : "";
  for (const a of r.anak)
    out.push(`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${gaya === "aktif" || gaya === "tiba" ? (a.bordes ? "#f1f1ef" : "#fff") : "none"}" stroke="${stroke}" stroke-width="0.015" ${dash}/>`);
  if (gaya !== "bayang") {
    out.push(`<polyline points="${r.panah.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#333" stroke-width="0.025" marker-end="url(#panah)"/>`);
    const [x0, y0] = r.panah[0];
    out.push(`<circle cx="${x0}" cy="${y0}" r="0.05" fill="#333"/>`);
    if (gaya === "tiba") {
      // dilihat dari lantai atas: tangga yang tiba di lantai ini
      const [x1, y1] = r.panah[r.panah.length - 1];
      out.push(`<text x="${(x0 + x1) / 2}" y="${y0 + 0.07}" font-size="0.2" text-anchor="middle" fill="#333" ${halo}>NAIK DARI LANTAI ${r.lantai}</text>`);
    } else {
      out.push(`<text x="${x0 + 0.15}" y="${y0 + 0.35}" font-size="0.2" fill="#333" ${halo}>NAIK</text>`);
      out.push(`<text x="${x0 + 0.15}" y="${y0 + 0.6}" font-size="0.16" fill="#666" ${halo}>${r.jumlah} × ${(r.naik * 100).toFixed(1)} cm</text>`);
    }
  }
  return out.join("");
}

// ---- overlay struktur: grid as, balok (putus-putus, warna per jenis + ukuran), kolom, beban terpusat ----
function gambarStruktur(lt, state, m) {
  const out = [];
  const { w: W, h: H } = LAHAN;
  const redup = (tahap) => (tahap > state.tahap ? (state.ghost ? ' opacity="0.35"' : null) : "");
  // grid as
  const g = 'stroke="#5b7fa6" stroke-width="0.012" stroke-dasharray="0.3 0.08 0.04 0.08"';
  for (const [n, x] of GRID_X)
    out.push(`<line x1="${x}" y1="-1.65" x2="${x}" y2="${H + 0.35}" ${g}/>`,
      `<circle cx="${x}" cy="-1.87" r="0.2" fill="#fff" stroke="#5b7fa6" stroke-width="0.025"/>`,
      `<text x="${x}" y="-1.8" font-size="0.21" font-weight="700" text-anchor="middle" fill="#2f5d86">${n}</text>`);
  for (const [n, y] of GRID_Y)
    out.push(`<line x1="-1.75" y1="${y}" x2="${W + 0.35}" y2="${y}" ${g}/>`,
      `<circle cx="-1.97" cy="${y}" r="0.2" fill="#fff" stroke="#5b7fa6" stroke-width="0.025"/>`,
      `<text x="-1.97" y="${y + 0.075}" font-size="0.21" font-weight="700" text-anchor="middle" fill="#2f5d86">${n}</text>`);
  // balok
  const TEBAL = { induk: 0.09, anak: 0.06, void: 0.075, tangga: 0.05, kantilever: 0.06, sloof: 0.08, ring: 0.035 };
  for (const b of BALOK.filter((b) => lantaiTampil(b) === lt)) {
    const op = redup(b.tahap);
    if (op === null) continue;
    const c = WARNA_BALOK[b.jenis], [x1, y1, x2, y2] = b.o === "h" ? [b.a, b.pos, b.b, b.pos] : [b.pos, b.a, b.pos, b.b];
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${TEBAL[b.jenis]}" stroke-dasharray="0.22 0.1"${op}/>`);
    if (b.L < 0.6) continue;
    const mid = (b.a + b.b) / 2, off = b.jenis === "ring" ? -0.14 : 0.2;
    const [tx, ty] = b.o === "h" ? [mid, b.pos - off + 0.05] : [b.pos + off, mid];
    out.push(`<text x="${tx}" y="${ty}" font-size="${b.L < 1.6 ? 0.13 : 0.16}" font-weight="600" text-anchor="middle" fill="${c}" ${halo}${op}
      ${b.o === "v" ? `transform="rotate(-90 ${tx} ${ty})"` : ""}>${b.dim[0]}/${b.dim[1]}</text>`);
  }
  // kolom: yang menerus di lantai ini hitam; kolom lantai bawah yang berhenti di bawah pelat ini: garis putus-putus
  for (const k of KOLOM) {
    const di = k.lantai.includes(lt), bawah = !di && k.lantai.includes(lt - 1) && k.jenis === "struktur";
    if (!di && !bawah) continue;
    const op = redup(di ? lt : lt - 1);
    if (op === null) continue;
    const [b, h] = (k.dim[di ? lt : lt - 1]).map((v) => v / 100);
    out.push(di
      ? `<rect x="${k.x - b / 2}" y="${k.y - h / 2}" width="${b}" height="${h}" fill="#111"${op}/>`
      : `<rect x="${k.x - b / 2}" y="${k.y - h / 2}" width="${b}" height="${h}" fill="none" stroke="#111" stroke-width="0.02" stroke-dasharray="0.05 0.03"${op}/>`);
    if (k.jenis === "struktur" && di)
      out.push(`<text x="${k.x + b / 2 + 0.04}" y="${k.y - h / 2 - 0.04}" font-size="0.13" fill="#111" ${halo}${op}>${k.id} ${k.dim[lt].join("/")}</text>`);
  }
  // penanda dinding perlu perhatian
  const sudah = new Set();
  if (lt > 1)
    for (const d of [...m.dinding].sort((p, q) => (q.b - q.a) - (p.b - p.a))) {
      const r = cariDinding(lt, d.o, d.pos, d.a, d.b);
      if (!r?.kode || d.b - d.a < 0.8 || sudah.has(r)) continue;
      sudah.add(r);
      const mid = (d.a + d.b) / 2, [cx, cy] = d.o === "h" ? [mid, d.pos + 0.3] : [d.pos - 0.3, mid];
      out.push(`<circle cx="${cx}" cy="${cy}" r="0.16" fill="${WARNA_STATUS[r.status]}"/>`,
        `<text x="${cx}" y="${cy + 0.055}" font-size="0.14" font-weight="700" text-anchor="middle" fill="#fff">${r.kode}</text>`);
    }
  // beban terpusat rooftop
  if (lt === 3)
    for (const p of BEBAN_TITIK.filter((p) => p.P >= 250)) {
      const op = redup(3);
      if (op === null) continue;
      out.push(`<path d="M${p.x - 0.1} ${p.y - 0.28}L${p.x + 0.1} ${p.y - 0.28}L${p.x} ${p.y - 0.1}Z" fill="#c0392b"${op}/>`,
        `<text x="${p.x + 0.13}" y="${p.y - 0.14}" font-size="0.14" font-weight="700" fill="#c0392b" ${halo}${op}>${fmtM(p.P / 1000)} t</text>`);
    }
  return out.join("");
}

export function gambarDenah(svg, state) {
  const dibangun = (r) => r.tahap <= state.tahap;
  const { w: W, h: H } = LAHAN;
  svg.setAttribute("viewBox", `${-PAD.l} ${-PAD.t} ${W + PAD.l + PAD.r} ${H + PAD.t + PAD.b}`);
  const lt = state.lantai;
  const ruangLt = RUANG.filter((r) => r.lantai === lt);
  const aktif = ruangLt.filter(dibangun);
  const rencana = state.ghost ? ruangLt.filter((r) => !dibangun(r)) : [];
  const out = [DEFS];

  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fafaf8" stroke="#c8c8c8" stroke-width="0.02" stroke-dasharray="0.15 0.1"/>`);

  // 1. pola lantai
  for (const r of aktif) {
    if (r.jenis === "tangga" || r.jenis === "zona") continue;
    if (r.jenis === "void")
      out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#fff"/>`);
    else out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="url(#pat-${r.finish || "keramik"})"/>`);
  }
  // 2. tangga (di lantai atas terlihat samar lewat void)
  for (const r of RUANG.filter((r) => r.jenis === "tangga")) {
    if (r.lantai === lt) {
      if (dibangun(r)) out.push(gambarTangga(r, "aktif"));
      else if (state.ghost) out.push(gambarTangga(r, "rencana"));
    } else if (r.lantai === lt - 1 && dibangun(r)) {
      // tangga yang tiba lewat lubang tangga digambar jelas; yang terlihat lewat void digambar samar
      const lewatLubang = aktif.some((v) => v.lubangTangga && v.x <= r.x + 1e-6 && v.y <= r.y + 1e-6 &&
        v.x + v.w >= r.x + r.w - 1e-6 && v.y + v.h >= r.y + r.h - 1e-6);
      out.push(gambarTangga(r, lewatLubang ? "tiba" : "bayang"));
    }
  }
  // 2b. gudang di bawah tangga: garis tersembunyi (putus-putus) + pintu di sisi timur
  for (const g of aktif.filter((r) => r.jenis === "gudangTangga")) {
    const s = `stroke="${DINDING}" stroke-width="0.07" stroke-dasharray="0.14 0.07" fill="none"`;
    const x1 = g.x + g.w, y1 = g.y + g.h, pa = g.y + 0.1, pb = g.y + g.h - 0.1;
    out.push(`<path d="M${g.x} ${g.y}V${y1}H${x1}V${pb}M${x1} ${pa}V${g.y}" ${s}/>`);
    out.push(gambarBukaan({ tipe: "pintu", garis: "v", pos: x1, a: pa, b: pb, engsel: "a", buka: +1 }));
  }
  // 3. void
  for (const r of aktif.filter((r) => r.jenis === "void" && !r.lubangTangga))
    out.push(`<path d="M${r.x} ${r.y}L${r.x + r.w} ${r.y + r.h}M${r.x + r.w} ${r.y}L${r.x} ${r.y + r.h}" stroke="#9a9a9a" stroke-width="0.015" stroke-dasharray="0.12 0.08"/>`);
  // 4. furnitur
  for (const r of aktif) for (const p of r.perabot || []) out.push(gambarPerabot(p));
  // 4b. pendopo: tiang besi + denah atap limasan ringan coklat (garis putus-putus)
  for (const r of aktif.filter((r) => r.jenis === "pendopo")) {
    out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="#8a6a48" stroke-width="0.03"/>`);
    for (const [kx, ky] of tiangPendopo(r)) out.push(`<rect x="${kx - 0.1}" y="${ky - 0.1}" width="0.2" height="0.2" fill="#222"/>`);
    const o = 0.2, x0 = r.x - o, y0 = r.y - o, x1 = r.x + r.w + o, y1 = r.y + r.h + o, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const [p, q] = r.h >= r.w ? [[cx, y0 + (x1 - x0) / 2], [cx, y1 - (x1 - x0) / 2]] : [[x0 + (y1 - y0) / 2, cy], [x1 - (y1 - y0) / 2, cy]];
    const s = 'fill="none" stroke="#6b4a2e" stroke-width="0.02" stroke-dasharray="0.15 0.08"';
    out.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" ${s}/>`);
    const [a, b] = r.h >= r.w ? [p, q] : [p, q];
    out.push(`<path d="M${x0} ${y0}L${a[0]} ${a[1]}L${x1} ${y0}M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${x0} ${y1}L${b[0]} ${b[1]}L${x1} ${y1}" ${s}/>`);
  }
  const S = state.struktur2d;
  if (S) out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fff" fill-opacity="0.6"/>`);
  // 5. dinding, railing, bukaan
  // mode struktur: dinding di atas balok/sloof abu-abu, di atas pelat kuning (a) / merah (b, c)
  const m = modelDinding(RUANG, BUKAAN, lt, dibangun);
  const t2 = TEBAL_DINDING / 2;
  const warnaDinding = (d, biasa) => {
    if (!S) return biasa;
    const r = cariDinding(lt, d.o, d.pos, d.a, d.b);
    return !r || ["balok", "sloof"].includes(r.status) ? "#a9a9a9" : WARNA_STATUS[r.status];
  };
  for (const d of m.dinding) {
    // partisi gipsum (ruang kerja): isi terang + garis tengah, beda dari pasangan hebel/bata
    const partisi = partisiDi(lt, d.o, d.pos, (d.a + d.b) / 2);
    const isi = partisi && !S ? `fill="#f1e6cc" stroke="${DINDING}" stroke-width="0.02"` : `fill="${warnaDinding(d, DINDING)}"`;
    out.push(d.o === "h"
      ? `<rect x="${d.a}" y="${d.pos - t2}" width="${d.b - d.a}" height="${TEBAL_DINDING}" ${isi}/>`
      : `<rect x="${d.pos - t2}" y="${d.a}" width="${TEBAL_DINDING}" height="${d.b - d.a}" ${isi}/>`);
    if (partisi && !S)
      out.push(d.o === "h"
        ? `<line x1="${d.a}" x2="${d.b}" y1="${d.pos}" y2="${d.pos}" stroke="${DINDING}" stroke-width="0.012" stroke-dasharray="0.06 0.04"/>`
        : `<line y1="${d.a}" y2="${d.b}" x1="${d.pos}" x2="${d.pos}" stroke="${DINDING}" stroke-width="0.012" stroke-dasharray="0.06 0.04"/>`);
  }
  for (const r of m.railing)
    out.push(r.o === "h"
      ? `<rect x="${r.a}" y="${r.pos - 0.03}" width="${r.b - r.a}" height="0.06" fill="#fff" stroke="${DINDING}" stroke-width="0.015"/>`
      : `<rect x="${r.pos - 0.03}" y="${r.a}" width="0.06" height="${r.b - r.a}" fill="#fff" stroke="${DINDING}" stroke-width="0.015"/>`);
  for (const r of m.parapet)
    out.push(r.o === "h"
      ? `<rect x="${r.a}" y="${r.pos - t2}" width="${r.b - r.a}" height="${TEBAL_DINDING}" fill="${warnaDinding(r, "#9a9a9a")}" stroke="${DINDING}" stroke-width="0.015"/>`
      : `<rect x="${r.pos - t2}" y="${r.a}" width="${TEBAL_DINDING}" height="${r.b - r.a}" fill="${warnaDinding(r, "#9a9a9a")}" stroke="${DINDING}" stroke-width="0.015"/>`);
  for (const b of m.bukaan) out.push(gambarBukaan(b));
  // 5b. zona instalasi (di atas dinding, supaya label terbaca): garis putus-putus + label kecil
  for (const r of aktif.filter((r) => r.jenis === "zona")) {
    if (r.kanopi)  // atap polikarbonat: bidang bening + garis gording
      out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#bcd8f0" fill-opacity="0.25"/>`,
        ...Array.from({ length: Math.floor(r.h / 0.6) }, (_, i) =>
          `<line x1="${r.x}" x2="${r.x + r.w}" y1="${r.y + (i + 1) * 0.6}" y2="${r.y + (i + 1) * 0.6}" stroke="#8ab4d8" stroke-width="0.01"/>`),
        ...[[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].map(([x, y]) =>
          `<rect x="${x - 0.05}" y="${y - 0.05}" width="0.1" height="0.1" fill="#333"/>`));
    out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="0.08" fill="none" stroke="#4a78b8" stroke-width="0.02" stroke-dasharray="0.1 0.06"/>`);
    out.push(`<text x="${r.x + 0.08}" y="${r.y - 0.06}" font-size="0.17" font-weight="600" fill="#2f5d86" ${halo}>${r.nama.toUpperCase()}</text>`);
  }
  // kolom (dari struktur.js); di mode struktur digambar di gambarStruktur
  if (!S && dibangun({ tahap: lt }))
    for (const k of KOLOM.filter((k) => k.lantai.includes(lt))) {
      const [b, h] = k.dim[lt].map((v) => v / 100);
      out.push(`<rect x="${k.x - b / 2}" y="${k.y - h / 2}" width="${b}" height="${h}" fill="${DINDING}"/>`);
    }
  if (S) out.push(gambarStruktur(lt, state, m));

  // 6. rencana tahap berikutnya
  for (const r of rencana) {
    if (r.jenis === "tangga" || r.jenis === "zona") continue;
    const c = TAHAP[r.tahap].warna;
    out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${c}" fill-opacity="0.07" stroke="${c}" stroke-width="0.04" stroke-dasharray="0.2 0.12"/>`);
  }
  // 7. penanda void di atas (lantai 1)
  if (lt === 1)
    for (const v of RUANG.filter((r) => r.jenis === "void" && r.lantai === lt + 1 && (dibangun(r) || state.ghost))) {
      out.push(`<rect x="${v.x + 0.12}" y="${v.y + 0.12}" width="${v.w - 0.24}" height="${v.h - 0.24}" fill="none" stroke="#666" stroke-width="0.015" stroke-dasharray="0.15 0.08"/>`);
      out.push(`<text x="${v.x + 0.25}" y="${v.y + v.h - 0.25}" font-size="0.2" fill="#555" ${halo}>VOID DI ATAS</text>`);
    }

  // 8. label ruang
  for (const r of [...aktif, ...rencana]) {
    if (r.jenis === "tangga" || r.jenis === "zona" || r.label === false) continue;
    const built = dibangun(r);
    const [lx, ly] = r.label || [r.x + r.w / 2, r.y + r.h / 2];
    const nama = r.jenis === "void" ? "VOID" : r.nama.toUpperCase();
    out.push(`<text x="${lx}" y="${ly}" font-size="0.24" font-weight="600" letter-spacing="0.01" text-anchor="middle" fill="${built ? "#222" : "#999"}" ${halo}>${nama}</text>`);
    const potongan = r.grup ? RUANG.filter((o) => o.grup === r.grup) : [r];
    const luas = r.jenis === "void" ? `${fmtUkur(r.w)} × ${fmtUkur(r.h)}` : `${fmtUkur(potongan.reduce((s, o) => s + o.w * o.h, 0))} m²`;
    out.push(`<text x="${lx}" y="${ly + 0.27}" font-size="0.19" text-anchor="middle" fill="${built ? "#666" : "#aaa"}" ${halo}>${luas}${built ? "" : " · tahap " + r.tahap}</text>`);
    if (built) out.push(`<circle cx="${lx}" cy="${ly + 0.44}" r="0.06" fill="${TAHAP[r.tahap].warna}"/>`);
  }

  // 9. garis ukuran
  // tiap sisi: rantai ukuran ruangan yang menempel di sisi itu + ukuran total
  const dim = ruangLt.filter((r) => !["tangga", "zona", "pendopo", "taman", "gudangTangga"].includes(r.jenis) && (dibangun(r) || state.ghost));
  const sama = (a, b) => Math.abs(a - b) < 1e-6;
  const xs = (f) => [0, W, ...dim.filter(f).flatMap((r) => [r.x, r.x + r.w])];
  const ys = (f) => [0, H, ...dim.filter(f).flatMap((r) => [r.y, r.y + r.h])];
  out.push(garisRantai(xs((r) => sama(r.y, 0)), "h", -0.75, 0));
  out.push(garisRantai([0, W], "h", -1.35, 0));
  out.push(garisRantai(xs((r) => sama(r.y + r.h, H)), "h", H + 0.85, H));
  out.push(garisRantai(ys((r) => sama(r.x, 0)), "v", -0.75, 0));
  out.push(garisRantai([0, H], "v", -1.35, 0));
  out.push(garisRantai(ys((r) => sama(r.x + r.w, W)), "v", W + 0.85, W));

  // 10. keterangan: arah jalan, judul, skala
  // penunjuk utara (utara = atas gambar)
  const [ux, uy] = [-1.35, H + 1.6];
  out.push(`<g transform="translate(${ux} ${uy})"><circle r="0.42" fill="none" stroke="#555" stroke-width="0.02"/>
    <path d="M0 -0.36L0.14 0.2L0 0.1L-0.14 0.2Z" fill="#333"/>
    <text y="-0.5" font-size="0.22" font-weight="700" text-anchor="middle" fill="#333">U</text></g>`);
  out.push(JALAN === "kanan"
    ? `<text x="${W + 1.7}" y="${H / 2}" font-size="0.26" text-anchor="middle" fill="#555" letter-spacing="0.05" transform="rotate(90 ${W + 1.7} ${H / 2})">▲ DEPAN · JALAN (TIMUR)</text>`
    : `<text x="${W / 2}" y="-2.15" font-size="0.26" text-anchor="middle" fill="#555" letter-spacing="0.05">▲ DEPAN · JALAN</text>`);
  out.push(`<text x="${W}" y="${H + 1.85}" font-size="0.34" font-weight="700" text-anchor="end" fill="#222">${lt === 3 ? "DENAH ROOFTOP (LANTAI 3)" : "DENAH LANTAI " + lt}</text>`);
  out.push(`<text x="${W}" y="${H + 2.2}" font-size="0.2" text-anchor="end" fill="#777">${TAHAP[state.tahap].nama} · satuan meter</text>`);
  for (let i = 0; i < 4; i++)
    out.push(`<rect x="${i}" y="${H + 1.6}" width="1" height="0.1" fill="${i % 2 ? "#fff" : "#333"}" stroke="#333" stroke-width="0.012"/>`,
      `<text x="${i}" y="${H + 1.92}" font-size="0.17" text-anchor="middle" fill="#555">${i}</text>`);
  out.push(`<text x="4" y="${H + 1.92}" font-size="0.17" text-anchor="middle" fill="#555">4 m</text>`);

  svg.innerHTML = out.join("");
}
