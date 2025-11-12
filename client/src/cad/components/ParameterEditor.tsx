/**
 * Parameter Editor Component
 *
 * Dynamic form for editing template parameters based on ParamSchema.
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import type { ParamSchema, ValidationResult } from '../types/param-schema';
import { validateParams } from '../types/param-schema';

interface ParameterEditorProps {
  schema: ParamSchema;
  initialParams: Record<string, any>;
  onParamsChange: (params: Record<string, any>, isValid: boolean) => void;
  onRebuild?: () => void;
  isBuilding?: boolean;
}

export function ParameterEditor({
  schema,
  initialParams,
  onParamsChange,
  onRebuild,
  isBuilding = false,
}: ParameterEditorProps) {
  const [params, setParams] = useState<Record<string, any>>(initialParams);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Validate parameters whenever they change
  const validation = useMemo<ValidationResult>(() => {
    return validateParams(schema, params);
  }, [schema, params]);

  // Notify parent of parameter changes
  useEffect(() => {
    onParamsChange(params, validation.valid);
  }, [params, validation.valid]);

  const handleParamChange = (paramName: string, value: any) => {
    setParams((prev) => ({ ...prev, [paramName]: value }));
    setTouched((prev) => new Set(prev).add(paramName));
  };

  const handleBlur = (paramName: string) => {
    setTouched((prev) => new Set(prev).add(paramName));
  };

  // Group parameters by group
  const paramGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    Object.entries(schema.params).forEach(([name, param]) => {
      const group = param.group || 'General';
      if (!groups[group]) groups[group] = [];
      groups[group].push(name);
    });
    return groups;
  }, [schema]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">{schema.name}</h2>
          {validation.valid ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
        {schema.description && (
          <p className="text-sm text-gray-600">{schema.description}</p>
        )}
      </div>

      {/* Parameters */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(paramGroups).map(([groupName, paramNames]) => (
          <div key={groupName} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              {groupName}
            </h3>
            <div className="space-y-4">
              {paramNames.map((paramName) => {
                const param = schema.params[paramName];
                const value = params[paramName];
                const error = touched.has(paramName) ? validation.errors[paramName] : undefined;

                return (
                  <ParamInput
                    key={paramName}
                    name={paramName}
                    param={param}
                    value={value}
                    error={error}
                    onChange={(val) => handleParamChange(paramName, val)}
                    onBlur={() => handleBlur(paramName)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Constraint Violations */}
        {validation.constraintViolations.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Constraint Violations
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {validation.constraintViolations.map((msg, i) => (
                <li key={i}>• {msg}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      {onRebuild && (
        <div className="p-4 border-t">
          <button
            onClick={onRebuild}
            disabled={!validation.valid || isBuilding}
            className={`
              w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2
              transition-colors
              ${
                validation.valid && !isBuilding
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isBuilding ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Building...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Rebuild Model
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface ParamInputProps {
  name: string;
  param: any;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  onBlur: () => void;
}

function ParamInput({ name, param, value, error, onChange, onBlur }: ParamInputProps) {
  const renderInput = () => {
    switch (param.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value ?? param.default}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onBlur={onBlur}
            min={param.min}
            max={param.max}
            step={param.step || 0.1}
            className={`
              w-full px-3 py-2 border rounded-lg
              ${error ? 'border-red-500' : 'border-gray-300'}
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
          />
        );

      case 'integer':
        return (
          <input
            type="number"
            value={value ?? param.default}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            onBlur={onBlur}
            min={param.min}
            max={param.max}
            step={1}
            className={`
              w-full px-3 py-2 border rounded-lg
              ${error ? 'border-red-500' : 'border-gray-300'}
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
          />
        );

      case 'string':
        return (
          <input
            type="text"
            value={value ?? param.default}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            pattern={param.pattern}
            className={`
              w-full px-3 py-2 border rounded-lg
              ${error ? 'border-red-500' : 'border-gray-300'}
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value ?? param.default}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              {param.trueLabel || 'Enabled'}
            </span>
          </label>
        );

      case 'enum':
        return (
          <select
            value={value ?? param.default}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`
              w-full px-3 py-2 border rounded-lg
              ${error ? 'border-red-500' : 'border-gray-300'}
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
          >
            {param.options.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return <div className="text-sm text-gray-500">Unsupported type: {param.type}</div>;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {param.label}
        {param.units && <span className="text-gray-500 ml-1">({param.units})</span>}
      </label>
      {param.description && (
        <p className="text-xs text-gray-500 mb-2">{param.description}</p>
      )}
      {renderInput()}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
}
