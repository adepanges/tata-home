import { RUANG, TAHAP, BANGUNAN, TIDAK_DIHITUNG } from "./data.js";
import { gambarDenah } from "./denah2d.js";
import { buat3D } from "./tampilan3d.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => +n.toFixed(2);
const state = { tahap: 1, lantai: 1, ghost: true, tanpaAtap: false, warnaTahap: true };
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
      <td>${rs.map((r) => r.nama).join(", ")}</td>
      <td class="num">${luas} m²</td><td class="num">${luasLain} m²</td><td class="num">${kum} m²</td></tr>`;
  });
  $("ringkasan").innerHTML = `<tr><th>Tahap</th><th>Ruangan</th><th class="num">Luas bangunan</th>
    <th class="num">Carport/balkon</th><th class="num">Kumulatif bangunan</th></tr>` + rows.join("");
}

const svg = $("svg2d");
const tiga = buat3D($("view3d"));

function renderSemua() {
  $("tahapLbl").textContent = TAHAP[state.tahap].nama;
  gambarDenah(svg, state);
  tiga.render(state);
  renderRingkasan();
}

$("tahap").oninput = (e) => { state.tahap = +e.target.value; renderSemua(); };
$("ghost").onchange = (e) => { state.ghost = e.target.checked; gambarDenah(svg, state); tiga.renderUlang(state); };
$("tanpaAtap").onchange = (e) => {
  state.tanpaAtap = e.target.checked;
  tiga.kameraAtas(state.tanpaAtap);  // tanpa atap: kamera lebih tinggi supaya bisa melihat ke dalam
  tiga.renderUlang(state);
};
$("warnaTahap").onchange = (e) => { state.warnaTahap = e.target.checked; tiga.renderUlang(state); };
$("lantaiSeg").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  state.lantai = +b.dataset.lantai;
  for (const x of $("lantaiSeg").children) x.classList.toggle("on", x === b);
  gambarDenah(svg, state);
};
$("unduhSvg").onclick = () => {
  const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" ${svg.outerHTML.slice(4)}`], { type: "image/svg+xml" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `denah-lantai-${state.lantai}.svg` });
  a.click();
  URL.revokeObjectURL(a.href);
};
renderSemua();
