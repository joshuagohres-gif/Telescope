import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

interface TelescopeDesign {
  aperture_mm: number;
  focal_ratio: number;
  focal_length_mm: number;
  type: string;
  obstruction_pct?: number;
  focuser_type?: string;
}

interface ValidationResult {
  category: string;
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
    detail?: string;
  }[];
}

export function DesignValidator({
  design,
  onComplete,
}: {
  design: TelescopeDesign;
  onComplete: () => void;
}) {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Simulate validation process
    setTimeout(() => {
      const validationResults = validateDesign(design);
      setResults(validationResults);
      setIsValidating(false);
    }, 1500);
  }, [design]);

  const allPassed = results.every((category) =>
    category.checks.every((check) => check.status === "pass")
  );
  const hasWarnings = results.some((category) =>
    category.checks.some((check) => check.status === "warn")
  );
  const hasFailed = results.some((category) =>
    category.checks.some((check) => check.status === "fail")
  );

  if (isValidating) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Validating Design...</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Running physics checks and feasibility analysis
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className={`p-6 ${
        hasFailed ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" :
        hasWarnings ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800" :
        "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
      }`}>
        <div className="flex items-start gap-3">
          {hasFailed ? (
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          ) : hasWarnings ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {hasFailed ? "Design Has Issues" : hasWarnings ? "Design Has Warnings" : "Design Validated!"}
            </h3>
            <p className="text-sm mt-1 opacity-90">
              {hasFailed
                ? "Some critical issues need to be addressed before proceeding"
                : hasWarnings
                ? "Design is feasible but has some warnings to consider"
                : "All checks passed - design is ready to build!"}
            </p>
          </div>
        </div>
      </Card>

      {/* Validation Results */}
      {results.map((category, i) => (
        <Card key={i} className="p-4">
          <h4 className="font-semibold mb-3">{category.category}</h4>
          <div className="space-y-2">
            {category.checks.map((check, j) => (
              <div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {check.status === "pass" && (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                {check.status === "warn" && (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                {check.status === "fail" && (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">{check.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {check.message}
                  </div>
                  {check.detail && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      {check.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={onComplete}
          disabled={hasFailed}
          className="flex-1"
        >
          {hasFailed ? "Fix Issues First" : "Continue to Complete"}
        </Button>
        {hasFailed && (
          <Button variant="outline" className="flex-1">
            Back to Refinement
          </Button>
        )}
      </div>
    </div>
  );
}

function validateDesign(design: TelescopeDesign): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Optical Validation
  const opticalChecks = [];

  // Focal ratio check
  if (design.focal_ratio < 4) {
    opticalChecks.push({
      name: "Focal Ratio",
      status: "warn" as const,
      message: `f/${design.focal_ratio} is very fast - requires excellent optics and precise collimation`,
      detail: "Fast scopes are more sensitive to optical imperfections. Consider f/5 or slower for easier construction.",
    });
  } else if (design.focal_ratio > 12) {
    opticalChecks.push({
      name: "Focal Ratio",
      status: "warn" as const,
      message: `f/${design.focal_ratio} is very slow - will result in a long tube`,
      detail: "Slower scopes are easier optically but less portable. Great for planets though!",
    });
  } else {
    opticalChecks.push({
      name: "Focal Ratio",
      status: "pass" as const,
      message: `f/${design.focal_ratio} is a good all-around focal ratio`,
      detail: "Balanced between portability and optical performance.",
    });
  }

  // Aperture size check
  if (design.aperture_mm < 100) {
    opticalChecks.push({
      name: "Aperture",
      status: "warn" as const,
      message: "Small aperture limits light gathering and resolution",
      detail: "Consider 150mm+ for better deep-sky performance.",
    });
  } else if (design.aperture_mm > 300) {
    opticalChecks.push({
      name: "Aperture",
      status: "warn" as const,
      message: "Large aperture - consider portability and cool-down time",
      detail: "Large mirrors take longer to reach thermal equilibrium.",
    });
  } else {
    opticalChecks.push({
      name: "Aperture",
      status: "pass" as const,
      message: `${design.aperture_mm}mm provides excellent light gathering`,
      detail: "Good balance of performance and portability.",
    });
  }

  // Resolution calculation
  const dawesLimit = 116 / design.aperture_mm;
  opticalChecks.push({
    name: "Resolution",
    status: "pass" as const,
    message: `Dawes limit: ${dawesLimit.toFixed(2)}" - can resolve fine detail`,
    detail: "Theoretical resolution assuming perfect optics and good seeing.",
  });

  results.push({
    category: "Optical Performance",
    checks: opticalChecks,
  });

  // Mechanical Validation
  const mechanicalChecks = [];

  const tubeLength = design.focal_length_mm;
  if (tubeLength > 1500) {
    mechanicalChecks.push({
      name: "Tube Length",
      status: "warn" as const,
      message: `${tubeLength}mm tube may be difficult to transport`,
      detail: "Consider collapsible or truss tube design for portability.",
    });
  } else {
    mechanicalChecks.push({
      name: "Tube Length",
      status: "pass" as const,
      message: `${tubeLength}mm tube is manageable`,
    });
  }

  // Obstruction check (for reflectors)
  if (design.type === "newtonian" || design.type === "dobsonian") {
    const obstruction = design.obstruction_pct || 20;
    if (obstruction > 30) {
      mechanicalChecks.push({
        name: "Central Obstruction",
        status: "fail" as const,
        message: `${obstruction}% obstruction is too high - reduces contrast significantly`,
        detail: "Aim for under 25% linear obstruction (6.25% by area).",
      });
    } else if (obstruction > 20) {
      mechanicalChecks.push({
        name: "Central Obstruction",
        status: "warn" as const,
        message: `${obstruction}% obstruction is moderate - some contrast loss`,
        detail: "Acceptable for deep-sky, but not ideal for planetary.",
      });
    } else {
      mechanicalChecks.push({
        name: "Central Obstruction",
        status: "pass" as const,
        message: `${obstruction}% obstruction maintains good contrast`,
      });
    }
  }

  results.push({
    category: "Mechanical Design",
    checks: mechanicalChecks,
  });

  // Practical Considerations
  const practicalChecks = [];

  // Weight estimate (rough)
  const estimatedWeight = design.aperture_mm * design.aperture_mm * 0.001 + design.focal_length_mm * 0.01;
  if (estimatedWeight > 25) {
    practicalChecks.push({
      name: "Weight",
      status: "warn" as const,
      message: `Estimated ~${estimatedWeight.toFixed(1)}kg - consider motorized mount`,
      detail: "Heavy scopes benefit from tracking mounts or Dobsonian rockers.",
    });
  } else {
    practicalChecks.push({
      name: "Weight",
      status: "pass" as const,
      message: `Estimated ~${estimatedWeight.toFixed(1)}kg - portable`,
    });
  }

  // Cost estimate
  const baseCost = design.aperture_mm * 1.5 + design.focal_length_mm * 0.1;
  practicalChecks.push({
    name: "Estimated Cost",
    status: "pass" as const,
    message: `Approximately $${baseCost.toFixed(0)}-${(baseCost * 1.5).toFixed(0)} for materials`,
    detail: "Actual cost depends on mirror quality, focuser choice, and mount type.",
  });

  results.push({
    category: "Practical Considerations",
    checks: practicalChecks,
  });

  return results;
}
