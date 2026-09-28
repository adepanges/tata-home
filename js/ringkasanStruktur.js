// Tabel ringkasan & legenda struktur (HTML). Semua angka = perkiraan awal untuk diskusi.
import { MATERIAL_DINDING, BERAT_BATA_MERAH } from "./data.js";
import { KOLOM, BALOK, DINDING, BEBAN_TITIK, GRID_X, GRID_Y, ASUMSI, WARNA_BALOK, NAMA_BALOK, WARNA_STATUS, ringkasan, fmtM } from "./struktur.js";

const ton = (kg) => `${fmtM(kg / 1000)} t`;
const NAMA_LEVEL = { 1: "Sloof (lantai 1)", 2: "Balok lantai 2", 3: "Balok rooftop" };
const NAMA_LANTAI = { 1: "Lantai 1", 2: "Lantai 2", 3: "Rooftop" };
const PERINGATAN = `<div class="peringatan"><b>Perkiraan awal untuk diskusi, bukan desain final.</b>
  Perhitungan final wajib oleh insinyur struktur (SNI 2847 beton, SNI 1727 beban, SNI 1726 gempa).
  Pondasi dan kolom tahap 1 harus dihitung untuk <b>beban akhir 3 lantai</b> (lantai 2 + rooftop),
  dan daya dukung tanah wajib dicek (sondir).</div>`;

export function legendStruktur() {
  const balok = Object.entries(WARNA_BALOK).map(([j, c]) => `<span style="--c:${c}">${NAMA_BALOK[j]}</span>`).join("");
  return balok +
    `<span class="kotak" style="--c:#111">Kolom (putus-putus = kolom lantai bawah)</span>` +
    `<span class="kotak" style="--c:#a9a9a9">Dinding di atas balok/sloof</span>` +
    `<span class="kotak" style="--c:${WARNA_STATUS.a}">Dinding di atas pelat + tulangan tambahan</span>` +
    `<span class="kotak" style="--c:${WARNA_STATUS.b}">Perlu balok anak / digeser</span>` +
    `<span class="kotak" style="--c:#c0392b">▼ beban terpusat rooftop</span>`;
}

