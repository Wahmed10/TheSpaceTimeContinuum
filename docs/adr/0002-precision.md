# 0002 — Camera-relative kilometers

Context: Absolute AU-scale float32 coordinates visibly lose precision near a planet.

Decision: Keep physics and camera position in Float64Arrays. Subtract on the CPU. The Three camera stays at zero. Local orbit lines retain parent-relative coordinates. Use logarithmic depth, a dynamic near plane, and a 1e12 km far plane. Explore Scale only changes display data.

Consequences: CPU numeric precision is covered by a 600-sample LEO subtraction test. This is NOT a GPU readback jitter measurement. Screenshot inspection demonstrates textured close-ups in SwiftShader WebGL2; real WebGPU/phone jitter and cloud-shell depth checks remain pending. No claim of a passed precision gate is made.
