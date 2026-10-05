-- Required before alias trigram indexes. Extension creation is transactional.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"homepage" text,
	"license" text NOT NULL,
	"attribution" text NOT NULL,
	"terms_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "discoveries" (
	"object_id" text PRIMARY KEY NOT NULL,
	"designated_at" timestamp with time zone,
	"discovery_date" date,
	"discovery_site" text,
	"mpec_id" text,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_objects" (
	"event_id" text NOT NULL,
	"object_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "event_objects_event_id_object_id_pk" PRIMARY KEY("event_id","object_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"peak_time" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"confidence" text,
	"source_id" text,
	"source_url" text,
	"map_state" jsonb NOT NULL,
	"importance" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"records_in" integer,
	"records_upserted" integer,
	"http_status" integer,
	"error" text,
	"payload_bytes" bigint
);
--> statement-breakpoint
CREATE TABLE "layer_snapshots" (
	"layer" text NOT NULL,
	"group_key" text NOT NULL,
	"source_id" text NOT NULL,
	"source_timestamp" timestamp with time zone,
	"fetched_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"record_count" integer NOT NULL,
	"content_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "layer_snapshots_layer_group_key_ingested_at_pk" PRIMARY KEY("layer","group_key","ingested_at"),
	CONSTRAINT "layer_snapshots_count_nonnegative" CHECK ("layer_snapshots"."record_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "link_overrides" (
	"news_id" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_overrides_news_id_target_id_pk" PRIMARY KEY("news_id","target_id"),
	CONSTRAINT "link_overrides_action" CHECK ("link_overrides"."action" in ('add', 'remove'))
);
--> statement-breakpoint
CREATE TABLE "news_event_links" (
	"news_id" text NOT NULL,
	"event_id" text NOT NULL,
	"method" text NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "news_event_links_news_id_event_id_pk" PRIMARY KEY("news_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone NOT NULL,
	"image_url" text,
	"image_credit" text,
	"image_license" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "news_object_links" (
	"news_id" text NOT NULL,
	"object_id" text NOT NULL,
	"method" text NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "news_object_links_news_id_object_id_pk" PRIMARY KEY("news_id","object_id")
);
--> statement-breakpoint
CREATE TABLE "object_aliases" (
	"object_id" text NOT NULL,
	"alias" text NOT NULL,
	"alias_norm" text NOT NULL,
	"alias_type" text NOT NULL,
	CONSTRAINT "object_aliases_object_id_alias_norm_pk" PRIMARY KEY("object_id","alias_norm")
);
--> statement-breakpoint
CREATE TABLE "objects" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"status" text,
	"physical" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provenance" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"importance" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orbit_elements" (
	"object_id" text NOT NULL,
	"source_id" text NOT NULL,
	"epoch_tdb_jd" double precision NOT NULL,
	"frame" text NOT NULL,
	"e" double precision,
	"a_km" double precision,
	"q_km" double precision,
	"i_deg" double precision,
	"om_deg" double precision,
	"w_deg" double precision,
	"ma_deg" double precision,
	"n_deg_per_day" double precision,
	"uncertainty" jsonb,
	"condition_code" text,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orbit_elements_object_id_source_id_epoch_tdb_jd_pk" PRIMARY KEY("object_id","source_id","epoch_tdb_jd")
);
--> statement-breakpoint
CREATE TABLE "provider_actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_actions_action" CHECK ("provider_actions"."action" in ('pause', 'resume'))
);
--> statement-breakpoint
CREATE TABLE "provider_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"object_id" text,
	"source_id" text,
	"provider_object_id" text,
	"source_timestamp" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_hash" text,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "provider_state" (
	"provider_id" text PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_http_status" integer,
	"records" integer DEFAULT 0 NOT NULL,
	"paused_at" timestamp with time zone,
	"pause_reason" text,
	"resumed_at" timestamp with time zone,
	"resumed_by" text,
	"resume_note" text,
	"lease_owner" text,
	"lease_until" timestamp with time zone,
	CONSTRAINT "provider_state_failures_nonnegative" CHECK ("provider_state"."consecutive_failures" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trajectories" (
	"id" text PRIMARY KEY NOT NULL,
	"object_id" text NOT NULL,
	"source_id" text,
	"center_frame" text NOT NULL,
	"t0_tdb" double precision,
	"t1_tdb" double precision,
	"certainty" text NOT NULL,
	"sample_count" integer,
	"format" text DEFAULT 'f64:t,x,y,z,vx,vy,vz' NOT NULL,
	"samples" "bytea" NOT NULL,
	"content_hash" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discoveries" ADD CONSTRAINT "discoveries_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discoveries" ADD CONSTRAINT "discoveries_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_objects" ADD CONSTRAINT "event_objects_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_objects" ADD CONSTRAINT "event_objects_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_provider_id_provider_state_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_state"("provider_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layer_snapshots" ADD CONSTRAINT "layer_snapshots_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_overrides" ADD CONSTRAINT "link_overrides_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_event_links" ADD CONSTRAINT "news_event_links_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_event_links" ADD CONSTRAINT "news_event_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_object_links" ADD CONSTRAINT "news_object_links_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_object_links" ADD CONSTRAINT "news_object_links_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_aliases" ADD CONSTRAINT "object_aliases_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_parent_id_objects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orbit_elements" ADD CONSTRAINT "orbit_elements_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orbit_elements" ADD CONSTRAINT "orbit_elements_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_actions" ADD CONSTRAINT "provider_actions_provider_id_provider_state_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_state"("provider_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_records" ADD CONSTRAINT "provider_records_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_records" ADD CONSTRAINT "provider_records_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trajectories" ADD CONSTRAINT "trajectories_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trajectories" ADD CONSTRAINT "trajectories_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_start_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ingestion_runs_provider_idx" ON "ingestion_runs" USING btree ("provider_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "layer_snapshots_content_idx" ON "layer_snapshots" USING btree ("layer","group_key","source_id","content_hash");--> statement-breakpoint
CREATE INDEX "layer_snapshots_latest_idx" ON "layer_snapshots" USING btree ("layer","group_key","ingested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_published_idx" ON "news_items" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "object_aliases_trgm" ON "object_aliases" USING gin ("alias_norm" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "object_aliases_prefix" ON "object_aliases" USING btree ("alias_norm" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "objects_kind_idx" ON "objects" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "objects_tags_gin" ON "objects" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "provider_records_ingested_idx" ON "provider_records" USING btree ("ingested_at");--> statement-breakpoint
CREATE INDEX "provider_records_object_idx" ON "provider_records" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "provider_state_due_idx" ON "provider_state" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "provider_state_host_idx" ON "provider_state" USING btree ("host");--> statement-breakpoint
CREATE INDEX "trajectories_object_idx" ON "trajectories" USING btree ("object_id");
