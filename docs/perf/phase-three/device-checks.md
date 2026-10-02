# Phase 3 device rendering checks

The local renderer regression and same-machine five-path CPU comparison pass at `f74242a`. That automation uses SwiftShader WebGL2. Phase 2 device coverage stays accepted; the new Phase 3 materials, irregular meshes and Saturn shaders need their own rendering record.

The lab now adds **Run Phase 3 device checks** at [localhost lab](http://localhost:3000/lab/poc?perf=1). Its functional download/restore test is pending in the current checkpoint. Run it on hardware after that test has been reviewed.

Select HIGH in settings, press the Phase 3 button and leave the tab visible without interacting. It measures all 21 close-up body views, then Saturn's north, south and edge ring views, then 600 GPU precision samples and depth probes. Allow 5–10 minutes; progress says `1/24` through `24/24`, followed by precision measurement. Completion says **Report downloaded** and saves `phase-three-<backend>-<timestamp>.json`. Preserve the file under `test-results/` for review. The report includes actual backend, adapter description, software detection, selected tier, viewport/DPR, sample count, draw calls, mesh count and compressed asset mip bytes per view.

For a compatibility-backend comparison, repeat at [forced WebGL2](http://localhost:3000/lab/poc?perf=1&renderer=webgl). A phone needs the reachable LAN URL already used for the accepted device coverage; the PC's localhost address is not reachable from a phone. Choose LOW or MEDIUM for mobile. Do not count viewport emulation as physical mobile evidence.

Review every view's p95 against the existing plan: desktop WebGPU at least 60 FPS, desktop WebGL2 at least 50 FPS, mobile at least 30 FPS. Precision must remain below 0.5 px and all depth probes must pass. Also review draw calls, detailed mesh count and texture mip bytes against section 22 budgets, and record visible shader errors/artifacts. A blank adapter string or absent software-name match alone does not identify a hardware GPU. Timing uses the final up to 240 RAF intervals after three seconds of warmup and ten seconds of observation, not GPU execution time or a sustained thermal measurement. Mip bytes do not measure total VRAM.

Hidden-tab runs, unsettled textures, fewer than 30 samples or a missing focused mesh are rejected. The check restores saved focus, scale, layers, clock mode/rate and quality. The original five-view Phase 1 button and Phase 2 point button remain available.
