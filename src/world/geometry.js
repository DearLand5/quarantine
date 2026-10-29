// Геометрические помощники: UV-координаты в метрах, чтобы текстуры не растягивались на объектах разного размера.
import * as THREE from 'three';

const geoCache = new Map();

/** Коробка с UV в метрах (u,v = реальные размеры грани). Кэшируется по размерам. */
export function boxGeo(w, h, d) {
  const key = `b:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // Порядок граней BoxGeometry: +x, -x, +y, -y, +z, -z (по 4 вершины)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}

/** Плоскость w×h с UV в метрах; смещение uOffset/vOffset позволяет стыковать сегменты стены без шва рисунка. */
export function planeGeo(w, h, uOffset = 0, vOffset = 0) {
  const key = `p:${w.toFixed(3)}:${h.toFixed(3)}:${uOffset.toFixed(3)}:${vOffset.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + uOffset, uv.getY(i) * h + vOffset);
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}

export function cylGeo(rt, rb, h, seg = 12) {
  const key = `c:${rt}:${rb}:${h}:${seg}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  const uv = g.attributes.uv;
  const circ = Math.PI * 2 * Math.max(rt, rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}

export function sphereGeo(r, ws = 12, hs = 8) {
  const key = `s:${r}:${ws}:${hs}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.SphereGeometry(r, ws, hs);
  geoCache.set(key, g);
  return g;
}

export function disposeGeometryCache() {
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
}
