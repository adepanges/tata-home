// Simbol furnitur denah (tampak atas), satuan meter.
// Tiap simbol digambar di koordinat lokal 0..w × 0..h; sisi "belakang" (sandaran,
// kepala kasur, tangki kloset, layar TV) ada di atas (y=0). Rotasi 90 = belakang
// menghadap kanan, 180 = bawah, 270 = kiri.

const G = 'stroke="#4a4a4a" stroke-width="0.02" fill="#fff"';
const T = 'stroke="#8a8a8a" stroke-width="0.012" fill="none"';

const rect = (x, y, w, h, rx = 0, s = G) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${s}/>`;
const circ = (cx, cy, r, s = G) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s}/>`;
const ell = (cx, cy, rx, ry, s = G) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${s}/>`;
const path = (d, s = T) => `<path d="${d}" ${s}/>`;

export const SIMBOL = {
  kasur: { w: 1.6, h: 2.0, gambar: (w, h) => {
    const n = w >= 1.3 ? 2 : 1, pw = (w - 0.2 - (n - 1) * 0.08) / n;
    let s = rect(0, 0, w, h, 0.04);
    for (let i = 0; i < n; i++) s += rect(0.1 + i * (pw + 0.08), 0.08, pw, 0.32, 0.06);
    s += path(`M0 ${0.55}H${w}`, G);                                   // tepi selimut
    s += path(`M${w} ${0.55}L${w - 0.35} ${0.9}L${w} ${0.9}`, T);      // lipatan
    return s;
  } },
  lemari: { w: 2.0, h: 0.6, gambar: (w, h) =>
    rect(0, 0, w, h) + path(`M0 ${h / 2}H${w}`, 'stroke="#8a8a8a" stroke-width="0.012" stroke-dasharray="0.06 0.04" fill="none"') +
    Array.from({ length: Math.floor(w / 0.25) }, (_, i) => path(`M${0.15 + i * 0.25} ${h / 2 - 0.1}L${0.2 + i * 0.25} ${h / 2 + 0.1}`)).join("") },
  sofa: { w: 2.2, h: 0.9, gambar: (w, h) => {
    const arm = 0.18, n = w > 1.9 ? 3 : 2, cw = (w - 2 * arm) / n;
    let s = rect(0, 0, w, h, 0.08) + rect(arm, 0, w - 2 * arm, 0.22, 0.04);
    s += rect(0, 0, arm, h, 0.06) + rect(w - arm, 0, arm, h, 0.06);
    for (let i = 0; i < n; i++) s += rect(arm + i * cw + 0.02, 0.24, cw - 0.04, h - 0.3, 0.05);
    return s;
  } },
  mejaTamu: { w: 1.0, h: 0.5, gambar: (w, h) => rect(0, 0, w, h, 0.04) + rect(0.06, 0.06, w - 0.12, h - 0.12, 0.03, T) },
  tv: { w: 1.6, h: 0.4, gambar: (w, h) => rect(0, 0, w, h) + rect(0.2, 0.04, w - 0.4, 0.06, 0.01, 'fill="#4a4a4a"') },
  mejaMakan: { w: 1.9, h: 1.9, gambar: (w, h) => {
    const c = w / 2, kursi = (x, y, r) =>
      `<g transform="translate(${x} ${y}) rotate(${r})">${rect(-0.22, -0.2, 0.44, 0.4, 0.06)}${path("M-0.2 0.14H0.2", G)}</g>`;
    return kursi(c, 0.22, 180) + kursi(c, h - 0.22, 0) + kursi(0.22, c, 90) + kursi(w - 0.22, c, 270) + circ(c, c, 0.55);
  } },
  counter: { w: 0.6, h: 2.0, gambar: (w, h) => rect(0, 0, w, h, 0, 'stroke="#4a4a4a" stroke-width="0.02" fill="#f3f1ec"') },
  sink: { w: 0.8, h: 0.5, gambar: (w, h) => rect(0, 0, w, h, 0.04) + rect(0.06, 0.08, w - 0.12, h - 0.14, 0.06, T) + circ(w / 2, h / 2 + 0.02, 0.03, T) },
  kompor: { w: 0.6, h: 0.5, gambar: (w, h) => rect(0, 0, w, h, 0.02) +
    circ(0.17, 0.15, 0.09, T) + circ(0.43, 0.15, 0.09, T) + circ(0.17, 0.36, 0.07, T) + circ(0.43, 0.36, 0.07, T) },
  kulkas: { w: 0.7, h: 0.7, gambar: (w, h) => rect(0, 0, w, h, 0.02) + path(`M0.06 ${h - 0.1}H${w - 0.06}`) +
    `<text x="${w / 2}" y="${h / 2 + 0.05}" font-size="0.14" text-anchor="middle" fill="#8a8a8a">KLK</text>` },
  kloset: { w: 0.4, h: 0.7, gambar: (w, h) => rect(0, 0, w, 0.18, 0.03) + ell(w / 2, 0.44, 0.18, 0.25) + ell(w / 2, 0.46, 0.11, 0.16, T) },
  wastafel: { w: 0.5, h: 0.4, gambar: (w, h) => rect(0, 0, w, h, 0.05) + ell(w / 2, h / 2 + 0.03, 0.17, 0.12, T) + circ(w / 2, 0.07, 0.02, T) },
  shower: { w: 0.9, h: 0.9, gambar: (w, h) => rect(0, 0, w, h, 0, 'stroke="#4a4a4a" stroke-width="0.02" fill="#f4f8f9"') +
    path(`M0 0L${w} ${h}M${w} 0L0 ${h}`) + circ(w / 2, h / 2, 0.04, G) },
  mesinCuci: { w: 0.6, h: 0.6, gambar: (w, h) => rect(0, 0, w, h, 0.03) + rect(0.04, 0.03, w - 0.08, 0.09, 0.01, T) +
    circ(w / 2, h / 2 + 0.05, 0.2, T) + circ(w / 2, h / 2 + 0.05, 0.12, T) },
  // ---- instalasi rooftop ----
  tandon: { w: 1.1, h: 1.1, gambar: (w) => circ(w / 2, w / 2, w / 2, 'stroke="#2f5d86" stroke-width="0.025" fill="#e6f0f7"') +
    circ(w / 2, w / 2, w / 2 - 0.12, 'stroke="#2f5d86" stroke-width="0.012" fill="none"') +
    `<text x="${w / 2}" y="${w / 2 + 0.07}" font-size="0.17" text-anchor="middle" fill="#2f5d86">1000 L</text>` },
  pompa: { w: 0.5, h: 0.4, gambar: (w, h) => rect(0, 0, w, h, 0.03) + circ(w * 0.35, h / 2, 0.12, T) +
    `<text x="${w * 0.78}" y="${h / 2 + 0.06}" font-size="0.14" text-anchor="middle" fill="#555">P</text>` },
  pemanasAir: { w: 2.0, h: 1.3, gambar: (w, h) => {
    let s = rect(0, 0.35, w, h - 0.35, 0.02, 'stroke="#333" stroke-width="0.02" fill="#dfe8f2"');
    for (let i = 1; i < 8; i++) s += path(`M${(i * w) / 8} 0.35V${h}`, 'stroke="#8aa3bd" stroke-width="0.012" fill="none"');
    return s + rect(0, 0, w, 0.3, 0.15, 'stroke="#333" stroke-width="0.02" fill="#f2f2f2"');  // tangki di atas panel
  } },
  jemuran: { w: 3.2, h: 0.6, gambar: (w, h) => rect(0, 0, 0.08, h, 0, 'fill="#555"') + rect(w - 0.08, 0, 0.08, h, 0, 'fill="#555"') +
    [0.15, 0.3, 0.45].map((y) => path(`M0.08 ${y}H${w - 0.08}`, 'stroke="#777" stroke-width="0.012" stroke-dasharray="0.08 0.04" fill="none"')).join("") },
  acOutdoor: { w: 0.8, h: 0.3, gambar: (w, h) => rect(0, 0, w, h, 0.02) + circ(w * 0.38, h / 2, 0.11, T) + path(`M${w * 0.72} 0.05V${h - 0.05}`) },
  antena: { w: 0.6, h: 0.6, gambar: (w) => circ(w / 2, w / 2, 0.08, 'fill="#333"') +
    path(`M0 ${w / 2}H${w}M${w / 2} 0V${w}M0.08 0.08L${w - 0.08} ${w - 0.08}`, 'stroke="#333" stroke-width="0.02" fill="none"') +
    circ(w / 2, w / 2, w / 2, 'stroke="#c33" stroke-width="0.012" stroke-dasharray="0.04 0.03" fill="none"') },
  parabola: { w: 0.9, h: 0.9, gambar: (w) => circ(w / 2, w / 2, w / 2, 'stroke="#333" stroke-width="0.02" fill="#f4f4f4"') +
    circ(w / 2, w / 2, 0.06, 'fill="#333"') + path(`M${w / 2} ${w / 2}L${w - 0.1} 0.1`, 'stroke="#333" stroke-width="0.015" fill="none"') },
  pot: { w: 0.6, h: 0.6, gambar: (w) => circ(w / 2, w / 2, w / 2 - 0.05, 'stroke="#9a5a32" stroke-width="0.02" fill="#e9c9a8"') +
    [0, 72, 144, 216, 288].map((a) => `<ellipse cx="${w / 2}" cy="${w / 2 - 0.13}" rx="0.07" ry="0.15" transform="rotate(${a} ${w / 2} ${w / 2})" fill="#6a9a4a"/>`).join("") },
  mejaKerja: { w: 1.6, h: 0.6, gambar: (w, h) => rect(0, 0, w, h, 0.02) + rect(w / 2 - 0.3, 0.06, 0.6, 0.04, 0, 'fill="#4a4a4a"') },
  kursi: { w: 0.5, h: 0.5, gambar: (w, h) => rect(0.03, 0.08, w - 0.06, h - 0.1, 0.08) + rect(0.06, 0, w - 0.12, 0.1, 0.04) },
  rak: { w: 0.35, h: 2.0, gambar: (w, h) => {
    let s = rect(0, 0, w, h);
    const panjang = Math.max(w, h), n = Math.round(panjang / 0.5);
    for (let i = 1; i < n; i++) s += h > w ? path(`M0 ${(i * h) / n}H${w}`) : path(`M${(i * w) / n} 0V${h}`);
    return s;
  } },
  mobil: { w: 1.8, h: 4.4, gambar: (w, h) =>
    `<rect x="0" y="0" width="${w}" height="${h}" rx="0.45" stroke="#4a4a4a" stroke-width="0.025" fill="#fbfbfb"/>` +
    path(`M0.2 1.35Q${w / 2} 1.05 ${w - 0.2} 1.35L${w - 0.28} 1.95H0.28Z`, 'stroke="#4a4a4a" stroke-width="0.015" fill="#dfe6ea"') +
    rect(0.28, 1.95, w - 0.56, 1.35, 0.1, T) +
    path(`M0.28 3.3H${w - 0.28}L${w - 0.2} 3.75Q${w / 2} 3.95 0.2 3.75Z`, 'stroke="#4a4a4a" stroke-width="0.015" fill="#dfe6ea"') +
    rect(-0.12, 1.45, 0.14, 0.12, 0.03) + rect(w - 0.02, 1.45, 0.14, 0.12, 0.03) },
};

// item: [tipe, cx, cy, rotasi, w?, h?]
export function gambarPerabot([tipe, cx, cy, rot = 0, w, h]) {
  const s = SIMBOL[tipe];
  if (!s) return "";
  w ??= s.w; h ??= s.h;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) translate(${-w / 2} ${-h / 2})">${s.gambar(w, h)}</g>`;
}
