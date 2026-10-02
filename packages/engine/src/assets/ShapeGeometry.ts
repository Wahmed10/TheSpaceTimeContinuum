import { BufferGeometry, BufferAttribute, Matrix4 } from 'three/webgpu';

/** Cold-path source frame -> texture frame (+X prime, +Y north, -Z east).
 * Registration inferred against independent PDS/JPL shapes; see the audit.
 * Rotate positions and normals together, preserving the original UV atlas.
 */
export function registerShapeGeometry(geometry: BufferGeometry, name: string): BufferGeometry {
  if (name === 'phobos') {
    // Source -> IAU: (z,x,y); IAU -> texture: (x,z,-y).
    geometry.applyMatrix4(new Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1));
  } else if (name === 'deimos') {
    // Source -> IAU: (-x,y,-z); IAU -> texture: (x,z,-y).
    geometry.applyMatrix4(new Matrix4().set(-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
  } else {
    throw new Error(`Unknown shape registration: ${name}`);
  }
  return geometry;
}

/** Decode the offline-normalized, quantized NASA mesh without changing its UV atlas. */
export function decodeShape(buffer: ArrayBuffer): BufferGeometry {
  const view = new DataView(buffer);
  if (view.byteLength < 12 || view.getUint32(0, true) !== 0x31504853)
    throw new Error('Invalid shape header');
  const count = view.getUint32(4, true), length = view.getUint32(8, true);
  if (!count || count > 65535 || !length || length % 3 || length > 300000 ||
      view.byteLength !== 12 + count * 13 + length * 2)
    throw new Error('Invalid shape counts');
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2), indices = new Uint16Array(length);
  let offset = 12;
  for (let i = 0; i < positions.length; i++, offset += 2)
    positions[i] = view.getInt16(offset, true) / 16384;
  for (let i = 0; i < normals.length; i++, offset++)
    normals[i] = view.getInt8(offset) / 127;
  for (let i = 0; i < uvs.length; i++, offset += 2)
    uvs[i] = view.getUint16(offset, true) / 65535;
  for (let i = 0; i < length; i++, offset += 2) {
    indices[i] = view.getUint16(offset, true);
    if (indices[i]! >= count) throw new Error('Shape index out of range');
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.normalizeNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
