// Model 3D (Three.js). Dinding & bukaan diambil dari model yang sama dengan denah 2D,
// jadi pintu/jendela di denah otomatis menjadi lubang di 3D.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { LAHAN, JALAN, RUANG, BUKAAN, TAHAP, TINGGI_LANTAI, TEBAL_PELAT, TEBAL_DINDING, TINGGI_BUKAAN, TINGGI_PARAPET } from "./data.js";
import { tiangPendopo } from "./denah2d.js";
import { modelDinding, overlap } from "./model.js";

// 2D (x, y) -> 3D (x, z). Dilihat dari atas, sumbu 3D sama persis dengan denah
// (x ke kanan, z ke bawah gambar), jadi model tidak tercermin.
const Z = (y) => y;
const WARNA_FINISH = { keramik: "#f1ede5", parket: "#d9bf94", basah: "#dde7ea", beton: "#cfcdc8", deck: "#b98553", rumput: "#6aa84f" };
// kamera awal memandang dari arah jalan
const KAMERA_AWAL = JALAN === "kanan" ? [LAHAN.w + 11, 13, LAHAN.h + 7] : [LAHAN.w / 2 + 9, 14, -12];
const KAMERA_ATAS = JALAN === "kanan" ? [LAHAN.w + 5, 20, LAHAN.h + 3] : [LAHAN.w / 2 + 4, 20, -7];

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function buat3D(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfe9f1");

  const camera = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 200);
  camera.position.set(...KAMERA_AWAL);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  Object.assign(labelRenderer.domElement.style, { position: "absolute", top: "0", left: "0", pointerEvents: "none" });
  host.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(LAHAN.w / 2, 2, LAHAN.h / 2);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.05;
  window.denah3d = { camera, controls };  // untuk debug / screenshot dari console

  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-8, 20, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 });
  sun.target.position.set(LAHAN.w / 2, 0, LAHAN.h / 2);
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: "#b9cf9f" }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(LAHAN.w / 2, -0.01, LAHAN.h / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  const lahanEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(LAHAN.w, 0, LAHAN.h)),
    new THREE.LineBasicMaterial({ color: "#667" }));
  lahanEdge.position.set(LAHAN.w / 2, 0.02, LAHAN.h / 2);
  scene.add(lahanEdge);

  const mat = {
    plester: new THREE.MeshStandardMaterial({ color: "#f4f1ea" }),
    kaca: new THREE.MeshStandardMaterial({ color: "#8fb8cf", transparent: true, opacity: 0.45, roughness: 0.1 }),
    kusen: new THREE.MeshStandardMaterial({ color: "#5a4a3c" }),
    railing: new THREE.MeshStandardMaterial({ color: "#3a3a3a" }),
    atap: new THREE.MeshStandardMaterial({ color: "#8a6f5a" }),
    kolom: new THREE.MeshStandardMaterial({ color: "#d8d6d0" }),
    tangga: new THREE.MeshStandardMaterial({ color: "#c9a878" }),
  };
  const matTahap = {};
  for (const [k, t] of Object.entries(TAHAP)) matTahap[k] = new THREE.MeshStandardMaterial({ color: t.warna });
  const matFinish = {};
  for (const [k, c] of Object.entries(WARNA_FINISH)) matFinish[k] = new THREE.MeshStandardMaterial({ color: c });

  const rumah = new THREE.Group();
  scene.add(rumah);
  let animasi = [];
  let tahapSebelumnya = 0;
  let state = null;

  // potongan dinding sepanjang garis o/pos dari a..b, tinggi y0..y1 (relatif lantai)
  function potongDinding(o, pos, a, b, base, y0, y1, material, tebal = TEBAL_DINDING) {
    const len = b - a, mid = (a + b) / 2, h = y1 - y0;
    if (len <= 0 || h <= 0) return null;
    const m = o === "h" ? box(len, h, tebal, material) : box(tebal, h, len, material);
    const y = base + TEBAL_PELAT + y0 + h / 2;
    if (o === "h") m.position.set(mid, y, Z(pos));
    else m.position.set(pos, y, Z(mid));
    return m;
  }

  function buatMobil(x, y, rot) {
    const g = new THREE.Group();
    const bodi = box(1.8, 0.8, 4.4, new THREE.MeshStandardMaterial({ color: "#f2f2f2" }));
    bodi.position.set(0, 0.55, 0);
    const kabin = box(1.6, 0.6, 2.2, new THREE.MeshStandardMaterial({ color: "#445" }));
    kabin.position.set(0, 1.25, 0.2);
    g.add(bodi, kabin);
    g.position.set(x, 0, Z(y));
    g.rotation.y = (-rot * Math.PI) / 180;
    return g;
  }

  // ---- gudang bawah tangga: dinding berundak mengikuti sisi bawah anak tangga ----
  function buatGudangTangga(r, dibangun) {
    const g = new THREE.Group();
    const lantai = box(r.w, TEBAL_PELAT, r.h, matFinish[r.finish] || mat.plester);
    lantai.position.set(r.x + r.w / 2, TEBAL_PELAT / 2, Z(r.y + r.h / 2));
    g.add(lantai);
    const tangga = RUANG.find((t) => t.jenis === "tangga" && t.lantai === r.lantai && dibangun(t));
    if (!tangga) return g;
    const di = tangga.anak.filter((a) => overlap(a, r)).sort((p, q) => p.x - q.x);
    const bawah = (a) => a.top - 0.2;  // sisi bawah pelat anak tangga
    const t = 0.1, y1 = r.y + r.h, x1 = r.x + r.w;
    for (const a of di) {  // dinding selatan berundak
      const xa = Math.max(a.x, r.x), xb = Math.min(a.x + a.w, x1), h = bawah(a);
      const w = box(xb - xa, h, t, mat.plester);
      w.position.set((xa + xb) / 2, h / 2, Z(y1 - t / 2));
      g.add(w);
    }
    const hBarat = bawah(di[0]), hTimur = bawah(di[di.length - 1]);
    const barat = box(t, hBarat, r.h, mat.plester);
    barat.position.set(r.x + t / 2, hBarat / 2, Z(r.y + r.h / 2));
    const timur = box(t, hTimur, r.h, mat.plester);
    timur.position.set(x1 - t / 2, hTimur / 2, Z(r.y + r.h / 2));
    const pintu = box(0.04, Math.min(1.9, hTimur - 0.1), r.h - 0.2, mat.kusen);
    pintu.position.set(x1 + 0.01, Math.min(1.9, hTimur - 0.1) / 2, Z(r.y + r.h / 2));
    g.add(barat, timur, pintu);
    return g;
  }

  // ---- pendopo: deck kayu ditinggikan, tiang besi hitam, atap limasan genteng ----
  const matPendopo = {
    deck: new THREE.MeshStandardMaterial({ color: "#b98553" }),
    tiang: new THREE.MeshStandardMaterial({ color: "#232323", roughness: 0.6 }),
    genteng: new THREE.MeshStandardMaterial({ color: "#c8643b", side: THREE.DoubleSide, flatShading: true }),
    plafon: new THREE.MeshStandardMaterial({ color: "#8a5a36", side: THREE.DoubleSide }),
  };
  function atapLimasan(w, d, tinggi) {
    // bubungan di sumbu yang lebih panjang; 4 bidang miring
    const [hw, hd] = [w / 2, d / 2];
    const panjangX = w >= d, r = panjangX ? (w - d) / 2 : (d - w) / 2;
    const r1 = panjangX ? [-r, tinggi, 0] : [0, tinggi, -r], r2 = panjangX ? [r, tinggi, 0] : [0, tinggi, r];
    const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
    const tri = panjangX
      ? [A, B, r2, A, r2, r1, D, r1, r2, D, r2, C, A, r1, D, B, C, r2]
      : [A, B, r1, B, C, r2, B, r2, r1, C, D, r2, D, A, r1, D, r1, r2];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(tri.flat(), 3));
    geo.computeVertexNormals();
    return geo;
  }
  function buatPendopo(r, y0) {
    const g = new THREE.Group();
    const cx = r.x + r.w / 2, cz = Z(r.y + r.h / 2), tDeck = 0.2, tTiang = 2.7;
    const deck = box(r.w, tDeck, r.h, matPendopo.deck);
    deck.position.set(cx, y0 + tDeck / 2, cz);
    g.add(deck);
    for (const [kx, ky] of tiangPendopo(r)) {
      const t = box(0.2, tTiang, 0.2, matPendopo.tiang);
      t.position.set(kx, y0 + tDeck + tTiang / 2, Z(ky));
      g.add(t);
    }
    const yAtap = y0 + tDeck + tTiang;
    // balok keliling
    const bw = r.w - 0.6, bd = r.h - 0.6;
    for (const [w, d, x, z] of [[bw, 0.15, cx, Z(r.y + 0.4)], [bw, 0.15, cx, Z(r.y + r.h - 0.4)], [0.15, bd, r.x + 0.4, cz], [0.15, bd, r.x + r.w - 0.4, cz]]) {
      const b = box(w, 0.2, d, matPendopo.tiang);
      b.position.set(x, yAtap - 0.1, z);
      g.add(b);
    }
    const o = 0.2, atap = new THREE.Mesh(atapLimasan(r.w + 2 * o, r.h + 2 * o, 2.0), matPendopo.genteng);
    atap.position.set(cx, yAtap, cz);
    atap.castShadow = true;
    g.add(atap);
    return g;
  }

  // ---- peralatan rooftop & perabot 3D sederhana ----
  const matAlat = {
    tandon: new THREE.MeshStandardMaterial({ color: "#2f6fb0" }),
    putih: new THREE.MeshStandardMaterial({ color: "#eeeeee" }),
    panel: new THREE.MeshStandardMaterial({ color: "#1f3550", roughness: 0.3 }),
    logam: new THREE.MeshStandardMaterial({ color: "#777", metalness: 0.5, roughness: 0.4 }),
    pot: new THREE.MeshStandardMaterial({ color: "#b8643a" }),
    daun: new THREE.MeshStandardMaterial({ color: "#5d8f3e" }),
    rotan: new THREE.MeshStandardMaterial({ color: "#3b3530" }),
  };
  // atap polikarbonat sederhana: 4 tiang besi + lembaran bening sedikit miring
  const matKanopi = new THREE.MeshStandardMaterial({ color: "#cfe6f7", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  function buatKanopi(r, y0) {
    const g = new THREE.Group(), tinggi = 2.5;
    for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
      const t = box(0.08, tinggi, 0.08, matAlat.logam);
      t.position.set(x, y0 + tinggi / 2, Z(y));
      g.add(t);
    }
    const atap = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.3, 0.02, r.h + 0.3), matKanopi);
    atap.position.set(r.x + r.w / 2, y0 + tinggi + 0.05, Z(r.y + r.h / 2));
    atap.rotation.x = 0.05;
    g.add(atap);
    return g;
  }

  function perabot3D([tipe, x, y, rot = 0, w, h], y0) {
    const g = new THREE.Group();
    const add = (m, px, py, pz) => { m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
    const cyl = (r, h, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat);
    switch (tipe) {
      case "tandon": add(cyl(0.55, 1.3, matAlat.tandon), 0, 0.65, 0); add(cyl(0.2, 0.08, matAlat.tandon), 0, 1.34, 0); break;
      case "pompa": add(box(0.5, 0.35, 0.4, matAlat.logam), 0, 0.18, 0); break;
      case "pemanasAir": {
        const panel = add(box(2.0, 0.05, 1.0, matAlat.panel), 0, 0.55, 0.1);
        panel.rotation.x = -0.35;
        const t = add(cyl(0.2, 2.0, matAlat.putih), 0, 0.95, -0.45);
        t.rotation.z = Math.PI / 2;
        break;
      }
      case "acOutdoor": add(box(0.8, 0.55, 0.3, matAlat.putih), 0, 0.35, 0); break;
      case "antena": {
        add(cyl(0.035, 5, matAlat.logam), 0, 2.5, 0);
        for (const [hh, len] of [[3.6, 1.4], [4.1, 1.1], [4.5, 0.8]]) add(box(len, 0.03, 0.03, matAlat.logam), 0, hh, 0);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 8), matAlat.logam), 0, 5.2, 0);  // penangkal petir
        break;
      }
      case "parabola": {
        add(cyl(0.04, 1.0, matAlat.logam), 0, 0.5, 0);
        const dish = add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3),
          new THREE.MeshStandardMaterial({ color: "#dddddd", side: THREE.DoubleSide })), 0, 1.25, 0);
        dish.rotation.x = Math.PI * 0.75;
        break;
      }
      case "pot": add(cyl(0.25, 0.45, matAlat.pot), 0, 0.22, 0); add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), matAlat.daun), 0, 0.85, 0); break;
      case "jemuran": for (const px of [-(w ?? 3.2) / 2 + 0.05, (w ?? 3.2) / 2 - 0.05]) add(box(0.05, 1.6, 0.05, matAlat.logam), px, 0.8, 0); break;
      case "sofa": add(box(w ?? 2.2, 0.45, h ?? 0.9, matAlat.rotan), 0, 0.22, 0); add(box(w ?? 2.2, 0.4, 0.2, matAlat.rotan), 0, 0.65, -((h ?? 0.9) / 2) + 0.1); break;
      case "kursi": add(box(w ?? 0.5, 0.45, h ?? 0.5, matAlat.rotan), 0, 0.22, 0); break;
      case "mejaTamu": add(box(w ?? 1.0, 0.4, h ?? 0.5, matAlat.rotan), 0, 0.2, 0); break;
      case "mejaMakan": add(cyl(0.55, 0.75, matAlat.rotan), 0, 0.37, 0); break;
      default: return null;
    }
    g.position.set(x, y0, Z(y));
    g.rotation.y = (-rot * Math.PI) / 180;
    return g;
  }

  function label(teks, x, y, z, redup = false) {
    const el = document.createElement("div");
    el.className = "label3d";
    el.textContent = teks;
    if (redup) el.style.opacity = 0.45;
    const l = new CSS2DObject(el);
    l.position.set(x, y, z);
    return l;
  }

  function grupUntuk(grup, tahap, lantai) {
    const key = `${tahap}-${lantai}`;
    if (!grup.has(key)) {
      const g = new THREE.Group();
      g.userData = { tahap, base: (lantai - 1) * TINGGI_LANTAI };
      grup.set(key, g);
    }
    return grup.get(key);
  }

  function render(s) {
    state = s;
    const dibangun = (r) => r.tahap <= state.tahap;
    rumah.traverse((o) => o.isCSS2DObject && o.element.remove());
    rumah.clear();
    const grup = new Map();
    const tinggiDinding = TINGGI_LANTAI - TEBAL_PELAT;

    // potong: tampilkan hanya sampai lantai ini (untuk fokus ke ruangan di lantai bawah)
    const lantaiMaks = state.potong || 3;
    for (const lantai of [1, 2, 3].filter((l) => l <= lantaiMaks)) {
      const base = (lantai - 1) * TINGGI_LANTAI;
      const m = modelDinding(RUANG, BUKAAN, lantai, dibangun);
      const matDinding = (tahap) => (state.warnaTahap ? matTahap[tahap] : mat.plester);
      for (const d of m.dinding) {
        const w = potongDinding(d.o, d.pos, d.a, d.b, base, 0, tinggiDinding, matDinding(d.tahap));
        if (w) grupUntuk(grup, d.tahap, lantai).add(w);
      }
      for (const b of m.bukaan) {
        const g = grupUntuk(grup, b.tahap, lantai);
        const [bawah, atas] = TINGGI_BUKAAN[b.tipe];
        g.add(potongDinding(b.garis, b.pos, b.a, b.b, base, atas, tinggiDinding, matDinding(b.tahap)));
        if (bawah > 0) g.add(potongDinding(b.garis, b.pos, b.a, b.b, base, 0, bawah, matDinding(b.tahap)));
        if (b.tipe !== "pintu" && b.tipe !== "bukaan")
          g.add(potongDinding(b.garis, b.pos, b.a, b.b, base, bawah, atas, mat.kaca, 0.03));
        if (b.tipe === "pintu") {
          // daun pintu dibuka 90°
          const L = b.b - b.a, engsel = b.engsel === "b" ? b.b : b.a;
          const daun = b.garis === "h" ? box(0.04, 2.05, L, mat.kusen) : box(L, 2.05, 0.04, mat.kusen);
          const y = base + TEBAL_PELAT + 1.025;
          if (b.garis === "h") daun.position.set(engsel, y, Z(b.pos + (b.buka * L) / 2));
          else daun.position.set(b.pos + (b.buka * L) / 2, y, Z(engsel));
          g.add(daun);
        }
      }
      for (const r of m.parapet)
        grupUntuk(grup, r.tahap, lantai).add(potongDinding(r.o, r.pos, r.a, r.b, base, 0, TINGGI_PARAPET, mat.plester));
      for (const r of m.railing) {
        const g = grupUntuk(grup, r.tahap, lantai);
        g.add(potongDinding(r.o, r.pos, r.a, r.b, base, 0.95, 1.0, mat.railing, 0.05));
        g.add(potongDinding(r.o, r.pos, r.a, r.b, base, 0, 0.95, mat.kaca, 0.02));
      }
    }

    for (const r of RUANG) {
      if (r.lantai > lantaiMaks) continue;
      const built = dibangun(r);
      if (!built && !state.ghost) continue;
      const base = (r.lantai - 1) * TINGGI_LANTAI;
      const cx = r.x + r.w / 2, cz = Z(r.y + r.h / 2);

      if (!built) {  // rencana: volume transparan
        if (r.jenis === "zona") continue;
        const tinggi = r.jenis === "terbuka" ? 0.1 : r.jenis === "rooftop" ? TINGGI_PARAPET
          : r.jenis === "tangga" && r.lantai === 1 ? TINGGI_LANTAI : r.jenis === "tangga" ? 0.2 : TINGGI_LANTAI - 0.02;
        const c = new THREE.Color(TAHAP[r.tahap].warna);
        const v = new THREE.Mesh(new THREE.BoxGeometry(r.w, tinggi, r.h),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, depthWrite: false }));
        v.position.set(cx, base + tinggi / 2 + 0.01, cz);
        v.add(new THREE.LineSegments(new THREE.EdgesGeometry(v.geometry),
          new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.7 })));
        rumah.add(v);
        const ditutup = RUANG.some((o) => o.lantai === r.lantai + 1 && !dibangun(o) && overlap(o, r));
        if (!ditutup && r.jenis !== "tangga" && r.label !== false) rumah.add(label(r.nama, cx, base + tinggi + 0.4, cz, true));
        continue;
      }

      const g = grupUntuk(grup, r.tahap, r.lantai);
      if (r.jenis === "tangga") {
        const gudang = RUANG.filter((o) => o.jenis === "gudangTangga" && o.lantai === r.lantai && dibangun(o));
        for (const a of r.anak) {
          // lantai 1: anak tangga masif dari tanah, kecuali di atas gudang;
          // lantai atas: anak tangga melayang (pelat 20 cm)
          const diAtasGudang = gudang.some((o) => overlap(o, a));
          const tebal = r.lantai === 1 && !diAtasGudang ? a.top : 0.2;
          const st = box(a.w, tebal, a.h, mat.tangga);
          st.position.set(a.x + a.w / 2, base + a.top - tebal / 2, Z(a.y + a.h / 2));
          g.add(st);
        }
        continue;
      }
      if (r.jenis === "gudangTangga") {
        g.add(buatGudangTangga(r, dibangun));
        continue;
      }
      if (r.jenis === "zona") {
        const y0 = r.diAtap ? base + TINGGI_LANTAI + 0.1 : base + TEBAL_PELAT;  // diAtap: di atas atap ruang tangga
        for (const p of r.perabot || []) { const o = perabot3D(p, y0); if (o) g.add(o); }
        if (r.kanopi) g.add(buatKanopi(r, base + TEBAL_PELAT));
        continue;
      }
      if (r.jenis === "taman") {
        const rumput = box(r.w, 0.06, r.h, matFinish.rumput);
        rumput.position.set(cx, base + TEBAL_PELAT + 0.03, cz);
        g.add(rumput);
        for (const p of r.perabot || []) { const o = perabot3D(p, base + TEBAL_PELAT + 0.06); if (o) g.add(o); }
        if (r.label !== false) g.add(label(r.nama, cx, base + TEBAL_PELAT + 1.0, cz));
        continue;
      }
      if (r.jenis === "pendopo") {
        g.add(buatPendopo(r, base + TEBAL_PELAT));
        g.add(label(r.nama, cx, base + TEBAL_PELAT + 5.2, cz));
        continue;
      }
      if (r.jenis !== "void") {
        const pelat = box(r.w, TEBAL_PELAT, r.h, matFinish[r.finish] || mat.plester);
        pelat.position.set(cx, base + TEBAL_PELAT / 2, cz);
        g.add(pelat);
      }
      const diAtas = RUANG.filter((o) => o.lantai === r.lantai + 1 && dibangun(o) && overlap(o, r));
      if (["ruang", "mezanin", "void"].includes(r.jenis) && diAtas.length === 0 && !state.tanpaAtap && state.potong !== r.lantai) {
        const atap = box(r.w + 0.3, 0.1, r.h + 0.3, mat.atap);
        atap.position.set(cx, base + TINGGI_LANTAI + 0.05, cz);
        g.add(atap);
      }
      if (r.jenis === "terbuka" && diAtas.length) {
        const K = 0.3;
        for (const [kx, ky] of [[r.x, r.y], [r.x + r.w - K, r.y], [r.x, r.y + r.h - K], [r.x + r.w - K, r.y + r.h - K]]) {
          const k = box(K, TINGGI_LANTAI, K, mat.kolom);
          k.position.set(kx + K / 2, base + TINGGI_LANTAI / 2, Z(ky + K / 2));
          g.add(k);
        }
      }
      for (const p of r.perabot || []) {
        const [tipe, x, y, rot = 0] = p;
        if (tipe === "mobil") g.add(buatMobil(x, y, rot));
        else { const o = perabot3D(p, base + TEBAL_PELAT); if (o) g.add(o); }
      }
      if (!diAtas.length && r.label !== false) {
        const t = r.jenis === "terbuka" ? 0.3 : r.jenis === "rooftop" ? TINGGI_PARAPET : TINGGI_LANTAI;
        g.add(label(r.nama, cx, base + t + 0.4, cz));
      }
    }

    // animasi: tahap yang baru ditambahkan "tumbuh" dari lantainya
    animasi = [];
    for (const g of grup.values()) {
      if (g.userData.tahap > tahapSebelumnya) animasi.push({ group: g, start: performance.now() });
      rumah.add(g);
    }
    tahapSebelumnya = state.tahap;
  }

  // animasi kamera halus ke posisi & target baru
  let kameraAnim = null;
  function kameraKe(pos, target) {
    kameraAnim = { start: performance.now(), p0: camera.position.clone(), t0: controls.target.clone(),
      p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target) };
  }
  function terbang(now) {
    if (!kameraAnim) return;
    const k = Math.min((now - kameraAnim.start) / 800, 1), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(kameraAnim.p0, kameraAnim.p1, e);
    controls.target.lerpVectors(kameraAnim.t0, kameraAnim.t1, e);
    if (k === 1) kameraAnim = null;
  }

  function tumbuh(now) {
    for (const a of animasi) {
      const t = Math.min((now - a.start) / 700, 1);
      const e = 1 - Math.pow(1 - t, 3);
      a.group.scale.y = Math.max(e, 0.001);
      a.group.position.y = a.group.userData.base * (1 - e);
    }
    animasi = animasi.filter((a) => a.group.scale.y < 1);
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(host);

  renderer.setAnimationLoop((now) => {
    tumbuh(now);
    terbang(now);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return {
    render,
    // render ulang tanpa animasi tumbuh (mis. saat ganti opsi tampilan)
    renderUlang(s) { tahapSebelumnya = s.tahap; render(s); },
    kameraAtas(on) { kameraKe(on ? KAMERA_ATAS : KAMERA_AWAL, [LAHAN.w / 2, 2, LAHAN.h / 2]); },
    // arahkan kamera ke sebuah ruangan (dilihat miring dari tenggara-atas)
    fokus(r) {
      if (!r) return kameraKe(KAMERA_AWAL, [LAHAN.w / 2, 2, LAHAN.h / 2]);
      const base = (r.lantai - 1) * TINGGI_LANTAI;
      const t = [r.x + r.w / 2, base + 1, Z(r.y + r.h / 2)];
      const d = Math.max(r.w, r.h) * 1.1 + 4;
      kameraKe([t[0] + d * 0.55, t[1] + d * 0.95, t[2] + d * 0.75], t);
    },
  };
}
