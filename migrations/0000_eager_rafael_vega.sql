CREATE TYPE "public"."device_category" AS ENUM('mount', 'camera', 'focuser', 'filter_wheel', 'ota', 'accessory', 'controller');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('solar_eclipse', 'lunar_eclipse', 'meteor_shower_peak', 'planetary_conjunction', 'planetary_opposition', 'occultation', 'comet_perihelion', 'supermoon', 'other');--> statement-breakpoint
CREATE TYPE "public"."interface_type" AS ENUM('ASCOM', 'INDI', 'Alpaca', 'USB', 'Serial', 'Other');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'manual', 'datasheet');--> statement-breakpoint
CREATE TYPE "public"."object_class" AS ENUM('open_cluster', 'globular', 'nebula', 'planetary_nebula', 'galaxy', 'double_star', 'star', 'asterism', 'other');--> statement-breakpoint
CREATE TYPE "public"."satellite_category" AS ENUM('station', 'comm', 'nav', 'earth_obs', 'constellation', 'debris', 'rocket_body');--> statement-breakpoint
CREATE TYPE "public"."visibility_scope" AS ENUM('global', 'continent', 'country', 'bbox');--> statement-breakpoint
CREATE TYPE "public"."concept_category" AS ENUM('optics', 'mechanics', 'mount', 'assembly', 'collimation', 'testing', 'safety', 'printing', 'materials', 'fasteners');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('intro', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."file_format" AS ENUM('stl', 'step', '3mf', 'f3d');--> statement-breakpoint
CREATE TYPE "public"."focuser_type" AS ENUM('helical', 'rack_pinion', 'crayford', 'printed_helical');--> statement-breakpoint
CREATE TYPE "public"."part_role" AS ENUM('ota', 'cell', 'spider', 'secondary_holder', 'focuser_body', 'rack', 'pinion', 'tube_ring', 'truss', 'rocker', 'ground_board', 'alt_bearing', 'adapter', 'finder', 'misc');--> statement-breakpoint
CREATE TYPE "public"."procedure_type" AS ENUM('assembly', 'collimation', 'test', 'maintenance', 'safety');--> statement-breakpoint
CREATE TYPE "public"."telescope_type" AS ENUM('newtonian', 'dobsonian', 'refractor', 'sct', 'maksutov', 'other');--> statement-breakpoint
CREATE TYPE "public"."dew_risk" AS ENUM('low', 'med', 'high');--> statement-breakpoint
CREATE TYPE "public"."dew_sensor_loc" AS ENUM('ota', 'ambient', 'camera');--> statement-breakpoint
CREATE TYPE "public"."obstacle_type" AS ENUM('tree', 'building', 'dome', 'other');--> statement-breakpoint
CREATE TYPE "public"."frame_type" AS ENUM('bias', 'dark', 'flat', 'darkflat');--> statement-breakpoint
CREATE TYPE "public"."frame_kind" AS ENUM('dark', 'bias', 'flat', 'darkflat');--> statement-breakpoint
CREATE TYPE "public"."feature_body" AS ENUM('moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'mercury');--> statement-breakpoint
CREATE TYPE "public"."feature_type" AS ENUM('crater', 'mare', 'mountain', 'valley', 'storm', 'band', 'spot', 'other');--> statement-breakpoint
CREATE TYPE "public"."mp_body_type" AS ENUM('asteroid', 'comet', 'centaur', 'tno');--> statement-breakpoint
CREATE TYPE "public"."transient_type" AS ENUM('supernova', 'nova', 'grb', 'cve', 'other');--> statement-breakpoint
CREATE TYPE "public"."recipe_target_type" AS ENUM('dso', 'planetary', 'lunar', 'solar', 'widefield', 'other');--> statement-breakpoint
CREATE TYPE "public"."sso_type" AS ENUM('planet', 'dwarf_planet', 'moon', 'asteroid', 'comet', 'centaur', 'tno', 'trojan', 'neo', 'other');--> statement-breakpoint
CREATE TABLE "celestial_targets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"ra" real NOT NULL,
	"dec" real NOT NULL,
	"magnitude" real,
	"constellation" text,
	"description" text,
	CONSTRAINT "celestial_targets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "commands" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"natural_language" text NOT NULL,
	"structured_command" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" text,
	"is_favorite" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_sequence_frames" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"frame_type" text NOT NULL,
	"filter" text,
	"exposure_time" real NOT NULL,
	"gain" integer NOT NULL,
	"binning" integer DEFAULT 1 NOT NULL,
	"count" integer NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"temperature" real,
	"dither" boolean DEFAULT false NOT NULL,
	"dither_pixels" integer DEFAULT 3,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"target_id" varchar,
	"target_name" text,
	"ra" real,
	"dec" real,
	"status" text DEFAULT 'pending' NOT NULL,
	"created" timestamp DEFAULT now() NOT NULL,
	"started" timestamp,
	"completed" timestamp,
	"total_frames" integer NOT NULL,
	"completed_frames" integer DEFAULT 0 NOT NULL,
	"estimated_duration" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "astrodb_aka" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "astrodb_capability" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "astrodb_object" (
	"id" serial PRIMARY KEY NOT NULL,
	"primary_name" varchar(128) NOT NULL,
	"catalog_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"class" "object_class" NOT NULL,
	"constellation" varchar(32),
	"ra_j2000_deg" numeric(12, 8) NOT NULL,
	"dec_j2000_deg" numeric(12, 8) NOT NULL,
	"pm_ra_masyr" real,
	"pm_dec_masyr" real,
	"mag" real,
	"surf_brightness" real,
	"major_arcmin" real,
	"minor_arcmin" real,
	"pa_deg" real,
	"distance_ly" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "astrodb_object_primary_name_unique" UNIQUE("primary_name")
);
--> statement-breakpoint
CREATE TABLE "astrodb_compat" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"other_device_id" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "astrodb_device" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer_id" integer NOT NULL,
	"model" varchar(256) NOT NULL,
	"category" "device_category" NOT NULL,
	"interface" "interface_type" NOT NULL,
	"released_on" timestamp,
	"discontinued_on" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_manufacturer_model_unique" UNIQUE("manufacturer_id","model")
);
--> statement-breakpoint
CREATE TABLE "astrodb_ephem" (
	"id" serial PRIMARY KEY NOT NULL,
	"norad_id" integer NOT NULL,
	"ts" timestamp NOT NULL,
	"geodetic_lat" real NOT NULL,
	"geodetic_lon" real NOT NULL,
	"alt_km" real NOT NULL,
	"range_km" real,
	"range_rate_kms" real,
	"ra_deg" real,
	"dec_deg" real,
	"az_deg" real,
	"el_deg" real,
	"sunlit" boolean,
	"mag_est" real
);
--> statement-breakpoint
CREATE TABLE "astrodb_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"type" "event_type" NOT NULL,
	"start_utc" timestamp NOT NULL,
	"end_utc" timestamp NOT NULL,
	"summary_250" text NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "astrodb_event_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "astrodb_import_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"records_fetched" integer DEFAULT 0,
	"records_inserted" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "astrodb_manufacturer" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"website" text,
	"country" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "astrodb_manufacturer_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "astrodb_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"url" text NOT NULL,
	"kind" "media_kind" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "astrodb_satellite" (
	"id" serial PRIMARY KEY NOT NULL,
	"norad_id" integer NOT NULL,
	"name" text NOT NULL,
	"operator" text,
	"category" "satellite_category" NOT NULL,
	"visual_mag_est" real,
	"first_launch" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "astrodb_satellite_norad_id_unique" UNIQUE("norad_id")
);
--> statement-breakpoint
CREATE TABLE "astrodb_source_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" integer NOT NULL,
	"source_name" varchar(256) NOT NULL,
	"source_url" text NOT NULL,
	"license" varchar(128),
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"hash" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "astrodb_spec_kv" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"unit" text
);
--> statement-breakpoint
CREATE TABLE "astrodb_tle" (
	"id" serial PRIMARY KEY NOT NULL,
	"norad_id" integer NOT NULL,
	"line1" text NOT NULL,
	"line2" text NOT NULL,
	"epoch" timestamp NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tle_norad_epoch_unique" UNIQUE("norad_id","epoch")
);
--> statement-breakpoint
CREATE TABLE "astrodb_visibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"scope" "visibility_scope" NOT NULL,
	"continent_code" text,
	"country_iso2" varchar(2),
	"region_name" text,
	"bbox_min_lat" real,
	"bbox_max_lat" real,
	"bbox_min_lon" real,
	"bbox_max_lon" real
);
--> statement-breakpoint
CREATE TABLE "design_concept" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"summary" text NOT NULL,
	"body_md" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"category" "concept_category" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_dimension" (
	"id" serial PRIMARY KEY NOT NULL,
	"example_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"value" real NOT NULL,
	"unit_source" varchar(32) NOT NULL,
	"unit_si" varchar(32) NOT NULL,
	"tolerance_mm" real,
	"computed_from_equation_id" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "design_example" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"telescope_type" "telescope_type" NOT NULL,
	"aperture_mm" integer NOT NULL,
	"focal_ratio" real NOT NULL,
	"focal_length_mm" integer NOT NULL,
	"obstruction_pct" real,
	"illuminated_field_mm" real,
	"focuser_type" "focuser_type" NOT NULL,
	"print_volume_mm" jsonb NOT NULL,
	"total_mass_kg" real,
	"bill_of_materials" jsonb NOT NULL,
	"print_settings" jsonb NOT NULL,
	"notes_md" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "example_title_type_unique" UNIQUE("title","telescope_type"),
	CONSTRAINT "focal_length_check" CHECK ("design_example"."focal_length_mm" >= "design_example"."aperture_mm" * "design_example"."focal_ratio" * 0.95 AND "design_example"."focal_length_mm" <= "design_example"."aperture_mm" * "design_example"."focal_ratio" * 1.05),
	CONSTRAINT "obstruction_check" CHECK ("design_example"."obstruction_pct" IS NULL OR ("design_example"."obstruction_pct" >= 0 AND "design_example"."obstruction_pct" <= 50))
);
--> statement-breakpoint
CREATE TABLE "design_equation" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"latex" text NOT NULL,
	"description" text NOT NULL,
	"variables" jsonb NOT NULL,
	"assumptions" text,
	"domain" text,
	"references" jsonb DEFAULT '[]'::jsonb,
	"unit_tests" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "design_equation_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "design_figure" (
	"id" serial PRIMARY KEY NOT NULL,
	"caption" text NOT NULL,
	"url" text NOT NULL,
	"example_id" integer,
	"concept_id" integer,
	"license" varchar(128) NOT NULL,
	"hash" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_part_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"example_id" integer NOT NULL,
	"role" "part_role" NOT NULL,
	"format" "file_format" NOT NULL,
	"url" text NOT NULL,
	"hash" varchar(64) NOT NULL,
	"license" varchar(128) NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "design_procedure" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"body_md" text NOT NULL,
	"type" "procedure_type" NOT NULL,
	"estimated_time_min" integer,
	"tools" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb NOT NULL,
	"hazards_md" text,
	"example_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_rule_of_thumb" (
	"id" serial PRIMARY KEY NOT NULL,
	"statement_md" text NOT NULL,
	"context_md" text,
	"source_ref_id" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_source_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"url" text NOT NULL,
	"license" varchar(128) NOT NULL,
	"author" varchar(256),
	"publisher" varchar(256),
	"year" integer,
	"access_date" timestamp DEFAULT now() NOT NULL,
	"hash" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "design_xref" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_table" varchar(64) NOT NULL,
	"from_id" integer NOT NULL,
	"to_table" varchar(64) NOT NULL,
	"to_id" integer NOT NULL,
	"relation" text
);
--> statement-breakpoint
CREATE TABLE "ops_dew_control_hint" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid NOT NULL,
	"rule_md" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_dew_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"temp_c" real NOT NULL,
	"dewpoint_c" real NOT NULL,
	"margin_c" real NOT NULL,
	"risk" "dew_risk" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_dew_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_key" varchar(128) NOT NULL,
	"sensor_loc" "dew_sensor_loc" NOT NULL,
	"temp_c" real NOT NULL,
	"rh_pct" real NOT NULL,
	"setpoint_pwm" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_dew_profile_device_key_unique" UNIQUE("device_key")
);
--> statement-breakpoint
CREATE TABLE "ops_horizon" (
	"site_id" uuid NOT NULL,
	"az_deg" real NOT NULL,
	"alt_limit_deg" real NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_horizon_site_id_az_deg_pk" PRIMARY KEY("site_id","az_deg")
);
--> statement-breakpoint
CREATE TABLE "ops_lp_tile" (
	"z" smallint NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"mpsas" real NOT NULL,
	"dataset" varchar(64) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ops_lp_tile_z_x_y_dataset_pk" PRIMARY KEY("z","x","y","dataset")
);
--> statement-breakpoint
CREATE TABLE "ops_meteo" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"cloud_pct" real NOT NULL,
	"transparency_idx" real,
	"seeing_arcsec" real,
	"wind_mps" real NOT NULL,
	"gust_mps" real,
	"temp_c" real NOT NULL,
	"dewpoint_c" real NOT NULL,
	"rh_pct" real NOT NULL,
	"precip_mm" real,
	"pressure_hpa" real,
	"moon_illum" real NOT NULL,
	"moon_alt_deg" real NOT NULL,
	"source" varchar(128) NOT NULL,
	"model_run" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_meteo_quality" (
	"id" serial PRIMARY KEY NOT NULL,
	"meteo_id" integer NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "ops_obstacle" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"type" "obstacle_type" NOT NULL,
	"geom_json" jsonb NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_site" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"elev_m" real NOT NULL,
	"tz" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_site_lp" (
	"site_id" uuid PRIMARY KEY NOT NULL,
	"mpsas_est" real NOT NULL,
	"method" varchar(128) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_backfocus_offset" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid NOT NULL,
	"filter_name" varchar(64) NOT NULL,
	"offset_mm" real NOT NULL,
	"confidence_pct" real NOT NULL,
	"measurement_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_filter" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"manufacturer" varchar(128),
	"filter_type" varchar(64) NOT NULL,
	"central_wavelength_nm" real,
	"bandwidth_nm" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calib_filter_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "calib_filter_curve" (
	"id" serial PRIMARY KEY NOT NULL,
	"filter_id" integer NOT NULL,
	"wavelength_nm" real NOT NULL,
	"transmission" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_focus_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid NOT NULL,
	"filter" varchar(64),
	"filter_name" varchar(64),
	"model" jsonb NOT NULL,
	"r2" real NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"temp_c" real,
	"optimal_pos" integer,
	"critical_zone" integer,
	"fit_type" varchar(32),
	"coeffs_json" jsonb,
	"sample_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_focus_sample" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid NOT NULL,
	"session_id" uuid,
	"ts" timestamp with time zone NOT NULL,
	"filter" varchar(64),
	"filter_name" varchar(64),
	"temp_c" real NOT NULL,
	"position" integer NOT NULL,
	"focuser_pos" integer,
	"hfr" real NOT NULL,
	"exposure_s" real,
	"fwhm" real,
	"star_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_frame_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"master_id" uuid NOT NULL,
	"tag" varchar(128) NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_master_frame" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"train_id" uuid NOT NULL,
	"kind" "frame_kind" NOT NULL,
	"frame_type" "frame_type",
	"filter" varchar(64),
	"filter_name" varchar(64),
	"sensor_temp_c" real,
	"temp_c" real,
	"gain" varchar(32),
	"gain_int" integer,
	"exposure_s" real,
	"exposure_sec" real,
	"hash" varchar(256),
	"s3_url" text,
	"s3_key" text,
	"binning" varchar(16) DEFAULT '1x1' NOT NULL,
	"offset" integer,
	"frame_count" integer NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"stats_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calib_master_frame_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "calib_optical_train" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scope_model" varchar(256) NOT NULL,
	"camera_model" varchar(256) NOT NULL,
	"focuser_model" varchar(256),
	"filter_wheel_model" varchar(256),
	"reducer_flattener" varchar(256),
	"focal_length_mm" integer NOT NULL,
	"aperture_mm" integer NOT NULL,
	"pixel_size_um" real NOT NULL,
	"plate_scale_arcsec_px" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_pec_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"mount_model" varchar(256) NOT NULL,
	"axis" varchar(16) NOT NULL,
	"waveform_json" jsonb NOT NULL,
	"period_sec" real NOT NULL,
	"pk_to_pk_arcsec" real NOT NULL,
	"rms_arcsec" real NOT NULL,
	"captured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_pointing_model" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid NOT NULL,
	"terms_json" jsonb NOT NULL,
	"rms_arcsec" real NOT NULL,
	"point_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calib_sensor" (
	"id" serial PRIMARY KEY NOT NULL,
	"model" varchar(256) NOT NULL,
	"manufacturer" varchar(128),
	"pixel_size_um" real NOT NULL,
	"resolution_x" integer NOT NULL,
	"resolution_y" integer NOT NULL,
	"is_color" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calib_sensor_model_unique" UNIQUE("model")
);
--> statement-breakpoint
CREATE TABLE "calib_sensor_qe" (
	"id" serial PRIMARY KEY NOT NULL,
	"sensor_id" integer NOT NULL,
	"wavelength_nm" real NOT NULL,
	"qe" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets_ephem" (
	"id" serial PRIMARY KEY NOT NULL,
	"body_id" integer NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"ra" real NOT NULL,
	"dec" real NOT NULL,
	"vmag" real,
	"delta" real,
	"r_helio" real,
	"phase_angle" real,
	"elongation" real,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets_feature" (
	"id" serial PRIMARY KEY NOT NULL,
	"body" "feature_body" NOT NULL,
	"name" varchar(256) NOT NULL,
	"feature_type" "feature_type" NOT NULL,
	"lat" real,
	"lon" real,
	"diameter" real,
	"description" text,
	"observability_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets_feature_aka" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_id" integer NOT NULL,
	"alias" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets_hop" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_name" varchar(256) NOT NULL,
	"target_ra" real NOT NULL,
	"target_dec" real NOT NULL,
	"waypoint_idx" integer NOT NULL,
	"waypoint_name" varchar(256) NOT NULL,
	"waypoint_ra" real NOT NULL,
	"waypoint_dec" real NOT NULL,
	"waypoint_mag" real,
	"bearing_deg" real,
	"distance_deg" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "targets_mp_body" (
	"id" serial PRIMARY KEY NOT NULL,
	"designation" varchar(128) NOT NULL,
	"name" varchar(256),
	"body_type" "mp_body_type" NOT NULL,
	"h" real,
	"g" real,
	"orbit_class" varchar(64),
	"discovery" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "targets_mp_body_designation_unique" UNIQUE("designation")
);
--> statement-breakpoint
CREATE TABLE "targets_notice" (
	"id" serial PRIMARY KEY NOT NULL,
	"transient_id" integer,
	"source" varchar(64) NOT NULL,
	"notice_id" varchar(128) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"content_url" text,
	"content_text" text
);
--> statement-breakpoint
CREATE TABLE "targets_notice_xref" (
	"id" serial PRIMARY KEY NOT NULL,
	"notice_id" integer NOT NULL,
	"catalog_name" varchar(64) NOT NULL,
	"object_id" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets_orbit_elem" (
	"id" serial PRIMARY KEY NOT NULL,
	"body_id" integer NOT NULL,
	"epoch" real NOT NULL,
	"a" real NOT NULL,
	"e" real NOT NULL,
	"i" real NOT NULL,
	"omega" real NOT NULL,
	"w" real NOT NULL,
	"m" real NOT NULL,
	"n" real,
	"source" varchar(128) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets_transient" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" "transient_type" NOT NULL,
	"ra" real NOT NULL,
	"dec" real NOT NULL,
	"discovery_date" timestamp with time zone NOT NULL,
	"peak_mag" real,
	"current_mag" real,
	"filter_band" varchar(16),
	"host_galaxy" varchar(256),
	"redshift" real,
	"classification" varchar(128),
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "targets_transient_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "planqa_recipe" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid,
	"target_class" text,
	"sky_mpsas_bin" varchar(32),
	"filter" varchar(64),
	"sub_exposure_s" real,
	"subs" integer,
	"dither_pix" real,
	"bin" integer,
	"gain" varchar(32),
	"iso" varchar(32),
	"rationale_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(256),
	"target_type" "recipe_target_type",
	"filter_name" varchar(64),
	"exposure_sec" real,
	"frame_count" integer,
	"total_exp_min" real,
	"binning" varchar(16) DEFAULT '1x1',
	"gain_int" integer,
	"offset" integer,
	"temp_c" real,
	"dither_px" integer,
	"notes" text,
	"created_by" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "planqa_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"site_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"notes" text,
	"train_id" uuid,
	"target_name" varchar(256),
	"filter_name" varchar(64),
	"frame_count" integer DEFAULT 0 NOT NULL,
	"total_exp_sec" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planqa_user_site_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"site_id" uuid NOT NULL,
	"label" varchar(128) NOT NULL,
	"is_primary" integer DEFAULT 0 NOT NULL,
	"prefs_json" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planqa_snr_model" (
	"id" serial PRIMARY KEY NOT NULL,
	"train_id" uuid NOT NULL,
	"filter_name" varchar(64) NOT NULL,
	"target_type" "recipe_target_type" NOT NULL,
	"sky_mpsas" real NOT NULL,
	"coeffs_json" jsonb NOT NULL,
	"valid_range" jsonb NOT NULL,
	"r2" real NOT NULL,
	"sample_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planqa_submetric" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"frame_no" integer,
	"ts" timestamp with time zone NOT NULL,
	"hfr" real,
	"ecc" real,
	"sky_adu" real,
	"rms_ra" real,
	"rms_dec" real,
	"reject" boolean DEFAULT false,
	"metric_name" varchar(64),
	"value" real,
	"unit" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "planqa_user_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"settings_json" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planqa_user_setting_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "planqa_site_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"elev_m" real NOT NULL,
	"tz" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skyviz_orbital_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" integer NOT NULL,
	"epoch" real NOT NULL,
	"a" real NOT NULL,
	"e" real NOT NULL,
	"i" real NOT NULL,
	"omega" real NOT NULL,
	"w" real NOT NULL,
	"m" real NOT NULL,
	"n" real,
	"q" real,
	"tp" real,
	"source" varchar(128) NOT NULL,
	"source_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skyviz_sky_path_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" integer NOT NULL,
	"observer_lat" real NOT NULL,
	"observer_lon" real NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"step_hours" real NOT NULL,
	"path_points" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skyviz_solar_system_object" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"designation" varchar(128),
	"type" "sso_type" NOT NULL,
	"diameter" real,
	"mass" real,
	"albedo" real,
	"rotation_period" real,
	"discovery_date" timestamp with time zone,
	"discoverer" varchar(256),
	"discovery_site" varchar(256),
	"color" varchar(32),
	"texture_url" text,
	"model_url" text,
	"description" text,
	"source" varchar(128) NOT NULL,
	"source_id" varchar(256),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skyviz_star_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"hip" integer,
	"tycho" varchar(32),
	"ra" real NOT NULL,
	"dec" real NOT NULL,
	"magnitude" real NOT NULL,
	"bv" real,
	"proper_name" varchar(128),
	"bayer" varchar(32),
	"flamsteed" varchar(32),
	"constellation" varchar(3),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skyviz_star_catalog_hip_unique" UNIQUE("hip")
);
--> statement-breakpoint
CREATE TABLE "skyviz_trajectory_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" integer NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"step_days" real NOT NULL,
	"points" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skyviz_asset" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" integer,
	"asset_type" varchar(64) NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imaging_sequence_frames" ADD CONSTRAINT "imaging_sequence_frames_sequence_id_imaging_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."imaging_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_sequences" ADD CONSTRAINT "imaging_sequences_target_id_celestial_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."celestial_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_aka" ADD CONSTRAINT "astrodb_aka_object_id_astrodb_object_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."astrodb_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_capability" ADD CONSTRAINT "astrodb_capability_device_id_astrodb_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."astrodb_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_compat" ADD CONSTRAINT "astrodb_compat_device_id_astrodb_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."astrodb_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_compat" ADD CONSTRAINT "astrodb_compat_other_device_id_astrodb_device_id_fk" FOREIGN KEY ("other_device_id") REFERENCES "public"."astrodb_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_device" ADD CONSTRAINT "astrodb_device_manufacturer_id_astrodb_manufacturer_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."astrodb_manufacturer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_ephem" ADD CONSTRAINT "astrodb_ephem_norad_id_astrodb_satellite_norad_id_fk" FOREIGN KEY ("norad_id") REFERENCES "public"."astrodb_satellite"("norad_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_event_tag" ADD CONSTRAINT "astrodb_event_tag_event_id_astrodb_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."astrodb_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_media" ADD CONSTRAINT "astrodb_media_device_id_astrodb_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."astrodb_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_spec_kv" ADD CONSTRAINT "astrodb_spec_kv_device_id_astrodb_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."astrodb_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_tle" ADD CONSTRAINT "astrodb_tle_norad_id_astrodb_satellite_norad_id_fk" FOREIGN KEY ("norad_id") REFERENCES "public"."astrodb_satellite"("norad_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "astrodb_visibility" ADD CONSTRAINT "astrodb_visibility_event_id_astrodb_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."astrodb_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_dimension" ADD CONSTRAINT "design_dimension_example_id_design_example_id_fk" FOREIGN KEY ("example_id") REFERENCES "public"."design_example"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_dimension" ADD CONSTRAINT "design_dimension_computed_from_equation_id_design_equation_id_fk" FOREIGN KEY ("computed_from_equation_id") REFERENCES "public"."design_equation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_figure" ADD CONSTRAINT "design_figure_example_id_design_example_id_fk" FOREIGN KEY ("example_id") REFERENCES "public"."design_example"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_figure" ADD CONSTRAINT "design_figure_concept_id_design_concept_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."design_concept"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_part_file" ADD CONSTRAINT "design_part_file_example_id_design_example_id_fk" FOREIGN KEY ("example_id") REFERENCES "public"."design_example"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_procedure" ADD CONSTRAINT "design_procedure_example_id_design_example_id_fk" FOREIGN KEY ("example_id") REFERENCES "public"."design_example"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_rule_of_thumb" ADD CONSTRAINT "design_rule_of_thumb_source_ref_id_design_source_ref_id_fk" FOREIGN KEY ("source_ref_id") REFERENCES "public"."design_source_ref"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_dew_event" ADD CONSTRAINT "ops_dew_event_site_id_ops_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."ops_site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_horizon" ADD CONSTRAINT "ops_horizon_site_id_ops_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."ops_site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_meteo" ADD CONSTRAINT "ops_meteo_site_id_ops_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."ops_site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_meteo_quality" ADD CONSTRAINT "ops_meteo_quality_meteo_id_ops_meteo_id_fk" FOREIGN KEY ("meteo_id") REFERENCES "public"."ops_meteo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_obstacle" ADD CONSTRAINT "ops_obstacle_site_id_ops_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."ops_site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops_site_lp" ADD CONSTRAINT "ops_site_lp_site_id_ops_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."ops_site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_backfocus_offset" ADD CONSTRAINT "calib_backfocus_offset_train_id_calib_optical_train_id_fk" FOREIGN KEY ("train_id") REFERENCES "public"."calib_optical_train"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_filter_curve" ADD CONSTRAINT "calib_filter_curve_filter_id_calib_filter_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."calib_filter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_focus_profile" ADD CONSTRAINT "calib_focus_profile_train_id_calib_optical_train_id_fk" FOREIGN KEY ("train_id") REFERENCES "public"."calib_optical_train"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_focus_sample" ADD CONSTRAINT "calib_focus_sample_train_id_calib_optical_train_id_fk" FOREIGN KEY ("train_id") REFERENCES "public"."calib_optical_train"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_frame_index" ADD CONSTRAINT "calib_frame_index_master_id_calib_master_frame_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."calib_master_frame"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_master_frame" ADD CONSTRAINT "calib_master_frame_train_id_calib_optical_train_id_fk" FOREIGN KEY ("train_id") REFERENCES "public"."calib_optical_train"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_pointing_model" ADD CONSTRAINT "calib_pointing_model_train_id_calib_optical_train_id_fk" FOREIGN KEY ("train_id") REFERENCES "public"."calib_optical_train"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calib_sensor_qe" ADD CONSTRAINT "calib_sensor_qe_sensor_id_calib_sensor_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."calib_sensor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets_ephem" ADD CONSTRAINT "targets_ephem_body_id_targets_mp_body_id_fk" FOREIGN KEY ("body_id") REFERENCES "public"."targets_mp_body"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets_feature_aka" ADD CONSTRAINT "targets_feature_aka_feature_id_targets_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."targets_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets_notice" ADD CONSTRAINT "targets_notice_transient_id_targets_transient_id_fk" FOREIGN KEY ("transient_id") REFERENCES "public"."targets_transient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets_notice_xref" ADD CONSTRAINT "targets_notice_xref_notice_id_targets_notice_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."targets_notice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets_orbit_elem" ADD CONSTRAINT "targets_orbit_elem_body_id_targets_mp_body_id_fk" FOREIGN KEY ("body_id") REFERENCES "public"."targets_mp_body"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planqa_submetric" ADD CONSTRAINT "planqa_submetric_session_id_planqa_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."planqa_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skyviz_orbital_data" ADD CONSTRAINT "skyviz_orbital_data_object_id_skyviz_solar_system_object_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."skyviz_solar_system_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skyviz_sky_path_cache" ADD CONSTRAINT "skyviz_sky_path_cache_object_id_skyviz_solar_system_object_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."skyviz_solar_system_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skyviz_trajectory_cache" ADD CONSTRAINT "skyviz_trajectory_cache_object_id_skyviz_solar_system_object_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."skyviz_solar_system_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skyviz_asset" ADD CONSTRAINT "skyviz_asset_object_id_skyviz_solar_system_object_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."skyviz_solar_system_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aka_object_idx" ON "astrodb_aka" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "aka_name_idx" ON "astrodb_aka" USING btree ("name");--> statement-breakpoint
CREATE INDEX "capability_device_idx" ON "astrodb_capability" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "object_class_idx" ON "astrodb_object" USING btree ("class");--> statement-breakpoint
CREATE INDEX "object_mag_idx" ON "astrodb_object" USING btree ("mag");--> statement-breakpoint
CREATE INDEX "object_constellation_idx" ON "astrodb_object" USING btree ("constellation");--> statement-breakpoint
CREATE INDEX "compat_device_idx" ON "astrodb_compat" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "device_manufacturer_idx" ON "astrodb_device" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "device_category_idx" ON "astrodb_device" USING btree ("category");--> statement-breakpoint
CREATE INDEX "device_model_idx" ON "astrodb_device" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ephem_norad_ts_idx" ON "astrodb_ephem" USING btree ("norad_id","ts");--> statement-breakpoint
CREATE INDEX "event_type_idx" ON "astrodb_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "event_start_idx" ON "astrodb_event" USING btree ("start_utc");--> statement-breakpoint
CREATE INDEX "event_tag_event_idx" ON "astrodb_event_tag" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_tag_tag_idx" ON "astrodb_event_tag" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "import_run_domain_idx" ON "astrodb_import_run" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "import_run_started_idx" ON "astrodb_import_run" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "media_device_idx" ON "astrodb_media" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "satellite_norad_idx" ON "astrodb_satellite" USING btree ("norad_id");--> statement-breakpoint
CREATE INDEX "satellite_mag_idx" ON "astrodb_satellite" USING btree ("visual_mag_est");--> statement-breakpoint
CREATE INDEX "source_ref_entity_idx" ON "astrodb_source_ref" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "spec_kv_device_idx" ON "astrodb_spec_kv" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "spec_kv_key_idx" ON "astrodb_spec_kv" USING btree ("key");--> statement-breakpoint
CREATE INDEX "tle_norad_epoch_idx" ON "astrodb_tle" USING btree ("norad_id","epoch");--> statement-breakpoint
CREATE INDEX "visibility_event_idx" ON "astrodb_visibility" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "visibility_country_idx" ON "astrodb_visibility" USING btree ("country_iso2");--> statement-breakpoint
CREATE INDEX "concept_title_idx" ON "design_concept" USING btree ("title");--> statement-breakpoint
CREATE INDEX "concept_category_idx" ON "design_concept" USING btree ("category");--> statement-breakpoint
CREATE INDEX "concept_tags_idx" ON "design_concept" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "dimension_example_idx" ON "design_dimension" USING btree ("example_id");--> statement-breakpoint
CREATE INDEX "dimension_name_idx" ON "design_dimension" USING btree ("name");--> statement-breakpoint
CREATE INDEX "example_type_idx" ON "design_example" USING btree ("telescope_type");--> statement-breakpoint
CREATE INDEX "example_aperture_idx" ON "design_example" USING btree ("aperture_mm");--> statement-breakpoint
CREATE INDEX "example_focal_ratio_idx" ON "design_example" USING btree ("focal_ratio");--> statement-breakpoint
CREATE INDEX "equation_name_idx" ON "design_equation" USING btree ("name");--> statement-breakpoint
CREATE INDEX "figure_example_idx" ON "design_figure" USING btree ("example_id");--> statement-breakpoint
CREATE INDEX "figure_concept_idx" ON "design_figure" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "part_file_example_idx" ON "design_part_file" USING btree ("example_id");--> statement-breakpoint
CREATE INDEX "part_file_role_idx" ON "design_part_file" USING btree ("role");--> statement-breakpoint
CREATE INDEX "procedure_type_idx" ON "design_procedure" USING btree ("type");--> statement-breakpoint
CREATE INDEX "procedure_example_idx" ON "design_procedure" USING btree ("example_id");--> statement-breakpoint
CREATE INDEX "rule_tags_idx" ON "design_rule_of_thumb" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "xref_from_idx" ON "design_xref" USING btree ("from_table","from_id");--> statement-breakpoint
CREATE INDEX "xref_to_idx" ON "design_xref" USING btree ("to_table","to_id");--> statement-breakpoint
CREATE INDEX "ops_dew_site_ts_idx" ON "ops_dew_event" USING btree ("site_id","ts");--> statement-breakpoint
CREATE INDEX "ops_meteo_site_ts_idx" ON "ops_meteo" USING btree ("site_id","ts");--> statement-breakpoint
CREATE INDEX "ops_meteo_ts_idx" ON "ops_meteo" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "ops_obstacle_site_idx" ON "ops_obstacle" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "ops_site_name_idx" ON "ops_site" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ops_site_coord_idx" ON "ops_site" USING btree ("lat","lon");--> statement-breakpoint
CREATE UNIQUE INDEX "calib_backfocus_train_filter_idx" ON "calib_backfocus_offset" USING btree ("train_id","filter_name");--> statement-breakpoint
CREATE INDEX "calib_filter_curve_wl_idx" ON "calib_filter_curve" USING btree ("filter_id","wavelength_nm");--> statement-breakpoint
CREATE INDEX "calib_focus_prof_train_filter_idx" ON "calib_focus_profile" USING btree ("train_id","filter");--> statement-breakpoint
CREATE INDEX "calib_focus_train_idx" ON "calib_focus_sample" USING btree ("train_id");--> statement-breakpoint
CREATE INDEX "calib_focus_session_idx" ON "calib_focus_sample" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "calib_focus_ts_idx" ON "calib_focus_sample" USING btree ("ts");--> statement-breakpoint
CREATE UNIQUE INDEX "calib_frame_idx_master_tag" ON "calib_frame_index" USING btree ("master_id","tag");--> statement-breakpoint
CREATE INDEX "calib_master_train_idx" ON "calib_master_frame" USING btree ("train_id");--> statement-breakpoint
CREATE INDEX "calib_master_type_idx" ON "calib_master_frame" USING btree ("frame_type");--> statement-breakpoint
CREATE INDEX "calib_master_filter_idx" ON "calib_master_frame" USING btree ("filter");--> statement-breakpoint
CREATE INDEX "calib_master_spec_idx" ON "calib_master_frame" USING btree ("train_id","kind","filter","sensor_temp_c","gain","exposure_s");--> statement-breakpoint
CREATE UNIQUE INDEX "calib_train_name_idx" ON "calib_optical_train" USING btree ("name");--> statement-breakpoint
CREATE INDEX "calib_pec_mount_axis_idx" ON "calib_pec_profile" USING btree ("mount_model","axis");--> statement-breakpoint
CREATE INDEX "calib_pointing_train_idx" ON "calib_pointing_model" USING btree ("train_id");--> statement-breakpoint
CREATE INDEX "calib_sensor_qe_wl_idx" ON "calib_sensor_qe" USING btree ("sensor_id","wavelength_nm");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_ephem_body_ts_idx" ON "targets_ephem" USING btree ("body_id","ts");--> statement-breakpoint
CREATE INDEX "targets_ephem_ts_idx" ON "targets_ephem" USING btree ("ts");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_feature_body_name_idx" ON "targets_feature" USING btree ("body","name");--> statement-breakpoint
CREATE INDEX "targets_feature_body_type_idx" ON "targets_feature" USING btree ("body","feature_type");--> statement-breakpoint
CREATE INDEX "targets_aka_feature_idx" ON "targets_feature_aka" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "targets_hop_target_idx" ON "targets_hop" USING btree ("target_name");--> statement-breakpoint
CREATE INDEX "targets_hop_waypoint_idx" ON "targets_hop" USING btree ("waypoint_idx");--> statement-breakpoint
CREATE INDEX "targets_mp_designation_idx" ON "targets_mp_body" USING btree ("designation");--> statement-breakpoint
CREATE INDEX "targets_mp_name_idx" ON "targets_mp_body" USING btree ("name");--> statement-breakpoint
CREATE INDEX "targets_notice_transient_idx" ON "targets_notice" USING btree ("transient_id");--> statement-breakpoint
CREATE INDEX "targets_notice_source_idx" ON "targets_notice" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_notice_unique" ON "targets_notice" USING btree ("source","notice_id");--> statement-breakpoint
CREATE INDEX "targets_xref_notice_idx" ON "targets_notice_xref" USING btree ("notice_id");--> statement-breakpoint
CREATE INDEX "targets_orbit_body_idx" ON "targets_orbit_elem" USING btree ("body_id");--> statement-breakpoint
CREATE INDEX "targets_transient_name_idx" ON "targets_transient" USING btree ("name");--> statement-breakpoint
CREATE INDEX "targets_transient_coord_idx" ON "targets_transient" USING btree ("ra","dec");--> statement-breakpoint
CREATE INDEX "targets_transient_type_idx" ON "targets_transient" USING btree ("type");--> statement-breakpoint
CREATE INDEX "planqa_recipe_name_idx" ON "planqa_recipe" USING btree ("name");--> statement-breakpoint
CREATE INDEX "planqa_recipe_target_type_idx" ON "planqa_recipe" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX "planqa_recipe_spec_idx" ON "planqa_recipe" USING btree ("target_class","sky_mpsas_bin","filter");--> statement-breakpoint
CREATE INDEX "planqa_session_train_idx" ON "planqa_session" USING btree ("train_id");--> statement-breakpoint
CREATE INDEX "planqa_session_site_idx" ON "planqa_session" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "planqa_session_started_idx" ON "planqa_session" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "planqa_session_user_idx" ON "planqa_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "planqa_user_site_profile_user_site_idx" ON "planqa_user_site_profile" USING btree ("user_id","site_id");--> statement-breakpoint
CREATE INDEX "planqa_snr_train_filter_idx" ON "planqa_snr_model" USING btree ("train_id","filter_name");--> statement-breakpoint
CREATE INDEX "planqa_submetric_session_metric_idx" ON "planqa_submetric" USING btree ("session_id","metric_name");--> statement-breakpoint
CREATE INDEX "planqa_submetric_session_frame_idx" ON "planqa_submetric" USING btree ("session_id","frame_no");--> statement-breakpoint
CREATE INDEX "planqa_site_profile_name_idx" ON "planqa_site_profile" USING btree ("name");--> statement-breakpoint
CREATE INDEX "skyviz_orbital_object_idx" ON "skyviz_orbital_data" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "skyviz_orbital_epoch_idx" ON "skyviz_orbital_data" USING btree ("epoch");--> statement-breakpoint
CREATE INDEX "skyviz_path_object_idx" ON "skyviz_sky_path_cache" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "skyviz_path_location_idx" ON "skyviz_sky_path_cache" USING btree ("observer_lat","observer_lon");--> statement-breakpoint
CREATE INDEX "skyviz_path_daterange_idx" ON "skyviz_sky_path_cache" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "skyviz_sso_name_idx" ON "skyviz_solar_system_object" USING btree ("name");--> statement-breakpoint
CREATE INDEX "skyviz_sso_designation_idx" ON "skyviz_solar_system_object" USING btree ("designation");--> statement-breakpoint
CREATE INDEX "skyviz_sso_type_idx" ON "skyviz_solar_system_object" USING btree ("type");--> statement-breakpoint
CREATE INDEX "skyviz_sso_source_idx" ON "skyviz_solar_system_object" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "skyviz_sso_designation_unique" ON "skyviz_solar_system_object" USING btree ("designation");--> statement-breakpoint
CREATE INDEX "skyviz_star_mag_idx" ON "skyviz_star_catalog" USING btree ("magnitude");--> statement-breakpoint
CREATE INDEX "skyviz_star_pos_idx" ON "skyviz_star_catalog" USING btree ("ra","dec");--> statement-breakpoint
CREATE INDEX "skyviz_traj_object_idx" ON "skyviz_trajectory_cache" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "skyviz_traj_daterange_idx" ON "skyviz_trajectory_cache" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "skyviz_asset_object_idx" ON "skyviz_asset" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "skyviz_asset_type_idx" ON "skyviz_asset" USING btree ("asset_type");