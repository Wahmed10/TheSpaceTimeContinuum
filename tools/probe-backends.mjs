import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
await page.goto('http://localhost:3000/lab/probe');
const info = await page.evaluate(async () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  const adapter = await navigator.gpu?.requestAdapter();
  return {webgl:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null, webgpu:adapter ? {vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description,isFallbackAdapter:adapter.info.isFallbackAdapter}:null};
});
await writeFile('docs/perf/local-gpu-probe.json', JSON.stringify({measuredAt:new Date().toISOString(),...info},null,2));
console.log(info);
await browser.close();
