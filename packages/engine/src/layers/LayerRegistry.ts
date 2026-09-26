export type SemanticBand = 'local' | 'planetary' | 'solar';
export interface LayerDefinition {
  id: string;
  label: string;
  category: 'bodies' | 'orbits' | 'small-bodies' | 'satellites' | 'spacecraft';
  defaultOn: boolean;
  available?: boolean;
  bands: readonly SemanticBand[];
  load(): void | Promise<void>;
  setVisible(visible: boolean): void;
  dispose?(): void;
}
interface Entry {
  definition: LayerDefinition;
  requested: boolean;
  loaded: boolean;
  visible: boolean;
  pending?: Promise<void> | undefined;
}

/** Visibility never unloads resources. Concurrent enables share one load;
 * a late load completion respects the most recent toggle and semantic band.
 */
export class LayerRegistry {
  private entries = new Map<string, Entry>();
  private band: SemanticBand = 'solar';
  private disposed = false;

  register(definition: LayerDefinition, loaded = false) {
    if (this.disposed) throw new Error('Layer registry disposed');
    if (this.entries.has(definition.id))
      throw new Error(`Duplicate layer ${definition.id}`);
    this.entries.set(definition.id, {
      definition,
      requested: definition.defaultOn,
      loaded,
      visible: false,
    });
    this.refresh(this.entries.get(definition.id)!, loaded);
  }
  async setVisible(id: string, on: boolean): Promise<void> {
    if (this.disposed) throw new Error('Layer registry disposed');
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown layer ${id}`);
    entry.requested = on;
    this.refresh(entry);
    if (!on || entry.loaded || entry.definition.available === false) return;
    if (!entry.pending) {
      entry.pending = Promise.resolve()
        .then(() => {
          if (!this.disposed) return entry.definition.load();
        })
        .then(() => {
          if (this.disposed) return;
          entry.loaded = true;
          // A loader may create an object visible by default, even if the
          // requested state changed to hidden before completion.
          this.refresh(entry, true);
        })
        .finally(() => {
          entry.pending = undefined;
        });
    }
    await entry.pending;
  }
  setBand(band: SemanticBand) {
    if (band === this.band || this.disposed) return;
    this.band = band;
    for (const entry of this.entries.values()) this.refresh(entry);
  }
  private refresh(entry: Entry, force = false) {
    const visible =
      entry.requested &&
      entry.definition.available !== false &&
      entry.loaded &&
      entry.definition.bands.includes(this.band);
    if (force || visible !== entry.visible) {
      entry.visible = visible;
      entry.definition.setVisible(visible);
    }
  }
  has(id: string): boolean {
    return this.entries.get(id)?.visible ?? false;
  }
  /** Attach resident resources to a previously unavailable MVP definition. */
  activate(id: string) {
    if (this.disposed) throw new Error('Layer registry disposed');
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown layer ${id}`);
    entry.definition.available = true;
    entry.loaded = true;
    this.refresh(entry, true);
  }
  deactivate(id: string) {
    const entry = this.entries.get(id);
    if (!entry || this.disposed) return;
    entry.definition.available = false;
    entry.loaded = false;
    this.refresh(entry, true);
  }
  enabledIds(): string[] {
    return Array.from(this.entries.values())
      .filter((entry) => entry.requested)
      .map((entry) => entry.definition.id);
  }
  async restore(ids: readonly string[]) {
    const requested = new Set(ids);
    // Unknown URL IDs are ignored for forward/backward compatible links.
    await Promise.all(
      Array.from(this.entries, ([id]) =>
        this.setVisible(id, requested.has(id)),
      ),
    );
  }
  snapshot() {
    return Array.from(this.entries.values(), (entry) => ({
      id: entry.definition.id,
      category: entry.definition.category,
      requested: entry.requested,
      available: entry.definition.available !== false,
      loaded: entry.loaded,
      visible: entry.visible,
    }));
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.entries.values()) {
      if (entry.visible) entry.definition.setVisible(false);
      // Async loaders own cancellation and must honor disposal; release once.
      if (entry.pending)
        void entry.pending
          .finally(() => entry.definition.dispose?.())
          .catch(() => {});
      else entry.definition.dispose?.();
    }
    this.entries.clear();
  }
}
