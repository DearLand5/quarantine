// Объединение статических мешей: одна геометрия на пару (зона, материал).
// Сотни мелких деталей интерьера превращаются в несколько десятков вызовов отрисовки,
// а разбиение по комнатам сохраняет отсечение по пирамиде видимости.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); });
  for (const m of meshes) {
    const key = `${m.userData.zone || 'misc'}|${m.material.uuid}|${m.castShadow ? 1 : 0}`;
    if (!groups.has(key)) groups.set(key, { material: m.material, zone: m.userData.zone, cast: m.castShadow, geos: [] });
    const g = m.geometry.index ? m.geometry.clone() : m.geometry.clone();
    // Приводим к единому набору атрибутов (position, normal, uv)
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.applyMatrix4(m.matrixWorld);
    groups.get(key).geos.push(g.index ? g.toNonIndexed() : g);
  }
  for (const m of meshes) m.removeFromParent();

  let drawCalls = 0;
  for (const { material, zone, cast, geos } of groups.values()) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.batched = true;
    mesh.userData.zone = zone;
    mesh.name = `static:${zone}:${material.name}`;
    root.add(mesh);
    drawCalls++;
  }
  return { sourceMeshes: meshes.length, drawCalls };
}
