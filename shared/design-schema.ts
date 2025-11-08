import { sql } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  text, 
  varchar, 
  timestamp, 
  real, 
  integer,
  pgEnum,
  jsonb,
  index,
  unique,
  check
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== DESIGN KNOWLEDGE BASE SCHEMA =====

export const difficultyEnum = pgEnum('difficulty', ['intro', 'intermediate', 'advanced']);

export const conceptCategoryEnum = pgEnum('concept_category', [
  'optics', 'mechanics', 'mount', 'assembly', 'collimation', 
  'testing', 'safety', 'printing', 'materials', 'fasteners'
]);

export const telescopeTypeEnum = pgEnum('telescope_type', [
  'newtonian', 'dobsonian', 'refractor', 'sct', 'maksutov', 'other'
]);

export const focuserTypeEnum = pgEnum('focuser_type', [
  'helical', 'rack_pinion', 'crayford', 'printed_helical'
]);

export const partRoleEnum = pgEnum('part_role', [
  'ota', 'cell', 'spider', 'secondary_holder', 'focuser_body', 
  'rack', 'pinion', 'tube_ring', 'truss', 'rocker', 'ground_board',
  'alt_bearing', 'adapter', 'finder', 'misc'
]);

export const fileFormatEnum = pgEnum('file_format', [
  'stl', 'step', '3mf', 'f3d'
]);

export const procedureTypeEnum = pgEnum('procedure_type', [
  'assembly', 'collimation', 'test', 'maintenance', 'safety'
]);

// ===== CORE TABLES =====

export const concept = pgTable('design_concept', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary').notNull(),
  bodyMd: text('body_md').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  difficulty: difficultyEnum('difficulty').notNull(),
  category: conceptCategoryEnum('category').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  titleIdx: index('concept_title_idx').on(table.title),
  categoryIdx: index('concept_category_idx').on(table.category),
  tagsIdx: index('concept_tags_idx').using('gin', table.tags),
}));

export const equation = pgTable('design_equation', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull().unique(),
  latex: text('latex').notNull(),
  description: text('description').notNull(),
  variables: jsonb('variables').$type<{
    symbol: string;
    name: string;
    unit_si: string;
    unit_source?: string;
    description: string;
    typical_range?: string;
  }[]>().notNull(),
  assumptions: text('assumptions'),
  domain: text('domain'),
  references: jsonb('references').$type<string[]>().default([]),
  unitTests: jsonb('unit_tests').$type<{
    name: string;
    inputs: Record<string, number>;
    expected_output: number;
    tolerance: number;
  }[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('equation_name_idx').on(table.name),
}));

export const ruleOfThumb = pgTable('design_rule_of_thumb', {
  id: serial('id').primaryKey(),
  statementMd: text('statement_md').notNull(),
  contextMd: text('context_md'),
  sourceRefId: integer('source_ref_id').references(() => sourceRef.id),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
}, (table) => ({
  tagsIdx: index('rule_tags_idx').using('gin', table.tags),
}));

export const dimensionedExample = pgTable('design_example', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  telescopeType: telescopeTypeEnum('telescope_type').notNull(),
  apertureMm: integer('aperture_mm').notNull(),
  focalRatio: real('focal_ratio').notNull(),
  focalLengthMm: integer('focal_length_mm').notNull(),
  obstructionPct: real('obstruction_pct'),
  illuminatedFieldMm: real('illuminated_field_mm'),
  focuserType: focuserTypeEnum('focuser_type').notNull(),
  printVolumeMm: jsonb('print_volume_mm').$type<{ x: number; y: number; z: number }>().notNull(),
  totalMassKg: real('total_mass_kg'),
  billOfMaterials: jsonb('bill_of_materials').$type<{
    part: string;
    qty: number;
    material?: string;
    vendor?: string;
    sku?: string;
    unit_cost?: number;
    link?: string;
  }[]>().notNull(),
  printSettings: jsonb('print_settings').$type<{
    nozzle_mm: number;
    layer_mm: number;
    walls: number;
    infill_pct: number;
    material: string;
    anneal?: boolean;
  }>().notNull(),
  notesMd: text('notes_md'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueTitleType: unique('example_title_type_unique').on(table.title, table.telescopeType),
  typeIdx: index('example_type_idx').on(table.telescopeType),
  apertureIdx: index('example_aperture_idx').on(table.apertureMm),
  focalRatioIdx: index('example_focal_ratio_idx').on(table.focalRatio),
  // Check constraint: focal_length should equal aperture * focal_ratio (approximately)
  focalLengthCheck: check('focal_length_check', 
    sql`${table.focalLengthMm} >= ${table.apertureMm} * ${table.focalRatio} * 0.95 AND ${table.focalLengthMm} <= ${table.apertureMm} * ${table.focalRatio} * 1.05`
  ),
  // Check constraint: obstruction should be reasonable for reflectors
  obstructionCheck: check('obstruction_check',
    sql`${table.obstructionPct} IS NULL OR (${table.obstructionPct} >= 0 AND ${table.obstructionPct} <= 50)`
  ),
}));

