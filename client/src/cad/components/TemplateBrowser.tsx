/**
 * Template Browser Component
 *
 * Browse and select from available CAD templates.
 */

import { useState, useMemo } from 'react';
import { Search, Tag, Grid, List } from 'lucide-react';
import { ALL_TEMPLATES, getAllTags, searchTemplates, findTemplatesByTag } from '../templates';
import type { TemplateInfo } from '../templates';

interface TemplateBrowserProps {
  onSelectTemplate: (template: TemplateInfo) => void;
}

type ViewMode = 'grid' | 'list';

export function TemplateBrowser({ onSelectTemplate }: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const allTags = useMemo(() => getAllTags(), []);

  const filteredTemplates = useMemo(() => {
    let templates = ALL_TEMPLATES;

    // Filter by search query
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Filter by selected tags
    if (selectedTags.size > 0) {
      templates = templates.filter((t) =>
        Array.from(selectedTags).every((tag) => t.tags.includes(tag))
      );
    }

    return templates;
  }, [searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">CAD Templates</h2>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tag Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`
                px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${
                  selectedTags.has(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Tag className="inline w-3 h-3 mr-1" />
              {tag}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">No templates found</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onClick={onSelectTemplate} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <TemplateListItem key={template.id} template={template} onClick={onSelectTemplate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: TemplateInfo;
  onClick: (template: TemplateInfo) => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={() => onClick(template)}
      className="text-left bg-white border rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-500"
    >
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded mb-3 flex items-center justify-center">
        <span className="text-blue-600 font-semibold text-sm">Preview</span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

      <div className="flex flex-wrap gap-1">
        {template.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

function TemplateListItem({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={() => onClick(template)}
      className="w-full text-left bg-white border rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-500 flex gap-4"
    >
      {/* Thumbnail placeholder */}
      <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
        <span className="text-blue-600 font-semibold text-xs">Preview</span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
