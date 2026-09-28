// Model 3D (Three.js). Dinding & bukaan diambil dari model yang sama dengan denah 2D,
// jadi pintu/jendela di denah otomatis menjadi lubang di 3D.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { LAHAN, JALAN, RUANG, BUKAAN, TAHAP, TINGGI_LANTAI, TEBAL_PELAT, TEBAL_DINDING, TINGGI_BUKAAN } from "./data.js";
import { modelDinding, overlap } from "./model.js";

// 2D (x, y) -> 3D (x, z). Dilihat dari atas, sumbu 3D sama persis dengan denah
// (x ke kanan, z ke bawah gambar), jadi model tidak tercermin.
const Z = (y) => y;
const WARNA_FINISH = { keramik: "#f1ede5", parket: "#d9bf94", basah: "#dde7ea", beton: "#cfcdc8" };
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
    g.rotation.y = (rot * Math.PI) / 180;
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

    for (const lantai of [1, 2]) {
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
      for (const r of m.railing) {
        const g = grupUntuk(grup, r.tahap, lantai);
        g.add(potongDinding(r.o, r.pos, r.a, r.b, base, 0.95, 1.0, mat.railing, 0.05));
        g.add(potongDinding(r.o, r.pos, r.a, r.b, base, 0, 0.95, mat.kaca, 0.02));
      }
    }

    for (const r of RUANG) {
      const built = dibangun(r);
      if (!built && !state.ghost) continue;
      const base = (r.lantai - 1) * TINGGI_LANTAI;
      const cx = r.x + r.w / 2, cz = Z(r.y + r.h / 2);

      if (!built) {  // rencana: volume transparan
        const tinggi = r.jenis === "terbuka" ? 0.1 : r.jenis === "tangga" ? TINGGI_LANTAI : TINGGI_LANTAI - 0.02;
        const c = new THREE.Color(TAHAP[r.tahap].warna);
        const v = new THREE.Mesh(new THREE.BoxGeometry(r.w, tinggi, r.h),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, depthWrite: false }));
        v.position.set(cx, base + tinggi / 2 + 0.01, cz);
        v.add(new THREE.LineSegments(new THREE.EdgesGeometry(v.geometry),
          new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.7 })));
        rumah.add(v);
        const ditutup = RUANG.some((o) => o.lantai === r.lantai + 1 && !dibangun(o) && overlap(o, r));
        if (!ditutup && r.jenis !== "tangga") rumah.add(label(r.nama, cx, base + tinggi + 0.4, cz, true));
        continue;
      }

      const g = grupUntuk(grup, r.tahap, r.lantai);
      if (r.jenis === "tangga") {
        for (const a of r.anak) {
          const st = box(a.w, a.top, a.h, mat.tangga);
          st.position.set(a.x + a.w / 2, a.top / 2, Z(a.y + a.h / 2));
          g.add(st);
        }
        continue;
      }
      if (r.jenis !== "void") {
        const pelat = box(r.w, TEBAL_PELAT, r.h, matFinish[r.finish] || mat.plester);
        pelat.position.set(cx, base + TEBAL_PELAT / 2, cz);
        g.add(pelat);
      }
      const diAtas = RUANG.filter((o) => o.lantai === r.lantai + 1 && dibangun(o) && overlap(o, r));
      if (["ruang", "mezanin", "void"].includes(r.jenis) && diAtas.length === 0 && !state.tanpaAtap) {
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
      for (const [tipe, x, y, rot = 0] of r.perabot || [])
        if (tipe === "mobil") g.add(buatMobil(x, y, rot));
      if (!diAtas.length) {
        const t = r.jenis === "terbuka" ? 0.3 : TINGGI_LANTAI;
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
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return {
    render,
    // render ulang tanpa animasi tumbuh (mis. saat ganti opsi tampilan)
    renderUlang(s) { tahapSebelumnya = s.tahap; render(s); },
    kameraAtas(on) { camera.position.set(...(on ? KAMERA_ATAS : KAMERA_AWAL)); },
  };
}
