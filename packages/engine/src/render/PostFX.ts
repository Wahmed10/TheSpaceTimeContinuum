import { RenderPipeline } from 'three/webgpu';
import type { WebGPURenderer, Scene, Camera } from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
export class PostFX {
  private pipeline: RenderPipeline;
  private scenePass: ReturnType<typeof pass>;
  private bloomPass: ReturnType<typeof bloom>;
  private enabled = false;
  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {
    this.scenePass = pass(scene, camera);
    this.bloomPass = bloom(this.scenePass.getTextureNode(), 0.35, 0.4, 1.2);
    this.pipeline = new RenderPipeline(renderer);
    this.pipeline.outputNode = this.scenePass.add(this.bloomPass);
  }
  setEnabled(on: boolean) {
    this.enabled = on;
  }
  render() {
    if (this.enabled) this.pipeline.render();
    else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.bloomPass.dispose();
    this.scenePass.dispose();
    this.pipeline.dispose();
  }
}
