/**
 * Generative Input Component
 *
 * Natural language interface for LLM-based CAD generation.
 */

import { useState } from 'react';
import { Sparkles, Send, AlertCircle, Loader2, Code, Wand2 } from 'lucide-react';
import type { GenerativeRequest, GenerativeResponse } from '../generative/llm-bridge';

interface GenerativeInputProps {
  onGenerate: (description: string, options?: Partial<GenerativeRequest>) => void;
  isGenerating: boolean;
  lastError?: string;
  lastResponse?: GenerativeResponse;
  onUseGenerated?: (response: GenerativeResponse) => void;
}

export function GenerativeInput({
  onGenerate,
  isGenerating,
  lastError,
  lastResponse,
  onUseGenerated,
}: GenerativeInputProps) {
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [includeComments, setIncludeComments] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && !isGenerating) {
      onGenerate(description.trim(), {
        temperature,
        includeComments,
      });
    }
  };

  const examplePrompts = [
    'A tube clamp ring for a 200mm telescope tube with 6 mounting holes',
    'A spider vane assembly with 4 vanes for a 250mm tube',
    'A focuser drawtube for 2 inch eyepieces with keyway slot',
    'A Losmandy-style dovetail bar, 250mm long with 6 mounting slots',
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900">Generate from Description</h2>
        </div>
        <p className="text-sm text-gray-600">
          Describe the telescope part you want to create, and AI will generate the CAD model.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Part Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the telescope part you want to create..."
            rows={4}
            disabled={isGenerating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />

          {/* Advanced Options */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature: {temperature.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include explanatory comments in generated code
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!description.trim() || isGenerating}
            className={`
              mt-4 w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2
              transition-colors
              ${
                description.trim() && !isGenerating
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Model
              </>
            )}
          </button>
        </form>

        {/* Example Prompts */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Example Prompts</h3>
          <div className="space-y-2">
            {examplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setDescription(prompt)}
                disabled={isGenerating}
                className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">Generation Failed</h4>
                <p className="text-sm text-red-700">{lastError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Response Display */}
        {lastResponse && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Generated Model</span>
              </div>
              {onUseGenerated && (
                <button
                  onClick={() => onUseGenerated(lastResponse)}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Use This Model
                </button>
              )}
            </div>

            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {lastResponse.templateName}
              </h4>
              <p className="text-sm text-gray-600 mb-3">{lastResponse.description}</p>

              {lastResponse.reasoning && (
                <div className="mb-3 p-3 bg-blue-50 rounded">
                  <h5 className="text-xs font-semibold text-blue-800 mb-1">Reasoning</h5>
                  <p className="text-xs text-blue-700">{lastResponse.reasoning}</p>
                </div>
              )}

              <details className="mt-3">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  View Generated Code
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                  <code>{lastResponse.cadScript}</code>
                </pre>
              </details>

              <details className="mt-2">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  View Parameters
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  <code>{JSON.stringify(lastResponse.paramSchema, null, 2)}</code>
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-600">
          Powered by GPT-4. Generated code runs in a sandboxed environment. Always review before use.
        </p>
      </div>
    </div>
  );
}
