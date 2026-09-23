export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';
export type QualitySetting = QualityTier | 'auto';
export const QUALITY = {
  low: { dpr: 1, segments: 48, texture: 1024, bloom: false },
  medium: { dpr: 1.5, segments: 64, texture: 2048, bloom: true },
  high: { dpr: 2, segments: 128, texture: 4096, bloom: true },
  ultra: { dpr: 2, segments: 256, texture: 8192, bloom: true },
} as const;
export class QualityManager {
  tier: QualityTier;
  setting: QualitySetting = 'auto';
  dpr: number;
  private slow = 0;
  private fast = 0;
  constructor(
    private mobile: boolean,
    private backend: string,
  ) {
    this.tier = mobile ? 'low' : backend === 'webgl2' ? 'medium' : 'high';
    this.dpr = Math.min(
      globalThis.devicePixelRatio || 1,
      QUALITY[this.tier].dpr,
    );
  }
  set(setting: QualitySetting) {
    this.setting = setting;
    this.tier =
      setting === 'auto'
        ? this.mobile
          ? 'low'
          : this.backend === 'webgl2'
            ? 'medium'
            : 'high'
        : setting;
    this.dpr = Math.min(
      globalThis.devicePixelRatio || 1,
      QUALITY[this.tier].dpr,
    );
    this.slow = 0;
    this.fast = 0;
  }
  sample(p95: number, elapsedSec: number): boolean {
    if (this.setting !== 'auto') return false;
    const budget = this.tier === 'low' ? 33.34 : 16.67;
    this.slow = p95 > budget * 1.25 ? this.slow + elapsedSec : 0;
    this.fast = p95 < budget * 0.7 ? this.fast + elapsedSec : 0;
    if (this.slow >= 5) {
      this.slow = 0;
      if (this.dpr > 0.75) this.dpr = Math.max(0.75, this.dpr - 0.25);
      else if (this.tier !== 'low') {
        this.tier = this.tier === 'high' ? 'medium' : 'low';
        this.dpr = 1;
      } else return false;
      return true;
    }
    if (
      this.fast >= 20 &&
      this.dpr <
        Math.min(globalThis.devicePixelRatio || 1, QUALITY[this.tier].dpr)
    ) {
      this.fast = 0;
      this.dpr += 0.25;
      return true;
    }
    return false;
  }
}
