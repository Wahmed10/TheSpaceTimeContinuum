# 0006 — Permissive runtime, explicit asset credits

Context: Runtime dependencies and texture redistributions have separate license requirements.

Decision: Check production dependency licenses against the allowlist; distribute license/NOTICE text. Disable Next's optional sharp image optimizer and ignore that optional dependency because its Windows binary declares LGPL. The direct sharp dependency remains build-time only for the offline texture pipeline. No runtime image optimization is used.

Consequences: Texture tiers are locally hosted KTX2 with explicit source credits. Solar System Scope maps use CC BY 4.0; lunar color and derived terrain maps use NASA SVS CGI Moon Kit sources. BSC5 is attributed to Hoffleit and Warren via HEASARC. Build tools and masters stay outside git. Every shipped texture must appear in `assets/ASSET_LICENSES.md` and match the manifest; the checker enforces an 80 MB texture budget.
