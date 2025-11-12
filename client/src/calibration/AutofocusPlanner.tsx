import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Thermometer, TrendingUp, Search } from "lucide-react";

interface FocusPoint {
  temperature: number;
  focusPosition: number;
  timestamp: string;
}

interface FocusPrediction {
  predictedPosition: number;
  temperature: number;
  confidence: number;
  historicalPoints: FocusPoint[];
  slope: number;
  intercept: number;
}

export function AutofocusPlanner() {
  const [temperature, setTemperature] = useState<string>("");
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: prediction, isLoading, error } = useQuery<FocusPrediction>({
    queryKey: ["/api/calibration/focus-prediction", temperature],
    queryFn: async () => {
      const res = await fetch(
        `/astrodb/v1/calibration/focus-prediction?temperature=${temperature}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch focus prediction");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: shouldFetch && temperature !== "",
  });

  const handlePredict = () => {
    if (temperature) {
      setShouldFetch(true);
    }
  };

  function getConfidenceLevel(confidence: number): { label: string; color: string } {
    if (confidence >= 0.9) return { label: "Very High", color: "bg-green-500" };
    if (confidence >= 0.7) return { label: "High", color: "bg-blue-500" };
    if (confidence >= 0.5) return { label: "Medium", color: "bg-yellow-500" };
    return { label: "Low", color: "bg-red-500" };
  }

  // Calculate chart dimensions and scaling
  const chartWidth = 600;
  const chartHeight = 400;
  const padding = 50;
  const innerWidth = chartWidth - 2 * padding;
  const innerHeight = chartHeight - 2 * padding;

  let chartData = null;
  if (prediction && prediction.historicalPoints.length > 0) {
    const temps = prediction.historicalPoints.map((p) => p.temperature);
    const positions = prediction.historicalPoints.map((p) => p.focusPosition);

    const minTemp = Math.min(...temps, prediction.temperature);
    const maxTemp = Math.max(...temps, prediction.temperature);
    const minPos = Math.min(...positions, prediction.predictedPosition);
    const maxPos = Math.max(...positions, prediction.predictedPosition);

    const tempRange = maxTemp - minTemp || 10;
    const posRange = maxPos - minPos || 1000;

    // Add some padding to ranges
    const tempMin = minTemp - tempRange * 0.1;
    const tempMax = maxTemp + tempRange * 0.1;
    const posMin = minPos - posRange * 0.1;
    const posMax = maxPos + posRange * 0.1;

    const scaleX = (temp: number) => padding + ((temp - tempMin) / (tempMax - tempMin)) * innerWidth;
    const scaleY = (pos: number) => chartHeight - padding - ((pos - posMin) / (posMax - posMin)) * innerHeight;

    // Generate regression line points
    const linePoints = [
      { temp: tempMin, pos: prediction.slope * tempMin + prediction.intercept },
      { temp: tempMax, pos: prediction.slope * tempMax + prediction.intercept },
    ];

    chartData = {
      tempMin,
      tempMax,
      posMin,
      posMax,
      scaleX,
      scaleY,
      linePoints,
      points: prediction.historicalPoints.map((p) => ({
        x: scaleX(p.temperature),
        y: scaleY(p.focusPosition),
        temp: p.temperature,
        pos: p.focusPosition,
        timestamp: p.timestamp,
      })),
      predictedPoint: {
        x: scaleX(prediction.temperature),
        y: scaleY(prediction.predictedPosition),
        temp: prediction.temperature,
        pos: prediction.predictedPosition,
      },
    };
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Autofocus Planner</h2>
          <p className="text-sm text-muted-foreground">
            Predict optimal focus position based on temperature and historical data
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                placeholder="Enter temperature"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePredict()}
              />
            </div>
            <Button onClick={handlePredict} disabled={!temperature} className="gap-2">
              <Search className="w-4 h-4" />
              Predict Focus
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Calculating focus prediction...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-destructive">
            Error: {error instanceof Error ? error.message : "Failed to predict focus"}
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Thermometer className="w-4 h-4" />
                    Temperature
                  </div>
                  <div className="text-2xl font-bold">{prediction.temperature}°C</div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    Predicted Position
                  </div>
                  <div className="text-2xl font-bold">{Math.round(prediction.predictedPosition)}</div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Confidence</div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConfidenceLevel(prediction.confidence).color}>
                      {getConfidenceLevel(prediction.confidence).label}
                    </Badge>
                    <span className="text-lg font-semibold">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Chart */}
            {chartData && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Focus vs Temperature</h3>
                <div className="flex justify-center">
                  <svg width={chartWidth} height={chartHeight} className="border rounded">
                    {/* Grid lines */}
                    <g opacity="0.2">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const y = padding + (i * innerHeight) / 4;
                        return (
                          <line
                            key={`grid-h-${i}`}
                            x1={padding}
                            y1={y}
                            x2={chartWidth - padding}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        );
                      })}
                      {[0, 1, 2, 3, 4].map((i) => {
                        const x = padding + (i * innerWidth) / 4;
                        return (
                          <line
                            key={`grid-v-${i}`}
                            x1={x}
                            y1={padding}
                            x2={x}
                            y2={chartHeight - padding}
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </g>

                    {/* Axes */}
                    <line
                      x1={padding}
                      y1={chartHeight - padding}
                      x2={chartWidth - padding}
                      y2={chartHeight - padding}
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1={padding}
                      y1={padding}
                      x2={padding}
                      y2={chartHeight - padding}
                      stroke="currentColor"
                      strokeWidth="2"
                    />

                    {/* Regression line */}
                    <line
                      x1={chartData.scaleX(chartData.linePoints[0].temp)}
                      y1={chartData.scaleY(chartData.linePoints[0].pos)}
                      x2={chartData.scaleX(chartData.linePoints[1].temp)}
                      y2={chartData.scaleY(chartData.linePoints[1].pos)}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />

                    {/* Historical points */}
                    {chartData.points.map((point, i) => (
                      <circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="#6366f1"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <title>
                          {point.temp}°C → {Math.round(point.pos)} (
                          {new Date(point.timestamp).toLocaleDateString()})
                        </title>
                      </circle>
                    ))}

                    {/* Predicted point */}
                    <circle
                      cx={chartData.predictedPoint.x}
                      cy={chartData.predictedPoint.y}
                      r="7"
                      fill="#22c55e"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <title>
                        Predicted: {chartData.predictedPoint.temp}°C → {Math.round(chartData.predictedPoint.pos)}
                      </title>
                    </circle>

                    {/* Axis labels */}
                    <text
                      x={chartWidth / 2}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className="text-sm fill-current"
                    >
                      Temperature (°C)
                    </text>
                    <text
                      x={15}
                      y={chartHeight / 2}
                      textAnchor="middle"
                      transform={`rotate(-90, 15, ${chartHeight / 2})`}
                      className="text-sm fill-current"
                    >
                      Focus Position
                    </text>

                    {/* Axis tick labels */}
                    <text
                      x={padding}
                      y={chartHeight - padding + 20}
                      textAnchor="middle"
                      className="text-xs fill-current"
                    >
                      {chartData.tempMin.toFixed(1)}
                    </text>
                    <text
                      x={chartWidth - padding}
                      y={chartHeight - padding + 20}
                      textAnchor="middle"
                      className="text-xs fill-current"
                    >
                      {chartData.tempMax.toFixed(1)}
                    </text>
                    <text
                      x={padding - 10}
                      y={chartHeight - padding}
                      textAnchor="end"
                      className="text-xs fill-current"
                    >
                      {Math.round(chartData.posMin)}
                    </text>
                    <text
                      x={padding - 10}
                      y={padding}
                      textAnchor="end"
                      className="text-xs fill-current"
                    >
                      {Math.round(chartData.posMax)}
                    </text>
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white"></div>
                    <span>Historical Data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                    <span>Predicted Position</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-blue-500" style={{ borderTop: "2px dashed" }}></div>
                    <span>Trend Line</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Model Information */}
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Model Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Slope:</span>{" "}
                    <span className="font-mono">{prediction.slope.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Intercept:</span>{" "}
                    <span className="font-mono">{prediction.intercept.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Historical Points:</span>{" "}
                    <span className="font-semibold">{prediction.historicalPoints.length}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
}
