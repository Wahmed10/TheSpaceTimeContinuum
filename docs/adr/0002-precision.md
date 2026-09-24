# 0002 — Camera-relative kilometers

Context: Absolute AU-scale float32 coordinates visibly lose precision near a planet.

Decision: Keep physics and camera position in Float64Arrays. Subtract on the CPU. The Three camera stays at zero. Local orbit lines retain parent-relative coordinates. Use logarithmic depth, a dynamic near plane, and a 1e12 km far plane. Explore Scale only changes display data.

Consequences: The numeric CPU test and a 600-sample GPU readback probe both pass in forced WebGL2/SwiftShader. Maximum rendered marker error is 0.1344 px against a 0.5 px bound. Opaque depth probes pass for a 10 km cloud shell at 400 km and 1,000,000 km altitude and a Moon behind Earth. See `docs/perf/precision-webgl.json`. No artifacts requiring reversed depth or scaled-space proxies were found in those tests. Real WebGPU and physical-device checks remain required; software rasterization is not hardware performance evidence.
