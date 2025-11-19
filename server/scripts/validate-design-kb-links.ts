/**
 * Design KB Cross-Reference Validator
 * Validates integrity of all relationships in the Design Knowledge Base
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
import { eq, sql } from "drizzle-orm";
import {
  concept,
  equation,
  dimensionedExample,
  procedure,
  dimension,
  xref,
  figure,
  partFile,
} from "../../shared/design-schema.js";

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: any;
}

async function validateDesignKB() {
  console.log("🔍 Starting Design KB validation...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ No DATABASE_URL found in environment");
    console.error("Set DATABASE_URL in your .env file to enable validation");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const issues: ValidationIssue[] = [];

  try {
    // ===== Get counts =====
    console.log("📊 Checking database contents...");
    const [concepts, equations, examples, procedures_] = await Promise.all([
      db.select().from(concept),
      db.select().from(equation),
      db.select().from(dimensionedExample),
      db.select().from(procedure),
    ]);

    console.log(`  - Concepts: ${concepts.length}`);
    console.log(`  - Equations: ${equations.length}`);
    console.log(`  - Examples: ${examples.length}`);
    console.log(`  - Procedures: ${procedures_.length}\n`);

    // ===== Validate Cross-References =====
    console.log("📋 Validating cross-references...");
    const xrefs = await db.select().from(xref);

    for (const ref of xrefs) {
      // Validate 'from' reference
      if (ref.fromTable === "concept") {
        const exists = await db.select({ id: concept.id }).from(concept).where(eq(concept.id, ref.fromId));
        if (exists.length === 0) {
          issues.push({
            severity: "error",
            category: "xref",
            message: `Cross-reference from concept ${ref.fromId} doesn't exist`,
            details: ref,
          });
        }
      } else if (ref.fromTable === "equation") {
        const exists = await db.select({ id: equation.id }).from(equation).where(eq(equation.id, ref.fromId));
        if (exists.length === 0) {
          issues.push({
            severity: "error",
            category: "xref",
            message: `Cross-reference from equation ${ref.fromId} doesn't exist`,
            details: ref,
          });
        }
      }

      // Validate 'to' reference
      if (ref.toTable === "concept") {
        const exists = await db.select({ id: concept.id }).from(concept).where(eq(concept.id, ref.toId));
        if (exists.length === 0) {
          issues.push({
            severity: "error",
            category: "xref",
            message: `Cross-reference to concept ${ref.toId} doesn't exist`,
            details: ref,
          });
        }
      } else if (ref.toTable === "equation") {
        const exists = await db.select({ id: equation.id }).from(equation).where(eq(equation.id, ref.toId));
        if (exists.length === 0) {
          issues.push({
            severity: "error",
            category: "xref",
            message: `Cross-reference to equation ${ref.toId} doesn't exist`,
            details: ref,
          });
        }
      }
    }

    console.log(`  ✓ Checked ${xrefs.length} cross-references\n`);

    // ===== Data Quality Checks =====
    console.log("✅ Running data quality checks...");

    // Check equations have unit tests
    const equationsWithoutTests = equations.filter(
      e => !e.unitTests || (Array.isArray(e.unitTests) && e.unitTests.length === 0)
    );

    if (equationsWithoutTests.length > 0) {
      issues.push({
        severity: "warning",
        category: "quality",
        message: `${equationsWithoutTests.length} equations lack unit tests`,
        details: equationsWithoutTests.map(e => e.name),
      });
    }

    // Check examples have feasibility checks
    const examplesWithoutChecks = examples.filter(
      e => !e.feasibilityChecks || (Array.isArray(e.feasibilityChecks) && e.feasibilityChecks.length === 0)
    );

    if (examplesWithoutChecks.length > 0) {
      issues.push({
        severity: "info",
        category: "quality",
        message: `${examplesWithoutChecks.length} examples lack feasibility checks`,
        details: examplesWithoutChecks.map(e => e.title),
      });
    }

    console.log(`  ✓ Quality checks complete\n`);

    // ===== Report Results =====
    console.log("=".repeat(60));
    console.log("📊 VALIDATION REPORT");
    console.log("=".repeat(60) + "\n");

    const errors = issues.filter(i => i.severity === "error");
    const warnings = issues.filter(i => i.severity === "warning");
    const infos = issues.filter(i => i.severity === "info");

    if (errors.length === 0 && warnings.length === 0) {
      console.log("✅ All checks passed! Design KB is in good shape.\n");
    } else {
      if (errors.length > 0) {
        console.log(`❌ ERRORS (${errors.length}):`);
        errors.forEach(issue => {
          console.log(`   [${issue.category}] ${issue.message}`);
        });
        console.log();
      }

      if (warnings.length > 0) {
        console.log(`⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach(issue => {
          console.log(`   [${issue.category}] ${issue.message}`);
        });
        console.log();
      }

      if (infos.length > 0) {
        console.log(`ℹ️  INFO (${infos.length}):`);
        infos.forEach(issue => {
          console.log(`   [${issue.category}] ${issue.message}`);
        });
        console.log();
      }
    }

    console.log("=".repeat(60));

    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation
validateDesignKB();
