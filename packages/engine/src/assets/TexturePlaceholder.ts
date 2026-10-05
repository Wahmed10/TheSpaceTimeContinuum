import {
  Color,
  LinearFilter,
  RGBAFormat,
  Texture,
  UnsignedByteType,
} from 'three/webgpu';
import { EXPLORABLE_BODIES } from '@space/domain';

type UploadTexture = Texture & {
  isDataTexture?: boolean;
  isCompressedTexture?: boolean;
  isCompressedArrayTexture?: boolean;
};

/** A neutral preview needs no download or large CPU/GPU allocation. Real 1K maps
 * replace it asynchronously; all material nodes retain the same Texture object. */
export function createTexturePlaceholder(
  name: string,
): Texture<{ data: Uint8Array; width: number; height: number }> {
  let rgba: number[];
  if (/normal/.test(name)) rgba = [128, 128, 255, 255];
  else if (/specular|cloud|height|nightmap|stars_milky_way/.test(name))
    rgba = [0, 0, 0, 255];
  else if (name === 'saturn_ring_alpha') rgba = [200, 185, 158, 0];
  else {
    const body = EXPLORABLE_BODIES.find((body) => body.texture === name);
    const color = new Color(body?.color ?? '#b7b7b7');
    // Catalog colors are sRGB; the manager sets each map's actual color space.
    color.convertLinearToSRGB();
    rgba = [
      Math.round(color.r * 255),
      Math.round(color.g * 255),
      Math.round(color.b * 255),
      255,
    ];
  }
  const texture = new Texture<{
    data: Uint8Array;
    width: number;
    height: number;
  }>() as Texture<{ data: Uint8Array; width: number; height: number }> &
    UploadTexture;
  texture.image = { data: new Uint8Array(rgba), width: 1, height: 1 };
  texture.isDataTexture = true;
  texture.format = RGBAFormat;
  texture.type = UnsignedByteType;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  return texture;
}

/** Texture.copy does not copy subclass upload flags. A preview-to-KTX swap must
 * change those flags too, or the backend uploads compressed bytes as pixels. */
export function adoptTextureContent(target: Texture, source: Texture): void {
  const upload = target as UploadTexture,
    incoming = source as UploadTexture;
  target.dispose();
  target.copy(source);
  upload.isDataTexture = incoming.isDataTexture === true;
  upload.isCompressedTexture = incoming.isCompressedTexture === true;
  upload.isCompressedArrayTexture = incoming.isCompressedArrayTexture === true;
}
