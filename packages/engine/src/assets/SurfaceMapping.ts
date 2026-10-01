import type { Texture } from 'three/webgpu';

/** Cylindrical images have north in their first row. glTF atlases retain native UVs.
 * Io's ISIS PositiveWest label describes coordinates, not reversed raster columns:
 * SimpleCylindrical converts west-positive angles to east-positive projected X.
 */
export function configureSurfaceMapping(texture: Texture, name: string): void {
  const atlas = name === 'phobos' || name === 'deimos';
  texture.repeat.set(1, atlas ? 1 : -1);
  texture.offset.set(0, atlas ? 0 : 1);
}
