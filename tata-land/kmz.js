// Export the house to a Google Earth KMZ: doc.kml (parcel, house model, simple massing) + rumah.dae (COLLADA).
// Google Earth Pro (desktop) shows the full COLLADA model; Google Earth web ignores <Model>, so the
// "Massing" folder (extruded footprint, absolute altitude) is there for the web version.
import * as THREE from "three";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const f = (n) => +n.toFixed(4);

// meshes under `root` -> COLLADA, Z up. toLocal(Vector3 in root's frame) returns [east, north, up] metres from the model origin.
export function colladaDari(root, toLocal) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const perMat = new Map(); // "rrggbb|opacity" -> { pos: [], nor: [] }
  const v = new THREE.Vector3(), n = new THREE.Vector3(), o = new THREE.Vector3();
  root.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    let hidden = false;
    for (let p = m.parent; p && p !== root; p = p.parent) if (!p.visible) hidden = true;
    if (hidden) return;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    const opacity = mat.transparent ? mat.opacity : 1;
    if (opacity < 0.05) return;
    const key = mat.color.getHexString() + "|" + opacity.toFixed(2);
    if (!perMat.has(key)) perMat.set(key, { pos: [], nor: [] });
    const out = perMat.get(key);
    const rel = inv.clone().multiply(m.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(rel);
    const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, idx = g.index;
    const count = idx ? idx.count : P.count;
    const origin = toLocal(o.set(0, 0, 0));
    for (let i = 0; i < count; i++) {
      const k = idx ? idx.getX(i) : i;
      out.pos.push(...toLocal(v.fromBufferAttribute(P, k).applyMatrix4(rel)));
      if (N) {  // normals: same rotation as positions, without the translation
        n.fromBufferAttribute(N, k).applyMatrix3(nm).normalize();
        const t = toLocal(n.clone()), d = [t[0] - origin[0], t[1] - origin[1], t[2] - origin[2]], l = Math.hypot(...d) || 1;
        out.nor.push(d[0] / l, d[1] / l, d[2] / l);
      } else out.nor.push(0, 0, 1);
    }
  });

  let effects = "", materials = "", geoms = "", nodes = "", i = 0;
  for (const [key, { pos, nor }] of perMat) {
    const [hex, op] = key.split("|"), c = new THREE.Color("#" + hex);
    const id = "m" + i++, tri = pos.length / 9;
    effects += `<effect id="${id}-fx"><profile_COMMON><technique sid="common"><lambert>` +
      `<diffuse><color>${f(c.r)} ${f(c.g)} ${f(c.b)} 1</color></diffuse>` +
      `<transparent opaque="A_ONE"><color>0 0 0 ${op}</color></transparent><transparency><float>1</float></transparency>` +
      `</lambert></technique></profile_COMMON></effect>`;
    materials += `<material id="${id}-mat"><instance_effect url="#${id}-fx"/></material>`;
    geoms += `<geometry id="${id}-g"><mesh>` +
      `<source id="${id}-p"><float_array id="${id}-pa" count="${pos.length}">${pos.map(f).join(" ")}</float_array>` +
      `<technique_common><accessor source="#${id}-pa" count="${pos.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>` +
      `<source id="${id}-n"><float_array id="${id}-na" count="${nor.length}">${nor.map(f).join(" ")}</float_array>` +
      `<technique_common><accessor source="#${id}-na" count="${nor.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>` +
      `<vertices id="${id}-v"><input semantic="POSITION" source="#${id}-p"/></vertices>` +
      `<triangles material="mat" count="${tri}"><input semantic="VERTEX" source="#${id}-v" offset="0"/><input semantic="NORMAL" source="#${id}-n" offset="1"/>` +
      `<p>${Array.from({ length: tri * 3 }, (_, j) => j + " " + j).join(" ")}</p></triangles></mesh></geometry>`;
    nodes += `<node id="${id}-node"><instance_geometry url="#${id}-g"><bind_material><technique_common>` +
      `<instance_material symbol="mat" target="#${id}-mat"/></technique_common></bind_material></instance_geometry></node>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
<asset><unit name="meter" meter="1"/><up_axis>Z_UP</up_axis></asset>
<library_effects>${effects}</library_effects>
<library_materials>${materials}</library_materials>
<library_geometries>${geoms}</library_geometries>
<library_visual_scenes><visual_scene id="scene">${nodes}</visual_scene></library_visual_scenes>
<scene><instance_visual_scene url="#scene"/></scene>
</COLLADA>`;
}

