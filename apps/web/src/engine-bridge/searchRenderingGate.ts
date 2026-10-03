import type { EngineApi } from '@space/engine';

interface PaintScheduler {
  request(callback: () => void): number;
  cancel(handle: number): void;
}

/** Give the dialog and accepted route/card a paint before background 3D work.
 * Two one-shot frames are a paint boundary, never a React frame subscription. */
export class SearchRenderingGate {
  private release: (() => void) | null = null;
  private frame: number | null = null;
  private revision = 0;
  private alive = true;
  constructor(
    private readonly engine: Pick<EngineApi, 'suspendRendering'>,
    private readonly scheduler: PaintScheduler,
  ) {}
  get held() {
    return this.release !== null;
  }
  private cancel() {
    this.revision++;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
  }
  hold() {
    if (!this.alive) return;
    this.cancel();
    this.release ??= this.engine.suspendRendering();
  }
  resumeAfterPaint() {
    if (!this.alive || !this.release || this.frame !== null) return;
    const revision = this.revision;
    this.frame = this.scheduler.request(() => {
      if (!this.alive || revision !== this.revision) return;
      this.frame = this.scheduler.request(() => {
        if (!this.alive || revision !== this.revision) return;
        this.frame = null;
        const release = this.release;
        this.release = null;
        release?.();
      });
    });
  }
  dispose() {
    if (!this.alive) return;
    this.alive = false;
    this.cancel();
    this.release?.();
    this.release = null;
  }
}
