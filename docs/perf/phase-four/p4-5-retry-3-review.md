# P4.5 retry-3 reviewed failure

43 of 44 cases passed, with zero skips, flakes or report errors. Source/root/candidate and fourteen preserved evidence hashes were independently verified. Build, lookup, bundle/assets/licenses and clean server logs pass.

Both response checks passed on the actual scene adapter ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11). Desktop maximum input/selection: 49.2/30.2 ms; phone viewport: 16.7/32.2 ms. The 300 ms ceiling and all samples remain required. Phone is viewport/touch emulation on the recorded desktop GPU, not physical phone throughput; earlier SwiftShader failures remain preserved. Long tasks after renderer resumption remain recorded for later shell gates.

The one failure is the accelerated playback history test. Its initial-timestamp poll already matched the original URL, and its fixed 650 ms wait did not ensure the explicit rate anchor had committed before the baseline was captured. The later observed replacement carries the command anchor, rather than demonstrating repeated playback/gesture writes. The preserved trace and raw error show the original baseline and the subsequent replacement. No runtime history change is justified by this race alone.

Next: instrument writes before the command, await its one explicit replacement, then assert unchanged URL/history/writes through playback and gestures. Keep sharing-time and paused-reload checks. P4.5 is not accepted. Raw logs and trace remain in .tools/phase-four/p4-5/retry-3/.
