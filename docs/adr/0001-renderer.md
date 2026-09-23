# 0001 — A framework-free Three.js engine

Context: React must not own the frame loop, and the same material code must support WebGPU and WebGL2.

Decision: Pin Three.js 0.186.0, import `three/webgpu` and TSL, and expose an imperative engine facade. React receives selection and throttled state. The engine is dynamically imported on the client. `?renderer=webgl` forces compatibility mode.

Consequences: No React Three Fiber. Initialization/disposal and precision are our responsibility. Every React mount owns a distinct canvas to prevent asynchronous StrictMode cleanup from destroying another mount's context. The scientific and physical-device gates have NOT passed; see `docs/perf/gate-report.md`.
