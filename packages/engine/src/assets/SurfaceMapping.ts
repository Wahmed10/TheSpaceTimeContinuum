import type { Texture } from 'three/webgpu';

/** Cylindrical images have north in their first row. glTF atlases retain native UVs.
 * Io's ISIS PositiveWest label describes coordinates, not reversed raster columns:
 * SimpleCylindrical converts west-positive angles to east-positive projected X.
 */
export function configureSurfaceMapping(texture: Texture, name: string): void {
  const atlas = name === 'phobos' || name === 'deimos';
  texture.repeat.set(1, atlas ? 1 : -1);
  // Ceres's source has 180 E at center. Charon's source has 0 at center,
  // but its published KTX2 has a legacy half-width shift baked in.
  // Both require a half-width sampling offset; no asset rebake is needed.
  texture.offset.set(name === 'ceres' || name === 'charon' ? 0.5 : 0, atlas ? 0 : 1);
}
