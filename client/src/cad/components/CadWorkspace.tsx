/**
 * CAD Workspace Component
 *
 * Main workspace integrating template browser, parameter editor, generative input, and 3D viewer.
 */

import { useState } from 'react';
import { Layers, Sparkles, Settings, FileCode } from 'lucide-react';
import { TemplateBrowser } from './TemplateBrowser';
import { ParameterEditor } from './ParameterEditor';
import { GenerativeInput } from './GenerativeInput';
import { CadViewer } from '../viewer/CadViewer';
import { CADClient } from '../client/cad-client';
import type { TemplateInfo } from '../templates';
import type { GenerativeResponse } from '../generative/llm-bridge';
import type { MeshData } from '../viewer/cad-scene';

type WorkspaceMode = 'templates' | 'generative' | 'custom';
type SidePanel = 'browser' | 'editor' | 'generative' | null;

interface ActiveModel {
  templateInfo?: TemplateInfo;
  cadScript: string;
  paramSchema: any;
  params: Record<string, any>;
  meshData?: MeshData;
}

export function CadWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>('templates');
  const [sidePanel, setSidePanel] = useState<SidePanel>('browser');
  const [activeModel, setActiveModel] = useState<ActiveModel | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | undefined>();
  const [lastGenerativeResponse, setLastGenerativeResponse] = useState<GenerativeResponse | undefined>();

  const [cadClient] = useState(() => new CADClient({ enableLogging: true }));

  const handleSelectTemplate = async (template: TemplateInfo) => {
    setActiveModel({
      templateInfo: template,
      cadScript: template.cadScript,
      paramSchema: template.paramSchema,
      params: template.suggestedParams,
    });
    setSidePanel('editor');
    await buildModel(template.cadScript, template.suggestedParams);
  };

  const buildModel = async (cadScript: string, params: Record<string, any>) => {
    try {
      setIsBuilding(true);
      setBuildError(undefined);

      console.log('[CadWorkspace] Building model with params:', params);

      const result = await cadClient.buildModel(cadScript, params, {
        linearDeflection: 0.1,
        angularDeflection: 0.5,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      console.log('[CadWorkspace] Build successful:', result);

      const meshData: MeshData = {
        vertices: new Float32Array(result.mesh),
        edges: result.edges ? new Float32Array(result.edges) : undefined,
      };

      setActiveModel((prev) =>
        prev
          ? {
              ...prev,
              meshData,
            }
          : null
      );
    } catch (error: any) {
      console.error('[CadWorkspace] Build error:', error);
      setBuildError(error.message || 'Failed to build model');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleParamsChange = (params: Record<string, any>, isValid: boolean) => {
    if (activeModel) {
      setActiveModel({
        ...activeModel,
        params,
      });
    }
  };

  const handleRebuild = async () => {
    if (activeModel) {
      await buildModel(activeModel.cadScript, activeModel.params);
    }
  };

  const handleGenerate = async (description: string, options?: any) => {
    try {
      setIsBuilding(true);
      setBuildError(undefined);

      console.log('[CadWorkspace] Generating model from description:', description);

      const response = await fetch('/api/cad/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed');
      }

      const { data } = await response.json();
      setLastGenerativeResponse(data);

      console.log('[CadWorkspace] Generation successful:', data.templateName);
    } catch (error: any) {
      console.error('[CadWorkspace] Generation error:', error);
      setBuildError(error.message || 'Failed to generate model');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleUseGeneratedModel = async (response: GenerativeResponse) => {
    setActiveModel({
      cadScript: response.cadScript,
      paramSchema: response.paramSchema,
      params: response.suggestedParams,
    });
    setSidePanel('editor');
    setMode('custom');
    await buildModel(response.cadScript, response.suggestedParams);
  };

  const renderSidePanel = () => {
    switch (sidePanel) {
      case 'browser':
        return <TemplateBrowser onSelectTemplate={handleSelectTemplate} />;

      case 'editor':
        if (!activeModel) return null;
        return (
          <ParameterEditor
            schema={activeModel.paramSchema}
            initialParams={activeModel.params}
            onParamsChange={handleParamsChange}
            onRebuild={handleRebuild}
            isBuilding={isBuilding}
          />
        );

      case 'generative':
        return (
          <GenerativeInput
            onGenerate={handleGenerate}
            isGenerating={isBuilding}
            lastError={buildError}
            lastResponse={lastGenerativeResponse}
            onUseGenerated={handleUseGeneratedModel}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Side Panel */}
      <div className="w-96 bg-white border-r overflow-hidden flex flex-col">
        {/* Mode Selector */}
        <div className="flex border-b">
          <button
            onClick={() => {
              setMode('templates');
              setSidePanel('browser');
            }}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
              mode === 'templates'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="font-medium">Templates</span>
          </button>
          <button
            onClick={() => {
              setMode('generative');
              setSidePanel('generative');
            }}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
              mode === 'generative'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Generate</span>
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">{renderSidePanel()}</div>

        {/* Active Model Info */}
        {activeModel && (
          <div className="p-3 border-t bg-gray-50">
            <div className="text-xs font-medium text-gray-500 mb-1">Active Model</div>
            <div className="text-sm font-medium text-gray-900">
              {activeModel.templateInfo?.name || 'Custom Model'}
            </div>
            {activeModel.templateInfo?.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {activeModel.templateInfo.description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900">CAD Workspace</h1>
            {activeModel && sidePanel !== 'editor' && (
              <button
                onClick={() => setSidePanel('editor')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Parameters
              </button>
            )}
          </div>

          {buildError && (
            <div className="text-sm text-red-600 flex items-center gap-2">
              <span>{buildError}</span>
            </div>
          )}

          {isBuilding && (
            <div className="text-sm text-blue-600 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span>Building...</span>
            </div>
          )}
        </div>

        {/* Viewer */}
        <div className="flex-1 relative">
          {activeModel?.meshData ? (
            <CadViewer
              meshData={activeModel.meshData}
              config={{
                enableGrid: true,
                enableAxes: true,
                backgroundColor: 0xf5f5f5,
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No Model Loaded</p>
                <p className="text-sm">
                  {mode === 'templates'
                    ? 'Select a template to get started'
                    : 'Describe a telescope part to generate'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
