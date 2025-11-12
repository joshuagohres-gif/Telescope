import { useState } from "react";
import { useConcepts, useConcept, type Concept } from "@/hooks/use-design-kb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, BookOpen, Tag, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CATEGORIES = [
  "optics",
  "mechanics",
  "mount",
  "assembly",
  "collimation",
  "testing",
  "safety",
  "printing",
  "materials",
  "fasteners",
];

const DIFFICULTIES = ["intro", "intermediate", "advanced"];

function ConceptCard({ concept, onSelect, isSelected }: {
  concept: Concept;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const difficultyColors = {
    intro: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{concept.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{concept.summary}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded ${difficultyColors[concept.difficulty]}`}>
              {concept.difficulty}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
              {concept.category}
            </span>
            {concept.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-muted flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
        <BookOpen className="w-5 h-5 text-muted-foreground" />
      </div>
    </Card>
  );
}

function ConceptDetailPanel({ conceptId, onClose }: { conceptId: number; onClose: () => void }) {
  const { data, isLoading, error } = useConcept(conceptId);

  if (isLoading) {
    return (
      <Card className="p-6 h-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive">Failed to load concept details</p>
      </Card>
    );
  }

  const concept = data.data;

  return (
    <Card className="p-6 h-full overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-2xl font-bold">{concept.title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{concept.bodyMd}</ReactMarkdown>
      </div>

      {concept.tags.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Tags</h3>
          <div className="flex gap-2 flex-wrap">
            {concept.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-muted flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function ConceptLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [selectedConceptId, setSelectedConceptId] = useState<number | null>(null);

  const { data, isLoading, error } = useConcepts({
    q: searchQuery || undefined,
    category: category || undefined,
    difficulty: difficulty || undefined,
    limit: 50,
  });

  const concepts = data?.data || [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Design Concept Library</h2>
      <p className="text-muted-foreground mb-6">
        Browse and search telescope design concepts, principles, and knowledge.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Filters + Concept List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Select value={category || undefined} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {category && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setCategory("")}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <Select value={difficulty || undefined} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff} value={diff}>
                        {diff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {difficulty && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setDifficulty("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Concept List */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4 h-32 animate-pulse bg-muted" />
              ))}
            </div>
          )}

          {error && (
            <Card className="p-8 text-center">
              <p className="text-destructive">Error loading concepts</p>
            </Card>
          )}

          {!isLoading && !error && concepts.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No concepts found matching your filters.</p>
            </Card>
          )}

          {!isLoading && !error && concepts.length > 0 && (
            <div className="space-y-3">
              {concepts.map((concept) => (
                <ConceptCard
                  key={concept.id}
                  concept={concept}
                  onSelect={() => setSelectedConceptId(concept.id)}
                  isSelected={selectedConceptId === concept.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Concept Details */}
        <div className="lg:col-span-1">
          {selectedConceptId ? (
            <ConceptDetailPanel
              conceptId={selectedConceptId}
              onClose={() => setSelectedConceptId(null)}
            />
          ) : (
            <Card className="p-8 text-center text-muted-foreground sticky top-4">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a concept to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
