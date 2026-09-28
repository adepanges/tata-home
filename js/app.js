import { RUANG, TAHAP, BANGUNAN, TIDAK_DIHITUNG } from "./data.js";
import { gambarDenah } from "./denah2d.js";
import { buat3D } from "./tampilan3d.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => +n.toFixed(2);
const state = { tahap: 1, lantai: 1, ghost: true, tanpaAtap: false, warnaTahap: true, potong: null, fokus: null };
$("tahap").max = Math.max(...RUANG.map((r) => r.tahap));

$("legend").innerHTML = Object.values(TAHAP)
  .map((t) => `<span style="--c:${t.warna}">${t.nama}</span>`).join("");

function renderRingkasan() {
  let kum = 0;
  const rows = Object.entries(TAHAP).map(([k, t]) => {
    const rs = RUANG.filter((r) => r.tahap === +k);
    const luasOf = (f) => fmt(rs.filter(f).reduce((s, r) => s + r.w * r.h, 0));
    const luas = luasOf((r) => BANGUNAN.includes(r.jenis));
    const luasLain = luasOf((r) => !BANGUNAN.includes(r.jenis) && !TIDAK_DIHITUNG.includes(r.jenis));
    kum = fmt(kum + luas);
    return `<tr class="${+k > state.tahap ? "future" : ""}">
      <td><span style="color:${t.warna}">■</span> ${t.nama}</td>
      <td>${[...new Set(rs.map((r) => r.nama))].join(", ")}</td>
      <td class="num">${luas} m²</td><td class="num">${luasLain} m²</td><td class="num">${kum} m²</td></tr>`;
  });
  $("ringkasan").innerHTML = `<tr><th>Tahap</th><th>Ruangan</th><th class="num">Luas bangunan</th>
    <th class="num">Terbuka (garasi, balkon, rooftop)</th><th class="num">Kumulatif bangunan</th></tr>` + rows.join("");
}

const svg = $("svg2d");
const tiga = buat3D($("view3d"));

// ---- tombol shortcut per ruang: fokus kamera 3D ke ruangan, lantai di atasnya disembunyikan ----
const NAMA_LANTAI = { 1: "Lantai 1", 2: "Lantai 2", 3: "Rooftop" };
function daftarRuang() {
  const hasil = [], sudah = new Set();
  for (const r of RUANG) {
    if (r.tahap > state.tahap || ["zona", "tangga"].includes(r.jenis) || (r.jenis === "void" && r.label === false)) continue;
    const key = `${r.lantai}|${r.grup || r.nama}`;
    if (sudah.has(key)) continue;
    sudah.add(key);
    // ruangan bentuk L: gabungkan potongannya jadi satu kotak pembatas
    const pot = r.grup ? RUANG.filter((o) => o.grup === r.grup) : [r];
    const x = Math.min(...pot.map((o) => o.x)), y = Math.min(...pot.map((o) => o.y));
    const w = Math.max(...pot.map((o) => o.x + o.w)) - x, h = Math.max(...pot.map((o) => o.y + o.h)) - y;
    hasil.push({ key, nama: r.nama, lantai: r.lantai, x, y, w, h });
  }
  return hasil;
}
function renderShortcut() {
  const grup = {};
  for (const r of daftarRuang()) (grup[r.lantai] ||= []).push(r);
  $("shortcut").innerHTML = `<button class="chip ${state.fokus ? "" : "on"}" data-key="">Semua</button>` +
    Object.entries(grup).map(([lt, rs]) => `<span class="chip-grup"><b>${NAMA_LANTAI[lt]}</b>` +
      rs.map((r) => `<button class="chip ${state.fokus === r.key ? "on" : ""}" data-key="${r.key}">${r.nama}</button>`).join("") +
      `</span>`).join("");
}
$("shortcut").onclick = (e) => {
  const b = e.target.closest("button.chip");
  if (!b) return;
  const r = daftarRuang().find((o) => o.key === b.dataset.key);
  state.fokus = r ? r.key : null;
  state.potong = r ? r.lantai : null;
  if (r && r.lantai !== state.lantai) pilihLantai(r.lantai);  // denah 2D ikut pindah lantai
  tiga.renderUlang(state);
  tiga.fokus(r);
  renderShortcut();
};

function renderSemua() {
  $("tahapLbl").textContent = TAHAP[state.tahap].nama;
  gambarDenah(svg, state);
  tiga.render(state);
  renderRingkasan();
  renderShortcut();
}

$("tahap").oninput = (e) => { state.tahap = +e.target.value; renderSemua(); };
$("ghost").onchange = (e) => { state.ghost = e.target.checked; gambarDenah(svg, state); tiga.renderUlang(state); };
$("tanpaAtap").onchange = (e) => {
  state.tanpaAtap = e.target.checked;
  tiga.kameraAtas(state.tanpaAtap);  // tanpa atap: kamera lebih tinggi supaya bisa melihat ke dalam
  tiga.renderUlang(state);
};
$("warnaTahap").onchange = (e) => { state.warnaTahap = e.target.checked; tiga.renderUlang(state); };
function pilihLantai(lt) {
  state.lantai = lt;
  for (const x of $("lantaiSeg").children) x.classList.toggle("on", +x.dataset.lantai === lt);
  gambarDenah(svg, state);
}
$("lantaiSeg").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) pilihLantai(+b.dataset.lantai);
};
$("unduhSvg").onclick = () => {
  const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" ${svg.outerHTML.slice(4)}`], { type: "image/svg+xml" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `denah-lantai-${state.lantai}.svg` });
  a.click();
  URL.revokeObjectURL(a.href);
};
renderSemua();
