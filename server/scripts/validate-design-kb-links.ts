/**
 * Design Knowledge Base Cross-Reference Validator
 * 
 * This script validates all cross-references and relationships in the Design KB:
 * - Ensures concept IDs referenced by examples exist
 * - Verifies procedure/example cross-links are valid
 * - Checks equation references in dimensions table
 * - Validates figure attachments
 * - Reports orphaned records and broken links
 * 
 * Usage: tsx server/scripts/validate-design-kb-links.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import ws from "ws";
import {
  concept,
  equation,
  dimensionedExample,
  procedure,
  figure,
  dimension,
  partFile,
  xref,
  sourceRef,
} from "@shared/design-schema";

neonConfig.webSocketConstructor = ws as any;

interface ValidationResult {
  table: string;
  recordId: number;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

class DesignKBValidator {
  private db: any;
  private results: ValidationResult[] = [];

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  addIssue(table: string, recordId: number, issue: string, severity: 'error' | 'warning' | 'info' = 'error') {
    this.results.push({ table, recordId, issue, severity });
  }

  /**
   * Validate all cross-references in xref table
   */
  async validateCrossReferences(): Promise<void> {
    console.log('📋 Validating cross-references...');
    
    const refs = await this.db.select().from(xref);
    console.log(`   Found ${refs.length} cross-references to validate`);

    for (const ref of refs) {
      // Validate 'from' reference
      const fromValid = await this.validateReference(ref.fromTable, ref.fromId);
      if (!fromValid) {
        this.addIssue('xref', ref.id, 
          `Invalid 'from' reference: ${ref.fromTable}#${ref.fromId} does not exist`);
      }

      // Validate 'to' reference
      const toValid = await this.validateReference(ref.toTable, ref.toId);
      if (!toValid) {
        this.addIssue('xref', ref.id,
          `Invalid 'to' reference: ${ref.toTable}#${ref.toId} does not exist`);
      }
    }

    console.log(`   ✅ Cross-reference validation complete`);
  }

  /**
   * Check if a reference exists in the specified table
   */
  async validateReference(tableName: string, id: number): Promise<boolean> {
    const tableMap: Record<string, any> = {
      'concept': concept,
      'equation': equation,
      'example': dimensionedExample,
      'procedure': procedure,
      'figure': figure,
    };

    const table = tableMap[tableName];
    if (!table) {
      console.warn(`⚠️  Unknown table: ${tableName}`);
      return false;
    }

    try {
      const result = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
      return result.length > 0;
    } catch (error) {
      console.error(`Error validating ${tableName}#${id}:`, error);
      return false;
    }
  }

  /**
   * Validate procedure-example relationships
   */
  async validateProcedures(): Promise<void> {
    console.log('🔧 Validating procedures...');
    
    const procedures = await this.db.select().from(procedure);
    console.log(`   Found ${procedures.length} procedures to validate`);

    for (const proc of procedures) {
      // Check if referenced example exists
      if (proc.exampleId) {
        const examples = await this.db
          .select()
          .from(dimensionedExample)
          .where(eq(dimensionedExample.id, proc.exampleId))
          .limit(1);

        if (examples.length === 0) {
          this.addIssue('procedure', proc.id,
            `References non-existent example #${proc.exampleId}`);
        }
      }

      // Validate steps structure
      if (!proc.steps || proc.steps.length === 0) {
        this.addIssue('procedure', proc.id,
          'Has no steps defined', 'warning');
      }

      // Check for figure references in steps
      for (const step of (proc.steps || [])) {
        if (step.figure_id) {
          const figures = await this.db
            .select()
            .from(figure)
            .where(eq(figure.id, step.figure_id))
            .limit(1);

          if (figures.length === 0) {
            this.addIssue('procedure', proc.id,
              `Step ${step.order} references non-existent figure #${step.figure_id}`);
          }
        }
      }
    }

    console.log(`   ✅ Procedure validation complete`);
  }

  /**
   * Validate dimension-equation relationships
   */
  async validateDimensions(): Promise<void> {
    console.log('📐 Validating dimensions...');
    
    const dimensions = await this.db.select().from(dimension);
    console.log(`   Found ${dimensions.length} dimensions to validate`);

    for (const dim of dimensions) {
      // Check if referenced example exists
      const examples = await this.db
        .select()
        .from(dimensionedExample)
        .where(eq(dimensionedExample.id, dim.exampleId))
        .limit(1);

      if (examples.length === 0) {
        this.addIssue('dimension', dim.id,
          `References non-existent example #${dim.exampleId}`);
      }

      // Check if referenced equation exists
      if (dim.computedFromEquationId) {
        const equations = await this.db
          .select()
          .from(equation)
          .where(eq(equation.id, dim.computedFromEquationId))
          .limit(1);

        if (equations.length === 0) {
          this.addIssue('dimension', dim.id,
            `References non-existent equation #${dim.computedFromEquationId}`);
        }
      }

      // Validate units
      if (!dim.unitSi || !dim.unitSource) {
        this.addIssue('dimension', dim.id,
          'Missing unit specification', 'warning');
      }
    }

    console.log(`   ✅ Dimension validation complete`);
  }

  /**
   * Validate figure attachments
   */
  async validateFigures(): Promise<void> {
    console.log('🖼️  Validating figures...');
    
    const figures = await this.db.select().from(figure);
    console.log(`   Found ${figures.length} figures to validate`);

    for (const fig of figures) {
      let hasAttachment = false;

      // Check example attachment
      if (fig.exampleId) {
        const examples = await this.db
          .select()
          .from(dimensionedExample)
          .where(eq(dimensionedExample.id, fig.exampleId))
          .limit(1);

        if (examples.length > 0) {
          hasAttachment = true;
        } else {
          this.addIssue('figure', fig.id,
            `References non-existent example #${fig.exampleId}`);
        }
      }

      // Check concept attachment
      if (fig.conceptId) {
        const concepts = await this.db
          .select()
          .from(concept)
          .where(eq(concept.id, fig.conceptId))
          .limit(1);

        if (concepts.length > 0) {
          hasAttachment = true;
        } else {
          this.addIssue('figure', fig.id,
            `References non-existent concept #${fig.conceptId}`);
        }
      }

      // Warn if figure has no attachment
      if (!hasAttachment) {
        this.addIssue('figure', fig.id,
          'Not attached to any concept or example', 'warning');
      }

      // Validate URL and hash
      if (!fig.url) {
        this.addIssue('figure', fig.id, 'Missing URL', 'error');
      }
      if (!fig.hash) {
        this.addIssue('figure', fig.id, 'Missing content hash', 'warning');
      }
    }

    console.log(`   ✅ Figure validation complete`);
  }

  /**
   * Validate part files
   */
  async validatePartFiles(): Promise<void> {
    console.log('📦 Validating part files...');
    
    const files = await this.db.select().from(partFile);
    console.log(`   Found ${files.length} part files to validate`);

    for (const file of files) {
      // Check if referenced example exists
      const examples = await this.db
        .select()
        .from(dimensionedExample)
        .where(eq(dimensionedExample.id, file.exampleId))
        .limit(1);

      if (examples.length === 0) {
        this.addIssue('partFile', file.id,
          `References non-existent example #${file.exampleId}`);
      }

      // Validate URL and hash
      if (!file.url) {
        this.addIssue('partFile', file.id, 'Missing URL', 'error');
      }
      if (!file.hash) {
        this.addIssue('partFile', file.id, 'Missing content hash', 'warning');
      }
    }

    console.log(`   ✅ Part file validation complete`);
  }

  /**
   * Find orphaned examples (no procedures, no dimensions, no part files)
   */
  async findOrphanedExamples(): Promise<void> {
    console.log('🔍 Finding orphaned examples...');
    
    const examples = await this.db.select().from(dimensionedExample);

    for (const ex of examples) {
      const [dims, procs, files] = await Promise.all([
        this.db.select().from(dimension).where(eq(dimension.exampleId, ex.id)),
        this.db.select().from(procedure).where(eq(procedure.exampleId, ex.id)),
        this.db.select().from(partFile).where(eq(partFile.exampleId, ex.id)),
      ]);

      if (dims.length === 0 && procs.length === 0 && files.length === 0) {
        this.addIssue('dimensionedExample', ex.id,
          `Orphaned example "${ex.title}" - has no dimensions, procedures, or part files`, 'info');
      }
    }

    console.log(`   ✅ Orphan check complete`);
  }

  /**
   * Validate source references
   */
  async validateSourceReferences(): Promise<void> {
    console.log('📚 Validating source references...');
    
    // Check if rules_of_thumb have valid source references
    const { ruleOfThumb } = await import("@shared/design-schema");
    const rules = await this.db.select().from(ruleOfThumb);
    
    for (const rule of rules) {
      if (rule.sourceRefId) {
        const sources = await this.db
          .select()
          .from(sourceRef)
          .where(eq(sourceRef.id, rule.sourceRefId))
          .limit(1);

        if (sources.length === 0) {
          this.addIssue('ruleOfThumb', rule.id,
            `References non-existent source #${rule.sourceRefId}`);
        }
      }
    }

    console.log(`   ✅ Source reference validation complete`);
  }

  /**
   * Generate validation report
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(80));

    const errors = this.results.filter(r => r.severity === 'error');
    const warnings = this.results.filter(r => r.severity === 'warning');
    const info = this.results.filter(r => r.severity === 'info');

    console.log(`\n❌ Errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(r => {
        console.log(`   ${r.table}#${r.recordId}: ${r.issue}`);
      });
    }

    console.log(`\n⚠️  Warnings: ${warnings.length}`);
    if (warnings.length > 0 && warnings.length <= 10) {
      warnings.forEach(r => {
        console.log(`   ${r.table}#${r.recordId}: ${r.issue}`);
      });
    } else if (warnings.length > 10) {
      warnings.slice(0, 10).forEach(r => {
        console.log(`   ${r.table}#${r.recordId}: ${r.issue}`);
      });
      console.log(`   ... and ${warnings.length - 10} more`);
    }

    console.log(`\nℹ️  Info: ${info.length}`);
    if (info.length > 0 && info.length <= 10) {
      info.forEach(r => {
        console.log(`   ${r.table}#${r.recordId}: ${r.issue}`);
      });
    } else if (info.length > 10) {
      info.slice(0, 10).forEach(r => {
        console.log(`   ${r.table}#${r.recordId}: ${r.issue}`);
      });
      console.log(`   ... and ${info.length - 10} more`);
    }

    console.log('\n' + '='.repeat(80));

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✨ All validations passed! Design KB integrity is good.');
    } else if (errors.length === 0) {
      console.log('✅ No errors found, but there are warnings to review.');
    } else {
      console.log('❌ Found errors that should be fixed.');
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Main validation workflow
   */
  async run(): Promise<boolean> {
    console.log('🚀 Starting Design KB link validation...\n');

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable not set');
      return false;
    }

    try {
      await this.validateCrossReferences();
      await this.validateProcedures();
      await this.validateDimensions();
      await this.validateFigures();
      await this.validatePartFiles();
      await this.findOrphanedExamples();
      await this.validateSourceReferences();

      this.generateReport();

      const hasErrors = this.results.some(r => r.severity === 'error');
      return !hasErrors;
    } catch (error: any) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }
}

// Run validator if called directly
if (require.main === module) {
  const validator = new DesignKBValidator();
  validator.run()
    .then((success) => {
      if (success) {
        console.log('✅ Validation completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Validation completed with errors');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Validator failed:', error);
      process.exit(1);
    });
}

export { DesignKBValidator };
