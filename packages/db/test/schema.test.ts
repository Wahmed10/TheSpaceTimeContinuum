import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from '../src/schema';

describe('data-platform schema invariants', () => {
  it('cascades aliases and retains unique snapshot identity separately from source/fetch/ingestion time', () => {
    const aliases = getTableConfig(schema.objectAliases);
    expect(aliases.foreignKeys[0]!.onDelete).toBe('cascade');
    const snapshots = getTableConfig(schema.layerSnapshots);
    expect(
      snapshots.indexes.some(
        (entry) =>
          entry.config.unique &&
          entry.config.name === 'layer_snapshots_content_idx',
      ),
    ).toBe(true);
    expect(snapshots.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['source_timestamp', 'fetched_at', 'ingested_at']),
    );
    expect(
      getTableConfig(schema.providerState).columns.map((column) => column.name),
    ).toEqual(expect.arrayContaining(['paused_at', 'lease_until']));
    expect(getTableConfig(schema.providerActions).foreignKeys).toHaveLength(1);
  });
  it('installs extensions before trigram indexes and has a journaled migration', () => {
    const directory = fileURLToPath(new URL('../migrations/', import.meta.url));
    const files = readdirSync(directory)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const sql = files
      .map((file) => readFileSync(directory + file, 'utf8'))
      .join('\n');
    expect(
      sql.indexOf('CREATE EXTENSION IF NOT EXISTS pg_trgm'),
    ).toBeGreaterThanOrEqual(0);
    expect(
      sql.indexOf('CREATE EXTENSION IF NOT EXISTS unaccent'),
    ).toBeGreaterThanOrEqual(0);
    expect(sql.indexOf('CREATE EXTENSION IF NOT EXISTS pg_trgm')).toBeLessThan(
      sql.indexOf('gin_trgm_ops'),
    );
    const journal = JSON.parse(
      readFileSync(directory + 'meta/_journal.json', 'utf8'),
    );
    expect(journal.entries).toHaveLength(files.length);
  });
});