export const partFile = pgTable('design_part_file', {
  id: serial('id').primaryKey(),
  exampleId: integer('example_id').notNull().references(() => dimensionedExample.id, { onDelete: 'cascade' }),
  role: partRoleEnum('role').notNull(),
  format: fileFormatEnum('format').notNull(),
  url: text('url').notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
  license: varchar('license', { length: 128 }).notNull(),
  note: text('note'),
}, (table) => ({
  exampleIdx: index('part_file_example_idx').on(table.exampleId),
  roleIdx: index('part_file_role_idx').on(table.role),
}));

export const dimension = pgTable('design_dimension', {
  id: serial('id').primaryKey(),
  exampleId: integer('example_id').notNull().references(() => dimensionedExample.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  value: real('value').notNull(),
  unitSource: varchar('unit_source', { length: 32 }).notNull(),
  unitSi: varchar('unit_si', { length: 32 }).notNull(),
  toleranceMm: real('tolerance_mm'),
  computedFromEquationId: integer('computed_from_equation_id').references(() => equation.id),
  notes: text('notes'),
}, (table) => ({
  exampleIdx: index('dimension_example_idx').on(table.exampleId),
  nameIdx: index('dimension_name_idx').on(table.name),
}));

export const procedure = pgTable('design_procedure', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  bodyMd: text('body_md').notNull(),
  type: procedureTypeEnum('type').notNull(),
  estimatedTimeMin: integer('estimated_time_min'),
  tools: jsonb('tools').$type<string[]>().default([]),
  steps: jsonb('steps').$type<{
    order: number;
    description: string;
    figure_id?: number;
    safety_note?: string;
  }[]>().notNull(),
  hazardsMd: text('hazards_md'),
  exampleId: integer('example_id').references(() => dimensionedExample.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('procedure_type_idx').on(table.type),
  exampleIdx: index('procedure_example_idx').on(table.exampleId),
}));

export const figure = pgTable('design_figure', {
  id: serial('id').primaryKey(),
  caption: text('caption').notNull(),
  url: text('url').notNull(),
  exampleId: integer('example_id').references(() => dimensionedExample.id),
  conceptId: integer('concept_id').references(() => concept.id),
  license: varchar('license', { length: 128 }).notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
}, (table) => ({
  exampleIdx: index('figure_example_idx').on(table.exampleId),
  conceptIdx: index('figure_concept_idx').on(table.conceptId),
}));

export const sourceRef = pgTable('design_source_ref', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  url: text('url').notNull(),
  license: varchar('license', { length: 128 }).notNull(),
  author: varchar('author', { length: 256 }),
  publisher: varchar('publisher', { length: 256 }),
  year: integer('year'),
  accessDate: timestamp('access_date').notNull().defaultNow(),
  hash: varchar('hash', { length: 64 }),
});

export const xref = pgTable('design_xref', {
  id: serial('id').primaryKey(),
  fromTable: varchar('from_table', { length: 64 }).notNull(),
  fromId: integer('from_id').notNull(),
  toTable: varchar('to_table', { length: 64 }).notNull(),
  toId: integer('to_id').notNull(),
  relation: text('relation'),
}, (table) => ({
  fromIdx: index('xref_from_idx').on(table.fromTable, table.fromId),
  toIdx: index('xref_to_idx').on(table.toTable, table.toId),
}));

// ===== INSERT SCHEMAS =====

export const insertConceptSchema = createInsertSchema(concept).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEquationSchema = createInsertSchema(equation).omit({ id: true, createdAt: true });
export const insertRuleOfThumbSchema = createInsertSchema(ruleOfThumb).omit({ id: true });
export const insertDimensionedExampleSchema = createInsertSchema(dimensionedExample).omit({ id: true, createdAt: true });
export const insertPartFileSchema = createInsertSchema(partFile).omit({ id: true });
export const insertDimensionSchema = createInsertSchema(dimension).omit({ id: true });
export const insertProcedureSchema = createInsertSchema(procedure).omit({ id: true, createdAt: true });
export const insertFigureSchema = createInsertSchema(figure).omit({ id: true });
export const insertSourceRefSchema = createInsertSchema(sourceRef).omit({ id: true, accessDate: true });
export const insertXrefSchema = createInsertSchema(xref).omit({ id: true });

// ===== TYPES =====

export type Concept = typeof concept.$inferSelect;
export type Equation = typeof equation.$inferSelect;
export type RuleOfThumb = typeof ruleOfThumb.$inferSelect;
export type DimensionedExample = typeof dimensionedExample.$inferSelect;
export type PartFile = typeof partFile.$inferSelect;
export type Dimension = typeof dimension.$inferSelect;
export type Procedure = typeof procedure.$inferSelect;
export type Figure = typeof figure.$inferSelect;
export type DesignSourceRef = typeof sourceRef.$inferSelect;
export type Xref = typeof xref.$inferSelect;

export type InsertConcept = z.infer<typeof insertConceptSchema>;
export type InsertEquation = z.infer<typeof insertEquationSchema>;
export type InsertDimensionedExample = z.infer<typeof insertDimensionedExampleSchema>;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;
