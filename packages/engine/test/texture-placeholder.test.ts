import { describe, expect, it } from 'vitest';
import {
  CompressedTexture,
  RGBA_S3TC_DXT5_Format,
  Texture,
} from 'three/webgpu';
import {
  adoptTextureContent,
  createTexturePlaceholder,
} from '../src/assets/TexturePlaceholder';

describe('download-free texture preview and compressed swap', () => {
  it('uses a neutral normal and zero cloud/height preview without large allocations', () => {
    const normal = createTexturePlaceholder('moon_normal');
    expect(Array.from(normal.image.data as Uint8Array)).toEqual([
      128, 128, 255, 255,
    ]);
    expect(createTexturePlaceholder('moon_height').image.data[0]).toBe(0);
    expect(createTexturePlaceholder('earth_clouds').image.data[0]).toBe(0);
    expect(normal.image.width).toBe(1);
    expect(normal.generateMipmaps).toBe(false);
  });
  it('retains material texture identity and switches the actual backend upload path', () => {
    const preview = createTexturePlaceholder('mars');
    const reference = preview;
    const compressed = new CompressedTexture(
      [{ data: new Uint8Array(16), width: 4, height: 4 }],
      4,
      4,
      RGBA_S3TC_DXT5_Format,
    );
    compressed.flipY = false;
    adoptTextureContent(preview, compressed);
    expect(preview).toBe(reference);
    expect(preview.image).toBe(compressed.image);
    expect(preview.mipmaps).toEqual(compressed.mipmaps);
    expect(preview.format).toBe(RGBA_S3TC_DXT5_Format);
    expect(
      (preview as Texture & { isDataTexture: boolean }).isDataTexture,
    ).toBe(false);
    expect(
      (preview as Texture & { isCompressedTexture: boolean })
        .isCompressedTexture,
    ).toBe(true);
    expect(preview.flipY).toBe(false);
  });
});
