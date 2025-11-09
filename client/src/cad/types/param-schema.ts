/**
 * ParamSchema - JSON schema for parametric CAD model parameters
 *
 * This defines the structure for describing parameters that can be
 * adjusted by users to customize generated CAD models.
 */

export type ParamType = 'number' | 'integer' | 'string' | 'enum' | 'boolean';

export interface BaseParam {
  type: ParamType;
  label: string;
  description?: string;
  default: any;
  group?: string;                  // For UI organization
  units?: string;                  // 'mm', 'deg', 'in', etc.
}

export interface NumberParam extends BaseParam {
  type: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface IntegerParam extends BaseParam {
  type: 'integer';
  default: number;
  min?: number;
  max?: number;
}

export interface StringParam extends BaseParam {
  type: 'string';
  default: string;
  pattern?: string;                // Regex validation
  maxLength?: number;
}

export interface EnumParam extends BaseParam {
  type: 'enum';
  default: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}

export interface BooleanParam extends BaseParam {
  type: 'boolean';
  default: boolean;
}

export type Param = NumberParam | IntegerParam | StringParam | EnumParam | BooleanParam;

export interface ParamSchema {
  version: string;                 // Schema version (e.g., "1.0")
  name: string;                    // Human-readable part name
  description?: string;
  author?: string;
  tags?: string[];                 // For searchability
  params: Record<string, Param>;
  constraints?: Array<{
    expression: string;            // JavaScript expression
    message: string;               // Error message if constraint fails
  }>;
}

// ===== VALIDATION =====

export interface ValidationError {
  param: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

export function validateParams(
  schema: ParamSchema,
  params: Record<string, any>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check all required params are present
  for (const [key, paramDef] of Object.entries(schema.params)) {
    if (!(key in params)) {
      // Use default if available
      params[key] = paramDef.default;
      warnings.push(`Parameter "${key}" missing, using default: ${paramDef.default}`);
    }

    const value = params[key];

    // Type validation
    switch (paramDef.type) {
      case 'number':
      case 'integer': {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ param: key, message: `Expected number, got ${typeof value}`, value });
          break;
        }
        if (paramDef.type === 'integer' && !Number.isInteger(num)) {
          errors.push({ param: key, message: 'Expected integer', value });
        }
        if (paramDef.min !== undefined && num < paramDef.min) {
          errors.push({ param: key, message: `Value ${num} < minimum ${paramDef.min}`, value });
        }
        if (paramDef.max !== undefined && num > paramDef.max) {
          errors.push({ param: key, message: `Value ${num} > maximum ${paramDef.max}`, value });
        }
        break;
      }
      case 'string': {
        if (typeof value !== 'string') {
          errors.push({ param: key, message: `Expected string, got ${typeof value}`, value });
          break;
        }
        if (paramDef.pattern) {
          const regex = new RegExp(paramDef.pattern);
          if (!regex.test(value)) {
            errors.push({ param: key, message: `Value does not match pattern ${paramDef.pattern}`, value });
          }
        }
        if (paramDef.maxLength && value.length > paramDef.maxLength) {
          errors.push({ param: key, message: `String too long (max: ${paramDef.maxLength})`, value });
        }
        break;
      }
      case 'enum': {
        const validValues = paramDef.options.map(o => o.value);
        if (!validValues.includes(value)) {
          errors.push({ param: key, message: `Invalid enum value. Expected one of: ${validValues.join(', ')}`, value });
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push({ param: key, message: `Expected boolean, got ${typeof value}`, value });
        }
        break;
      }
    }
  }

  // Constraint validation
  if (schema.constraints) {
    for (const constraint of schema.constraints) {
      try {
        // Evaluate constraint expression (safely)
        const fn = new Function(...Object.keys(params), `return ${constraint.expression}`);
        const result = fn(...Object.values(params));
        if (!result) {
          errors.push({
            param: 'constraint',
            message: constraint.message,
            value: constraint.expression,
          });
        }
      } catch (e) {
        errors.push({
          param: 'constraint',
          message: `Constraint evaluation error: ${(e as Error).message}`,
          value: constraint.expression,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ===== EXAMPLE SCHEMA =====

export const exampleSchema: ParamSchema = {
  version: "1.0",
  name: "Telescope Tube Clamp",
  description: "Parametric tube clamp ring for securing optical tube assemblies",
  author: "System",
  tags: ["clamp", "tube", "mounting"],
  params: {
    tubeDiameter: {
      type: 'number',
      label: 'Tube Diameter',
      description: 'Inner diameter of the tube to clamp',
      default: 200,
      min: 50,
      max: 500,
      units: 'mm',
      group: 'Geometry',
    },
    clampThickness: {
      type: 'number',
      label: 'Clamp Thickness',
      description: 'Wall thickness of the clamp ring',
      default: 5,
      min: 2,
      max: 15,
      units: 'mm',
      group: 'Geometry',
    },
    clampHeight: {
      type: 'number',
      label: 'Clamp Height',
      description: 'Axial height of the clamp',
      default: 30,
      min: 10,
      max: 100,
      units: 'mm',
      group: 'Geometry',
    },
    boltHoles: {
      type: 'integer',
      label: 'Number of Bolt Holes',
      description: 'Mounting bolt holes around the circumference',
      default: 4,
      min: 2,
      max: 12,
      group: 'Fasteners',
    },
    boltDiameter: {
      type: 'number',
      label: 'Bolt Diameter',
      description: 'Diameter of mounting bolt holes',
      default: 6,
      min: 3,
      max: 12,
      units: 'mm',
      group: 'Fasteners',
    },
    splitGap: {
      type: 'number',
      label: 'Split Gap Width',
      description: 'Width of the split opening for clamping',
      default: 5,
      min: 2,
      max: 20,
      units: 'mm',
      group: 'Geometry',
    },
  },
  constraints: [
    {
      expression: 'clampThickness < tubeDiameter / 4',
      message: 'Clamp thickness must be less than 1/4 of tube diameter',
    },
    {
      expression: 'boltDiameter < clampThickness * 2',
      message: 'Bolt diameter must be less than 2x clamp thickness',
    },
  ],
};
