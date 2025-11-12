import { useState } from "react";
import { useProcedures, type Procedure } from "@/hooks/use-design-kb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Clock, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";

const PROCEDURE_TYPES = ["assembly", "collimation", "test", "maintenance", "safety"];

function ProcedureCard({ procedure, onClick }: { procedure: Procedure; onClick: () => void }) {
  const typeColors = {
    assembly: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    collimation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    test: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    safety: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={onClick}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{procedure.title}</h3>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            <span className={`text-xs px-2 py-1 rounded ${typeColors[procedure.type as keyof typeof typeColors] || 'bg-gray-100'}`}>
              {procedure.type}
            </span>
            {procedure.estimatedTimeMin && (
              <span className="text-xs px-2 py-1 rounded bg-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {procedure.estimatedTimeMin} min
              </span>
            )}
            {procedure.hazardsMd && (
              <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Hazards
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {procedure.steps.length} steps
            {procedure.tools && procedure.tools.length > 0 && ` • ${procedure.tools.length} tools required`}
          </p>
        </div>
        <Wrench className="w-5 h-5 text-muted-foreground" />
      </div>
    </Card>
  );
}

function ProcedureDetail({ procedure, onClose }: { procedure: Procedure; onClose: () => void }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-2xl font-bold">{procedure.title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {procedure.estimatedTimeMin && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="w-4 h-4" />
          Estimated time: {procedure.estimatedTimeMin} minutes
        </div>
      )}

      {procedure.hazardsMd && (
        <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 mb-4">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">Safety Hazards</h3>
              <div className="prose dark:prose-invert prose-sm mt-2 text-red-800 dark:text-red-200">
                <ReactMarkdown>{procedure.hazardsMd}</ReactMarkdown>
              </div>
            </div>
          </div>
        </Card>
      )}

      {procedure.tools && procedure.tools.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Required Tools</h3>
          <div className="flex gap-2 flex-wrap">
            {procedure.tools.map((tool, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-muted">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="prose dark:prose-invert max-w-none mb-6">
        <ReactMarkdown>{procedure.bodyMd}</ReactMarkdown>
      </div>

      <div>
        <h3 className="font-medium mb-3">Steps</h3>
        <div className="space-y-3">
          {procedure.steps.map((step, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {step.order}
                </div>
                <div className="flex-1">
                  <p>{step.description}</p>
                  {step.safety_note && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span className="text-yellow-900 dark:text-yellow-100">{step.safety_note}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ProceduresViewer() {
  const [procedureType, setProcedureType] = useState<string>("");
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);

  const { data, isLoading, error } = useProcedures({
    type: procedureType || undefined,
    limit: 50,
  });

  const procedures = data?.data || [];

  if (selectedProcedure) {
    return (
      <ProcedureDetail
        procedure={selectedProcedure}
        onClose={() => setSelectedProcedure(null)}
      />
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Procedures</h2>
      <p className="text-muted-foreground mb-6">
        Step-by-step guides for assembly, collimation, testing, and maintenance.
      </p>

      <div className="space-y-4">
        {/* Filters */}
        <Card className="p-4">
          <div className="max-w-xs">
            <Select value={procedureType || undefined} onValueChange={setProcedureType}>
              <SelectTrigger>
                <SelectValue placeholder="All Procedure Types" />
              </SelectTrigger>
              <SelectContent>
                {PROCEDURE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {procedureType && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs mt-2"
                onClick={() => setProcedureType("")}
              >
                Clear filter
              </Button>
            )}
          </div>
        </Card>

        {/* Procedures List */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 h-24 animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading procedures</p>
          </Card>
        )}

        {!isLoading && !error && procedures.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No procedures found.</p>
          </Card>
        )}

        {!isLoading && !error && procedures.length > 0 && (
          <div className="space-y-3">
            {procedures.map((procedure) => (
              <ProcedureCard
                key={procedure.id}
                procedure={procedure}
                onClick={() => setSelectedProcedure(procedure)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