// ---- minimal ZIP (stored, no compression) ----
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files) { // files: [[name, string]]
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const head = (sig, extra) => { const b = new DataView(new ArrayBuffer(extra)); b.setUint32(0, sig, true); return b; };
    const l = head(0x04034b50, 30);
    l.setUint16(4, 20, true); l.setUint16(8, 0, true); l.setUint32(14, crc, true);
    l.setUint32(18, data.length, true); l.setUint32(22, data.length, true); l.setUint16(26, nm.length, true);
    const c = head(0x02014b50, 46);
    c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
    parts.push(l, nm, data); central.push(c, nm);
    offset += 30 + nm.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/vnd.google-earth.kmz" });
}

const ring = (lls, alt) => [...lls, lls[0]].map(([lo, la]) => `${lo.toFixed(9)},${la.toFixed(9)}${alt != null ? "," + alt.toFixed(2) : ""}`).join(" ");

// opts: { parcel: [[lon,lat]], lots: [{name, ll:[[lon,lat]]}], origin: [lon,lat], originAlt (m above ground at origin),
//         footprint: [[lon,lat]] x4, floorAbs, height, look: {lon, lat, heading}, dae }
export function kmz(o) {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<name>Tata Home on Tata Land</name>
<open>1</open>
<LookAt><longitude>${o.look.lon}</longitude><latitude>${o.look.lat}</latitude><altitude>0</altitude>
  <heading>${f(o.look.heading)}</heading><tilt>65</tilt><range>70</range><altitudeMode>relativeToGround</altitudeMode></LookAt>
<Style id="parcel"><LineStyle><color>ff303bff</color><width>3</width></LineStyle><PolyStyle><fill>0</fill></PolyStyle></Style>
<Style id="lot"><LineStyle><color>ffffffff</color><width>1.5</width></LineStyle><PolyStyle><color>3300ccff</color></PolyStyle></Style>
<Style id="mass"><LineStyle><color>ff3a3a3a</color><width>1</width></LineStyle><PolyStyle><color>cceaf1f4</color></PolyStyle></Style>
<Placemark><name>Parcel</name><styleUrl>#parcel</styleUrl><Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>
  <outerBoundaryIs><LinearRing><coordinates>${ring(o.parcel)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
${o.lots.map((l) => `<Placemark><name>${esc(l.name)}</name><styleUrl>#lot</styleUrl><Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>
  <outerBoundaryIs><LinearRing><coordinates>${ring(l.ll)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`).join("\n")}
<Placemark><name>House (3D model, Google Earth Pro)</name>
  <description>Floor ±0.00 is ${o.originAlt.toFixed(2)} m above the ground at the front-north (road) corner.</description>
  <Model><altitudeMode>relativeToGround</altitudeMode>
  <Location><longitude>${o.origin[0].toFixed(9)}</longitude><latitude>${o.origin[1].toFixed(9)}</latitude><altitude>${o.originAlt.toFixed(3)}</altitude></Location>
  <Orientation><heading>0</heading><tilt>0</tilt><roll>0</roll></Orientation><Scale><x>1</x><y>1</y><z>1</z></Scale>
  <Link><href>rumah.dae</href></Link></Model></Placemark>
<Folder><name>Massing (for Google Earth web)</name><visibility>0</visibility>
  <description>Google Earth web cannot show 3D models. This box uses absolute altitude from the SRTM elevations, so it may float or sink a few metres.</description>
  <Placemark><name>House massing</name><visibility>0</visibility><styleUrl>#mass</styleUrl><Polygon><extrude>1</extrude><altitudeMode>absolute</altitudeMode>
  <outerBoundaryIs><LinearRing><coordinates>${ring(o.footprint, o.floorAbs + o.height)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
</Folder>
</Document></kml>`;
  return zip([["doc.kml", kml], ["rumah.dae", o.dae]]);
}
