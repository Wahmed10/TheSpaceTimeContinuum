import { RenderPipeline } from 'three/webgpu';
import type { WebGPURenderer, Scene, Camera } from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
export class PostFX {
  private pipeline: RenderPipeline | null = null;
  private scenePass: ReturnType<typeof pass> | null = null;
  private bloomPass: ReturnType<typeof bloom> | null = null;
  private enabled = false;
  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {}
  setEnabled(on: boolean) {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) {
      this.scenePass = pass(this.scene, this.camera);
      this.bloomPass = bloom(this.scenePass.getTextureNode(), 0.35, 0.4, 1.2);
      this.pipeline = new RenderPipeline(this.renderer);
      this.pipeline.outputNode = this.scenePass.add(this.bloomPass);
    } else {
      this.bloomPass?.dispose();
      this.scenePass?.dispose();
      this.pipeline?.dispose();
      this.bloomPass = null;
      this.scenePass = null;
      this.pipeline = null;
    }
  }
  render() {
    if (this.enabled) this.pipeline!.render();
    else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.setEnabled(false);
  }
}
