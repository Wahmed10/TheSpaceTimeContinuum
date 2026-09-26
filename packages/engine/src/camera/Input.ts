import type { CameraController } from './CameraController';
export class Input {
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private travel = 0;
  private lastTap = 0;
  private multiTouch = false;
  private controller = new AbortController();
  constructor(
    canvas: HTMLCanvasElement,
    camera: CameraController,
    radius: () => number,
    pick: (x: number, y: number, touch: boolean) => void,
    focus: () => void,
    hover: (x: number | null, y: number | null) => void = () => {},
  ) {
    const signal = this.controller.signal;
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        canvas.focus();
        canvas.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size === 1) this.multiTouch = false;
        else this.multiTouch = true;
        hover(null, null);
        this.travel = 0;
        this.pinch = this.distance();
      },
      { signal },
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        const p = this.pointers.get(e.pointerId);
        if (!p) {
          if (e.pointerType !== 'touch') hover(e.clientX, e.clientY);
          return;
        }
        const dx = e.clientX - p.x,
          dy = e.clientY - p.y;
        this.travel += Math.abs(dx) + Math.abs(dy);
        p.x = e.clientX;
        p.y = e.clientY;
        if (this.pointers.size === 2) {
          const d = this.distance();
          if (this.pinch > 0) camera.zoom(Math.log(this.pinch / d), radius());
          this.pinch = d;
        } else if (e.shiftKey || e.buttons === 2) camera.pan(dx, dy);
        else camera.orbit(dx, dy);
      },
      { signal },
    );
    canvas.addEventListener(
      'pointerup',
      (e) => {
        if (!this.multiTouch && this.travel < 6 && this.pointers.size === 1) {
          pick(e.clientX, e.clientY, e.pointerType === 'touch');
          if (e.pointerType === 'touch') {
            const now = performance.now();
            if (now - this.lastTap < 300) {
              focus();
              this.lastTap = 0;
            } else this.lastTap = now;
          }
        }
        this.pointers.delete(e.pointerId);
      },
      { signal },
    );
    canvas.addEventListener('pointerleave', () => hover(null, null), {
      signal,
    });
    canvas.addEventListener(
      'pointercancel',
      (e) => this.pointers.delete(e.pointerId),
      { signal },
    );
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        hover(null, null);
        camera.zoom(e.deltaY * (e.deltaMode === 1 ? 0.025 : 0.0015), radius());
      },
      { signal, passive: false },
    );
    canvas.addEventListener('dblclick', focus, { signal });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), {
      signal,
    });
    canvas.addEventListener(
      'keydown',
      (e) => {
        const move: Record<string, [number, number]> = {
          ArrowLeft: [-10, 0],
          ArrowRight: [10, 0],
          ArrowUp: [0, 10],
          ArrowDown: [0, -10],
        };
        if (move[e.key]) {
          e.preventDefault();
          camera.orbit(...move[e.key]!);
        }
        if (e.key === '+' || e.key === '=') camera.zoom(-0.2, radius());
        if (e.key === '-') camera.zoom(0.2, radius());
      },
      { signal },
    );
  }
  private distance() {
    const p = [...this.pointers.values()];
    return p.length === 2
      ? Math.hypot(p[0]!.x - p[1]!.x, p[0]!.y - p[1]!.y)
      : 0;
  }
  dispose() {
    this.controller.abort();
    this.pointers.clear();
  }
}
