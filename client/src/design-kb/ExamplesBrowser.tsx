import { useState } from "react";
import { useTelescopeExamples, type TelescopeExample } from "@/hooks/use-design-kb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Telescope, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const TELESCOPE_TYPES = ["newtonian", "dobsonian", "refractor", "sct", "maksutov"];

function ExampleCard({ example }: { example: TelescopeExample }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{example.title}</h3>
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
            <span>{example.apertureMm}mm</span>
            <span>f/{example.focalRatio}</span>
            <span>{example.focalLengthMm}mm FL</span>
          </div>

          {/* Feasibility Checks */}
          {example.feasibilityChecks && (
            <div className="mt-3 space-y-1">
              <FeasibilityIndicator
                label="Secondary Size"
                valid={example.feasibilityChecks.secondarySizeValid}
              />
              <FeasibilityIndicator
                label="Focuser Travel"
                valid={example.feasibilityChecks.focuserTravelValid}
              />
              <FeasibilityIndicator
                label="Obstruction"
                valid={example.feasibilityChecks.obstructionValid}
              />
            </div>
          )}

          {/* Key specs */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Type:</span> {example.telescopeType}
            </div>
            <div>
              <span className="text-muted-foreground">Focuser:</span> {example.focuserType}
            </div>
            {example.totalMassKg && (
              <div>
                <span className="text-muted-foreground">Mass:</span> {example.totalMassKg.toFixed(1)} kg
              </div>
            )}
            {example.obstructionPct && (
              <div>
                <span className="text-muted-foreground">Obstruction:</span> {example.obstructionPct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        <Telescope className="w-5 h-5 text-muted-foreground" />
      </div>
    </Card>
  );
}

function FeasibilityIndicator({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {valid ? (
        <CheckCircle className="w-3 h-3 text-green-600" />
      ) : (
        <XCircle className="w-3 h-3 text-red-600" />
      )}
      <span className={valid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
        {label}
      </span>
    </div>
  );
}

export function ExamplesBrowser() {
  const [telescopeType, setTelescopeType] = useState<string>("");

  const { data, isLoading, error } = useTelescopeExamples({
    type: telescopeType || undefined,
    limit: 50,
  });

  const examples = data?.data || [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Telescope Design Examples</h2>
      <p className="text-muted-foreground mb-6">
        Browse complete telescope designs with dimensions, BOMs, and feasibility checks.
      </p>

      <div className="space-y-4">
        {/* Filters */}
        <Card className="p-4">
          <div className="max-w-xs">
            <Select value={telescopeType || undefined} onValueChange={setTelescopeType}>
              <SelectTrigger>
                <SelectValue placeholder="All Telescope Types" />
              </SelectTrigger>
              <SelectContent>
                {TELESCOPE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {telescopeType && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs mt-2"
                onClick={() => setTelescopeType("")}
              >
                Clear filter
              </Button>
            )}
          </div>
        </Card>

        {/* Examples List */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 h-32 animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading examples</p>
          </Card>
        )}

        {!isLoading && !error && examples.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Telescope className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No telescope examples found.</p>
            <p className="text-sm mt-2">
              Design examples need to be seeded into the database.
            </p>
          </Card>
        )}

        {!isLoading && !error && examples.length > 0 && (
          <div className="space-y-3">
            {examples.map((example) => (
              <ExampleCard key={example.id} example={example} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
