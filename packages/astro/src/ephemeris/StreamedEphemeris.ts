import type {
  BodySpec,
  Certainty,
  PositionProvider,
  StateFailure,
} from '@space/domain';
import { createBodyProvider } from './AstronomyEngineProvider';
import { JupiterMoonsProvider } from './JupiterMoonsProvider';
import type { GalileanMoon } from './JupiterMoonsProvider';
import type {
  DecodedRuntimeChunk,
  RuntimeBody,
  RuntimeChunkManifest,
} from './RuntimeChunk';
export type ChunkLookup = (tdbSec: number) => DecodedRuntimeChunk | undefined;
/** No global mutation: separate engines/caches cannot replace each other's
 * registered correction sources, paused dates, or pending orbital coverage. */
export class StreamedEphemeris {
  constructor(
    readonly manifest: RuntimeChunkManifest,
    private readonly lookup: ChunkLookup,
  ) {}
  analytic(body: string): PositionProvider {
    return createBodyProvider(body, (t) =>
      this.lookup(t)?.corrections.get(body),
    );
  }
  catalog(body: BodySpec): PositionProvider {
    if (body.astronomyBody) return this.analytic(body.astronomyBody);
    const slug = body.id.split(':')[1]!;
    if (['io', 'europa', 'ganymede', 'callisto'].includes(slug))
      return new JupiterMoonsProvider(slug as GalileanMoon, undefined, (t) =>
        this.lookup(t)?.corrections.get(slug),
      );
    const metadata = this.manifest.bodies.find(
      (b) => b.id === body.id && b.kind === 'orbit',
    );
    if (!metadata) throw Error(`No validated streamed provider for ${body.id}`);
    return new StreamedOrbit(metadata, this.lookup);
  }
}
class StreamedOrbit implements PositionProvider {
  readonly method = 'kepler-2body' as const;
  readonly id: string;
  readonly frame: RuntimeBody['frame'];
  readonly validity: { fromTdb: number; toTdb: number };
  private readonly loading: StateFailure = { ok: false, reason: 'loading' };
  private readonly invalid: StateFailure = {
    ok: false,
    reason: 'out-of-validity',
  };
  constructor(
    metadata: RuntimeBody,
    private readonly lookup: ChunkLookup,
  ) {
    this.id = metadata.id;
    this.frame = metadata.frame;
    this.validity = {
      fromTdb: metadata.startTdbSec,
      toTdb: metadata.startTdbSec + (metadata.count - 1) * metadata.stepSec,
    };
  }
  certaintyAt(_tdbSec: number): Certainty {
    return 'approximate';
  }
  stateAt(tdbSec: number, out: Float64Array, offset = 0) {
    if (
      !Number.isFinite(tdbSec) ||
      tdbSec < this.validity.fromTdb ||
      tdbSec > this.validity.toTdb
    )
      return this.invalid;
    const provider = this.lookup(tdbSec)?.orbits.get(this.id);
    return provider?.stateAt(tdbSec, out, offset) ?? this.loading;
  }
}
