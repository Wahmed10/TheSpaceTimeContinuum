import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import {
  buildSearchQuery,
  normalizeAlias,
  validateSearch,
} from '../src/queries';
import { parentFirst } from '../src/seed';
import { BODIES } from '@space/domain';
import { databaseUrl, DatabaseConfigurationError } from '../src/config';

describe('bounded parameterized search', () => {
  it('keeps hostile text out of SQL and treats wildcard input literally', () => {
    const input = "x%'_\\; drop table objects; --";
    const query = new PgDialect().sqlToQuery(
      buildSearchQuery({ q: input, kinds: ['satellite'], limit: 3 }),
    );
    expect(query.sql).not.toContain('drop table');
    expect(query.params).toContain(input);
    expect(query.params).toContain("x\\%'\\_\\\\; drop table objects; --%");
    expect(query.params).toContain('satellite');
    expect(query.params.at(-1)).toBe(3);
    expect(query.sql).toContain('o.id asc');
  });
  it('normalizes diacritics/case and prevents unbounded queries', () => {
    expect(normalizeAlias('  ÉUROPA   Moon ')).toBe('europa moon');
    for (const q of ['', ' ', 'x'.repeat(121)])
      expect(() => validateSearch({ q })).toThrow();
    for (const limit of [0, 51, 1.5, NaN])
      expect(() => validateSearch({ q: 'iss', limit })).toThrow();
    expect(() =>
      validateSearch({ q: 'iss', kinds: ['invalid' as 'satellite'] }),
    ).toThrow();
  });
});
describe('seed dependency ordering', () => {
  it('orders all reversed catalog parents before children', () => {
    const ordered = parentFirst([...BODIES].reverse());
    expect(ordered).toHaveLength(21);
    const seen = new Set<string>();
    for (const entity of ordered) {
      if (entity.parentId) expect(seen.has(entity.parentId)).toBe(true);
      seen.add(entity.id);
    }
  });
  it('rejects duplicate, missing and cyclic parents before writing', () => {
    const body = BODIES[0]!;
    expect(() => parentFirst([body, body])).toThrow('Duplicate');
    expect(() => parentFirst([{ ...body, parentId: 'missing' }])).toThrow(
      'Missing',
    );
    expect(() => parentFirst([{ ...body, parentId: body.id }])).toThrow(
      'cyclic',
    );
  });
});
describe('secret-safe configuration', () => {
  it('rejects missing/invalid/non-Neon URLs without reproducing their value', () => {
    for (const value of [
      '',
      'secret',
      'https://user:password@foo.neon.tech/db',
      'postgres://user:password@localhost/db',
    ]) {
      try {
        databaseUrl({ DATABASE_URL: value });
        throw new Error('expected rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseConfigurationError);
        expect((error as Error).message).not.toContain('password');
      }
    }
    expect(
      databaseUrl({
        DATABASE_URL:
          'postgresql://user:pass@ep-dev.neon.tech/neondb?sslmode=require',
      }),
    ).toContain('postgresql:');
  });
});
