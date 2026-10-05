import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  smallint,
  integer,
  bigint,
  bigserial,
  doublePrecision,
  real,
  boolean,
  date,
  index,
  uniqueIndex,
  primaryKey,
  check,
  customType,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { EntityKind, PhysicalProps, Provenance } from '@space/domain';

const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });
const bytes = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const dataSources = pgTable('data_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  homepage: text('homepage'),
  license: text('license').notNull(),
  attribution: text('attribution').notNull(),
  termsUrl: text('terms_url'),
  notes: text('notes'),
});
export const objects = pgTable(
  'objects',
  {
    id: text('id').primaryKey(),
    kind: text('kind').$type<EntityKind>().notNull(),
    name: text('name').notNull(),
    parentId: text('parent_id').references((): AnyPgColumn => objects.id),
    status: text('status'),
    physical: jsonb('physical').$type<PhysicalProps>().notNull().default({}),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    // Owned provenance is required for API consumers; provider raw payloads are not entities.
    provenance: jsonb('provenance').$type<Provenance>(),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    importance: smallint('importance').notNull().default(0),
    createdAt: instant('created_at').notNull().defaultNow(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('objects_kind_idx').on(t.kind),
    index('objects_tags_gin').using('gin', t.tags),
  ],
);
export const objectAliases = pgTable(
  'object_aliases',
  {
    objectId: text('object_id')
      .notNull()
      .references(() => objects.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    aliasNorm: text('alias_norm').notNull(),
    aliasType: text('alias_type').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.objectId, t.aliasNorm] }),
    index('object_aliases_trgm').using('gin', t.aliasNorm.op('gin_trgm_ops')),
    index('object_aliases_prefix').on(t.aliasNorm.op('text_pattern_ops')),
  ],
);
export const providerRecords = pgTable(
  'provider_records',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    objectId: text('object_id').references(() => objects.id, {
      onDelete: 'cascade',
    }),
    sourceId: text('source_id').references(() => dataSources.id),
    providerObjectId: text('provider_object_id'),
    sourceTimestamp: instant('source_timestamp'),
    ingestedAt: instant('ingested_at').notNull().defaultNow(),
    payloadHash: text('payload_hash'),
    raw: jsonb('raw'),
  },
  (t) => [
    index('provider_records_ingested_idx').on(t.ingestedAt),
    index('provider_records_object_idx').on(t.objectId),
  ],
);
export const orbitElements = pgTable(
  'orbit_elements',
  {
    objectId: text('object_id')
      .notNull()
      .references(() => objects.id, { onDelete: 'cascade' }),
    sourceId: text('source_id')
      .notNull()
      .references(() => dataSources.id),
    epochTdbJd: doublePrecision('epoch_tdb_jd').notNull(),
    frame: text('frame').notNull(),
    e: doublePrecision('e'),
    aKm: doublePrecision('a_km'),
    qKm: doublePrecision('q_km'),
    iDeg: doublePrecision('i_deg'),
    omDeg: doublePrecision('om_deg'),
    wDeg: doublePrecision('w_deg'),
    maDeg: doublePrecision('ma_deg'),
    nDegPerDay: doublePrecision('n_deg_per_day'),
    uncertainty: jsonb('uncertainty'),
    conditionCode: text('condition_code'),
    validFrom: instant('valid_from'),
    validTo: instant('valid_to'),
    ingestedAt: instant('ingested_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.objectId, t.sourceId, t.epochTdbJd] })],
);
export const trajectories = pgTable(
  'trajectories',
  {
    id: text('id').primaryKey(),
    objectId: text('object_id')
      .notNull()
      .references(() => objects.id, { onDelete: 'cascade' }),
    sourceId: text('source_id').references(() => dataSources.id),
    centerFrame: text('center_frame').notNull(),
    t0Tdb: doublePrecision('t0_tdb'),
    t1Tdb: doublePrecision('t1_tdb'),
    certainty: text('certainty').notNull(),
    sampleCount: integer('sample_count'),
    format: text('format').notNull().default('f64:t,x,y,z,vx,vy,vz'),
    samples: bytes('samples').notNull(),
    contentHash: text('content_hash').notNull(),
    generatedAt: instant('generated_at').notNull().defaultNow(),
  },
  (t) => [index('trajectories_object_idx').on(t.objectId)],
);
export const layerSnapshots = pgTable(
  'layer_snapshots',
  {
    layer: text('layer').notNull(),
    groupKey: text('group_key').notNull(),
    sourceId: text('source_id')
      .notNull()
      .references(() => dataSources.id),
    sourceTimestamp: instant('source_timestamp'),
    fetchedAt: instant('fetched_at').notNull(),
    ingestedAt: instant('ingested_at').notNull().defaultNow(),
    recordCount: integer('record_count').notNull(),
    contentHash: text('content_hash').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.layer, t.groupKey, t.ingestedAt] }),
    uniqueIndex('layer_snapshots_content_idx').on(
      t.layer,
      t.groupKey,
      t.sourceId,
      t.contentHash,
    ),
    index('layer_snapshots_latest_idx').on(
      t.layer,
      t.groupKey,
      t.ingestedAt.desc(),
    ),
    check('layer_snapshots_count_nonnegative', sql`${t.recordCount} >= 0`),
  ],
);
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    startTime: instant('start_time').notNull(),
    endTime: instant('end_time'),
    peakTime: instant('peak_time'),
    status: text('status').notNull().default('scheduled'),
    confidence: text('confidence'),
    sourceId: text('source_id').references(() => dataSources.id),
    sourceUrl: text('source_url'),
    mapState: jsonb('map_state').notNull(),
    importance: smallint('importance').notNull().default(0),
    createdAt: instant('created_at').notNull().defaultNow(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('events_start_idx').on(t.startTime),
    index('events_type_idx').on(t.type),
  ],
);
export const eventObjects = pgTable(
  'event_objects',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    objectId: text('object_id')
      .notNull()
      .references(() => objects.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.objectId] })],
);
export const newsItems = pgTable(
  'news_items',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => dataSources.id),
    url: text('url').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary'),
    publishedAt: instant('published_at').notNull(),
    imageUrl: text('image_url'),
    imageCredit: text('image_credit'),
    imageLicense: text('image_license'),
    fetchedAt: instant('fetched_at').notNull().defaultNow(),
  },
  (t) => [index('news_published_idx').on(t.publishedAt.desc())],
);
export const newsObjectLinks = pgTable(
  'news_object_links',
  {
    newsId: text('news_id')
      .notNull()
      .references(() => newsItems.id, { onDelete: 'cascade' }),
    objectId: text('object_id')
      .notNull()
      .references(() => objects.id, { onDelete: 'cascade' }),
    method: text('method').notNull(),
    confidence: real('confidence').notNull(),
  },
  (t) => [primaryKey({ columns: [t.newsId, t.objectId] })],
);
export const newsEventLinks = pgTable(
  'news_event_links',
  {
    newsId: text('news_id')
      .notNull()
      .references(() => newsItems.id, { onDelete: 'cascade' }),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    method: text('method').notNull(),
    confidence: real('confidence').notNull(),
  },
  (t) => [primaryKey({ columns: [t.newsId, t.eventId] })],
);
export const linkOverrides = pgTable(
  'link_overrides',
  {
    newsId: text('news_id')
      .notNull()
      .references(() => newsItems.id, { onDelete: 'cascade' }),
    targetId: text('target_id').notNull(),
    action: text('action').notNull(),
    note: text('note'),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.newsId, t.targetId] }),
    check('link_overrides_action', sql`${t.action} in ('add', 'remove')`),
  ],
);
export const discoveries = pgTable('discoveries', {
  objectId: text('object_id')
    .primaryKey()
    .references(() => objects.id, { onDelete: 'cascade' }),
  designatedAt: instant('designated_at'),
  discoveryDate: date('discovery_date'),
  discoverySite: text('discovery_site'),
  mpecId: text('mpec_id'),
  sourceId: text('source_id').references(() => dataSources.id),
  createdAt: instant('created_at').notNull().defaultNow(),
});
export const providerState = pgTable(
  'provider_state',
  {
    providerId: text('provider_id').primaryKey(),
    host: text('host').notNull(),
    lastRunAt: instant('last_run_at'),
    lastSuccessAt: instant('last_success_at'),
    nextRunAt: instant('next_run_at'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    lastError: text('last_error'),
    lastHttpStatus: integer('last_http_status'),
    records: integer('records').notNull().default(0),
    pausedAt: instant('paused_at'),
    pauseReason: text('pause_reason'),
    resumedAt: instant('resumed_at'),
    resumedBy: text('resumed_by'),
    resumeNote: text('resume_note'),
    leaseOwner: text('lease_owner'),
    leaseUntil: instant('lease_until'),
  },
  (t) => [
    index('provider_state_due_idx').on(t.nextRunAt),
    index('provider_state_host_idx').on(t.host),
    check(
      'provider_state_failures_nonnegative',
      sql`${t.consecutiveFailures} >= 0`,
    ),
  ],
);
export const ingestionRuns = pgTable(
  'ingestion_runs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    providerId: text('provider_id')
      .notNull()
      .references(() => providerState.providerId),
    startedAt: instant('started_at').notNull(),
    finishedAt: instant('finished_at'),
    ok: boolean('ok'),
    recordsIn: integer('records_in'),
    recordsUpserted: integer('records_upserted'),
    httpStatus: integer('http_status'),
    error: text('error'),
    payloadBytes: bigint('payload_bytes', { mode: 'number' }),
  },
  (t) => [
    index('ingestion_runs_provider_idx').on(t.providerId, t.startedAt.desc()),
  ],
);
// Append-only operator acknowledgements; latest resume fields alone do not preserve history.
export const providerActions = pgTable(
  'provider_actions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    providerId: text('provider_id')
      .notNull()
      .references(() => providerState.providerId),
    action: text('action').notNull(),
    actor: text('actor').notNull(),
    note: text('note').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [
    check('provider_actions_action', sql`${t.action} in ('pause', 'resume')`),
  ],
);
