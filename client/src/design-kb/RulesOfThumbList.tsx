import { useState } from "react";
import { useRulesOfThumb, type RuleOfThumb } from "@/hooks/use-design-kb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lightbulb, Tag, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";

function RuleCard({ rule }: { rule: RuleOfThumb }) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown>{rule.statementMd}</ReactMarkdown>
          </div>
          {rule.contextMd && (
            <div className="mt-2 text-sm text-muted-foreground prose dark:prose-invert prose-sm max-w-none">
              <ReactMarkdown>{rule.contextMd}</ReactMarkdown>
            </div>
          )}
          {rule.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {rule.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-muted flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function RulesOfThumbList() {
  const [tagFilter, setTagFilter] = useState("");

  const { data, isLoading, error } = useRulesOfThumb({
    tag: tagFilter || undefined,
    limit: 100,
  });

  const rules = data?.data || [];

  // Extract all unique tags from rules
  const allTags = Array.from(
    new Set(rules.flatMap((rule) => rule.tags))
  ).sort();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Rules of Thumb</h2>
      <p className="text-muted-foreground mb-6">
        Quick design heuristics and practical guidelines for telescope building.
      </p>

      <div className="space-y-4">
        {/* Tag Filter */}
        {allTags.length > 0 && (
          <Card className="p-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by tag..."
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            {tagFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs mt-2"
                onClick={() => setTagFilter("")}
              >
                Clear filter
              </Button>
            )}
            <div className="flex gap-2 flex-wrap mt-3">
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    tagFilter === tag
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Rules List */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 h-24 animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading rules of thumb</p>
          </Card>
        )}

        {!isLoading && !error && rules.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No rules of thumb found.</p>
          </Card>
        )}

        {!isLoading && !error && rules.length > 0 && (
          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