export function renderStruktur() {
  const R = ringkasan();
  const out = [PERINGATAN];

  // ---- grid ----
  out.push(`<div class="grid2"><div><h3>Grid struktur</h3><ul>
    <li>As x (barat → timur): ${GRID_X.map(([n, v]) => `<b>${n}</b> = ${fmtM(v)}`).join(" · ")} m</li>
    <li>As y (utara → selatan): ${GRID_Y.map(([n, v]) => `<b>${n}</b> = ${fmtM(v)}`).join(" · ")} m</li>
    <li>Bentang umum ≤ 4 m. Pengecualian: <b>garasi 6,5 m</b> (as D &amp; E, arah utara–selatan). Pintu masuk garasi
      di as E tidak boleh berkolom, dan kolom tengah garasi (D2) akan menghalangi mobil. Kolom D1/D3 sengaja
      ditaruh di tepi utara/selatan garasi, sehingga arah timur–barat cukup 2 m + 4 m, tidak 6 m.</li>
    <li><b>B3 &amp; C3 hanya lantai 1.</b> Di lantai 2 posisinya jatuh di tengah K. Tamu dan KM, jadi kolom
      berhenti di bawah pelat lantai 2 dan balok rooftop as B / C membentang 6 m.</li>
  </ul></div>`);

  // ---- efisiensi ----
  out.push(`<div><h3>Efisiensi yang sudah diterapkan</h3><ul>
    <li>Dinding foyer digeser ke x = 4, segaris dinding KM. Garis ini jadi as kolom B, dengan satu balok &amp; sloof menerus.</li>
    <li>Open space lantai 1: dinding living–r. makan, r. makan–dapur, foyer–living, foyer–selasar dan dapur–selasar
      dihapus. Pemisah dapur–r. makan cukup meja island.</li>
    <li>Lantai 2: ruang kerja ditutup <b>partisi gipsum 2 lapis + rockwool</b> (±45 kg/m², kedap suara STC ±50)
      dengan kaca mati laminated ke dapur kering dan pintu solid-core ber-seal. Partisi ini ringan (&lt; 200 kg/m),
      jadi cukup di atas pelat walau di atas garasi. Kalau dipakai hebel 10 cm (±345 kg/m), perlu balok anak 4 m
      dan kedap suaranya malah lebih rendah. Walk-in terbuka ke kamar utama. Dinding studio–balkon memakai kaca geser, cukup di atas pelat.</li>
    <li>Dinding utara R. Tangga rooftop dipindah ke y = 0, di atas balok tepi, sehingga tidak perlu balok anak dan bordesnya lebih lega.</li>
    <li>Pendopo 4,8 m sehingga tiangnya tepat di as balok. Atap pendopo memakai material ringan.</li>
    <li>Tandon dipindah ke atas KM Dalam (petak kolom C4–D4), tidak lagi di atas kamar tidur. Pipa turun lewat satu
      shaft ke KM lantai 2, KM lantai 1 dan dapur. Pemanas air surya pindah ke area terbuka di luar bayangan R. Tangga.</li>
    <li>Kolom D1/D3 di tepi garasi: bentang timur–barat 2 + 4 m, bukan 6 m. Pintu/jendela digeser sedikit supaya tidak bertabrakan dengan kolom.</li>
  </ul></div></div><div class="grid2">`);

  // ---- kolom ----
  const struktur = KOLOM.filter((k) => k.jenis === "struktur");
  const maks = (lt) => struktur.filter((k) => k.P[lt]).sort((a, b) => b.P[lt] - a.P[lt])[0];
  out.push(`<div><h3>Kolom per lantai</h3><table>
    <tr><th>Lantai</th><th class="num">Jumlah</th><th>Ukuran (cm)</th><th>Beban terbesar</th></tr>
    ${R.kolomPerLantai.map((k) => {
      const m = k.lantai < 3 ? maks(k.lantai) : null;
      return `<tr><td>${NAMA_LANTAI[k.lantai]}</td><td class="num">${k.jumlah}${k.praktis ? ` (${k.praktis} praktis)` : ""}</td>
        <td>${Object.entries(k.ukuran).map(([u, n]) => `${n} × ${u}`).join(", ")}</td>
        <td>${m ? `${m.id}: ${ton(m.P[k.lantai])}` : "kolom praktis R. Tangga & parapet (jarak ≤ 3 m)"}</td></tr>`;
    }).join("")}
  </table>
  <ul><li>Lantai 1 minimal 30/30 (bangunan 3 lantai). Hitungan kasar cukup 25/25 di lantai 2; bila dipakai sistem
    SRPMK (gempa tinggi), SNI 2847 mensyaratkan sisi kolom ≥ 30 cm. Keputusan ada di insinyur struktur.</li>
    <li>Perkiraan pondasi telapak (tanah asumsi ${fmtM(ASUMSI.tanah / 1000)} t/m²):
      ${fmtM(Math.min(...struktur.map((k) => k.pondasi)))}–${fmtM(Math.max(...struktur.map((k) => k.pondasi)))} m persegi. Dibuat di tahap 1 untuk beban akhir.</li></ul>
  </div></div>`);

  // ---- balok per jenis ----
  out.push(`<h3>Balok per jenis</h3><div class="scroll"><table>
    <tr><th>Level</th><th>Jenis</th><th class="num">Jumlah</th><th class="num">Panjang total</th><th>Ukuran b/h (cm)</th></tr>
    ${R.balokPerJenis.map((b) => `<tr><td>${NAMA_LEVEL[b.level]}</td>
      <td><span class="sw" style="background:${WARNA_BALOK[b.jenis]}"></span>${NAMA_BALOK[b.jenis]}${b.untukDinding ? ` <small>(${b.untukDinding} khusus menopang dinding)</small>` : ""}</td>
      <td class="num">${b.jumlah}</td><td class="num">${fmtM(b.panjang)} m</td><td>${b.ukuran.join(", ")}</td></tr>`).join("")}
  </table></div>
  <ul><li>Aturan praktis: balok induk h ≈ L/10–L/12, balok anak h ≈ L/15, lebar ≈ ½ h (min. 20 cm induk, 15 cm anak).
    Lalu dicek kasar terhadap momen dari jalur beban pelat → balok anak → balok induk → kolom.</li>
    <li>Pelat lantai 2: ${ASUMSI.pelat[2] * 100} cm. Rooftop: ${ASUMSI.pelat[3] * 100} cm (taman, tandon, pendopo).
      Beban hidup ${ASUMSI.ll[2]} / ${ASUMSI.ll[3]} kg/m². KM +${ASUMSI.basah} kg/m², taman +${ASUMSI.taman} kg/m².</li>
    <li>Balok induk lantai 2 dicor di tahap 1 sebagai ring balok, dengan ukuran final. Balok induk rooftop dicor di tahap 2.</li></ul>`);

  // ---- beban dinding: hebel vs bata ----
  const tot = R.bebanDinding.filter((b) => b.lantai > 1);
  const hemat = tot.reduce((s, b) => s + b.beratBata - b.berat, 0);
  out.push(`<div class="grid2"><div><h3>Beban dinding per lantai</h3><table>
    <tr><th>Lantai</th><th>Material</th><th class="num">Panjang</th><th class="num">Berat</th><th class="num">Seandainya bata merah*</th></tr>
    ${R.bebanDinding.map((b) => `<tr><td>${NAMA_LANTAI[b.lantai]}</td><td>${b.material}</td>
      <td class="num">${fmtM(b.panjang)} m</td><td class="num">${ton(b.berat)}</td>
      <td class="num">${b.lantai === 1 ? "—" : `${ton(b.beratBata)} <small>(+${Math.round((b.beratBata / b.berat - 1) * 100)}%)</small>`}</td></tr>`).join("")}
  </table>
  <ul><li>*Kolom bata merah di lantai 2 &amp; rooftop <b>hanya pembanding</b>. Rencananya tetap hebel. Bata merah hanya di lantai 1.</li>
    <li>Hebel di lantai 2 + rooftop menghemat ±<b>${ton(hemat)}</b> beban dinding
      (±${Math.round(MATERIAL_DINDING[2].berat * 3)} kg/m untuk dinding 3 m vs ±${BERAT_BATA_MERAH * 3} kg/m bata; parapet ±${Math.round(MATERIAL_DINDING[3].berat * 1.3)} kg/m).</li></ul></div>`);

  // ---- dampak ke balok & kolom ----
  const sumP = (f) => struktur.reduce((s, k) => s + f(k), 0);
  const P1 = sumP((k) => k.P[1]), P1b = sumP((k) => k.PBata[1]);
  out.push(`<div><h3>Dampak hebel ke balok &amp; kolom</h3>
    <ul><li>Total beban ke pondasi (layan): <b>${ton(P1)}</b> dengan hebel, vs ${ton(P1b)} seandainya bata merah
      (−${Math.round((1 - P1 / P1b) * 100)}%). Luas pondasi telapak ikut turun ±${Math.round((1 - P1 / P1b) * 100)}%.</li>
      <li>${R.selisihBalok.length} balok akan lebih besar seandainya bata merah:</li></ul>
    <table><tr><th>Balok</th><th class="num">L</th><th>Hebel</th><th>Bata merah</th></tr>
    ${R.selisihBalok.sort((a, b) => b.L - a.L).map((b) => `<tr><td>${b.id}</td><td class="num">${fmtM(b.L)} m</td>
      <td>${b.dim.join("/")}</td><td>${b.dimBata.join("/")}</td></tr>`).join("")}
    </table>
    <ul><li>Kolom: semua tetap di ukuran minimum (30/30 &amp; 25/25) di kedua material, tetapi beban kolom
      garasi D3 turun dari ${ton(KOLOM.find((k) => k.id === "D3").PBata[1])} menjadi ${ton(KOLOM.find((k) => k.id === "D3").P[1])}.</li></ul>
  </div></div>`);

  // ---- dinding perlu perhatian ----
  const semuaAtas = DINDING.filter((r) => r.lantai > 1);
  out.push(`<h3>Dinding di atas pelat yang perlu perhatian (${R.perhatian.length} dari ${semuaAtas.length} dinding hebel)</h3>
    <div class="scroll"><table><tr><th></th><th>Dinding</th><th>Letak</th><th class="num">Panjang</th><th class="num">Beban</th><th>Alasan</th><th>Rekomendasi</th></tr>
    ${R.perhatian.map((r) => `<tr><td><span class="kode" style="background:${WARNA_STATUS[r.status]}">${r.kode}</span></td>
      <td>${NAMA_LANTAI[r.lantai]} · ${r.nama.ruang}</td><td>${r.nama.garis}</td><td class="num">${fmtM(r.panjang)} m</td>
      <td class="num">${Math.round(r.bebanGaris)} kg/m</td><td>${r.alasan}</td><td>(${r.status}) ${r.rekomendasi}</td></tr>`).join("")}
    </table></div>
    <details><summary>Semua dinding hebel lantai 2 &amp; rooftop (${semuaAtas.length})</summary><div class="scroll"><table>
    <tr><th>Dinding</th><th>Letak</th><th class="num">Panjang</th><th class="num">Beban</th><th>Status</th></tr>
    ${semuaAtas.map((r) => `<tr><td>${NAMA_LANTAI[r.lantai]} · ${r.nama.ruang}</td><td>${r.nama.garis}</td><td class="num">${fmtM(r.panjang)} m</td>
      <td class="num">${Math.round(r.bebanGaris)} kg/m</td><td>${r.status === "balok" ? "" : `(${r.status}) `}${r.rekomendasi}</td></tr>`).join("")}
    </table></div></details>`);

  // ---- perhatian khusus ----
  const titik = BEBAN_TITIK.filter((p) => p.P >= 250);
  const garasi = BALOK.filter((b) => b.L >= 6 && b.jenis === "induk");
  out.push(`<h3>Perhatian khusus</h3><ul>
    <li><b>Garasi 6 × 6,5 m tanpa kolom tengah</b>: balok bentang panjang ${garasi.map((b) => `${b.id} ${b.dim.join("/")}`).join(", ")}.
      Balok anak as y = 4 (${BALOK.filter((b) => b.level === 2 && b.o === "h" && b.pos === 4 && b.a >= 6).map((b) => b.dim.join("/")).join(" & ")})
      menopang dinding K. Utama di atasnya. Dinding lantai 2 di atas garasi duduk di balok, kecuali dinding kaca
      geser studio–balkon dan partisi gipsum ruang kerja yang cukup ringan untuk pelat.</li>
    <li><b>Tepi void</b>: balok tepi void di as 2 dan as B. Dinding void 6 m di as A dan as 1 diberi balok ikat
      selebar dinding, supaya tidak ada balok menggantung di atas tangga. Bordes tangga rooftop ditumpu
      balok dalam dinding barat + balok kantilever 1 m dari kolom A2.</li>
    <li><b>Beban terpusat rooftop</b>: ${titik.map((p) => `${p.nama} ${ton(p.P)} → ${p.balok.length === 1 ? p.balok[0].id : `dibagi ke ${p.balok.map((b) => b.id).join(" & ")}`}`).join("; ")}.</li>
    <li><b>2 tandon 1000 L</b> (±2,2 t penuh) berdiri di petak 2 × 1,3 m yang dibingkai kolom C4–D4, balok y = 10, as C, as D
      dan balok dudukan y = 8,7. Beban turun ke kolom C4 &amp; D4 dalam jarak ±1,3 m. Pelat petak ini ditebalkan atau diberi
      dudukan beton ±15 cm. Di bawahnya KM Dalam, jadi tidak di atas kamar tidur, dan satu tumpukan dengan KM lantai 1.
      Tiang pendopo jatuh tepat di as balok x = 6 / 8 / 10.</li>
    <li><b>Distribusi air</b>: pipa turun lewat shaft di pojok KM Dalam (±3 m ke shower lantai 2). KM lantai 1 tepat di bawahnya,
      dapur lantai 1 ±3 m lewat plafon, dapur kering lantai 2 ±8 m lewat plafon koridor. Tekanan gravitasi ke lantai 2
      hanya ±0,2–0,3 bar, jadi <b>pompa booster</b> di sebelah tandon diperlukan. Pemanas air surya ±4 m dari shaft,
      dan pipa air panasnya perlu diisolasi.</li>
    <li>Taman rooftop: pakai planter box dengan media tanam ringan dan lapisan drainase; waterproofing wajib.</li>
  </ul>`);

  // ---- detail ----
  out.push(`<details><summary>Daftar semua balok (${BALOK.length})</summary><div class="scroll"><table>
    <tr><th>Kode</th><th>Jenis</th><th class="num">L</th><th>b/h</th><th class="num">q</th><th>Keterangan</th></tr>
    ${BALOK.map((b) => `<tr><td>${b.id}</td><td><span class="sw" style="background:${WARNA_BALOK[b.jenis]}"></span>${NAMA_BALOK[b.jenis]}</td>
      <td class="num">${fmtM(b.L)} m</td><td>${b.dim.join("/")}</td><td class="num">${b.beban ? `${Math.round(b.beban.q)} kg/m` : ""}</td><td>${b.ket || ""}</td></tr>`).join("")}
    </table></div></details>
    <details><summary>Daftar kolom struktur (${struktur.length})</summary><div class="scroll"><table>
    <tr><th>As</th><th>Ukuran lt 1</th><th>Ukuran lt 2</th><th class="num">P lt 2</th><th class="num">P lt 1</th><th class="num">Pondasi</th><th>Keterangan</th></tr>
    ${struktur.map((k) => `<tr><td>${k.id}</td><td>${k.dim[1].join("/")}</td><td>${k.dim[2] ? k.dim[2].join("/") : "—"}</td>
      <td class="num">${k.P[2] ? ton(k.P[2]) : "—"}</td><td class="num">${ton(k.P[1])}</td><td class="num">${fmtM(k.pondasi)} × ${fmtM(k.pondasi)} m</td><td>${k.ket}</td></tr>`).join("")}
    </table></div></details>`);
  return out.join("");
}
