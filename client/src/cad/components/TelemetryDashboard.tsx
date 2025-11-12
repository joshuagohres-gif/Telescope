/**
 * Telemetry Dashboard Component
 *
 * Displays performance metrics, cache stats, and error logs.
 */

import { useState, useEffect } from 'react';
import { Activity, Database, Zap, AlertCircle, Download } from 'lucide-react';
import { getTelemetry } from '../telemetry/metrics';
import { getMeshCache } from '../cache/mesh-cache';

export function TelemetryDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const telemetry = getTelemetry();
  const cache = getMeshCache();

  const loadMetrics = async () => {
    const summaryData = telemetry.getSummary();
    const cacheData = await cache.getStats();
    const recentErrors = telemetry.getRecentErrors(10);

    setSummary(summaryData);
    setCacheStats(cacheData);
    setErrors(recentErrors);
  };

  useEffect(() => {
    loadMetrics();

    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleExport = () => {
    const data = telemetry.exportJSON();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cad-telemetry-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClearCache = async () => {
    await cache.clear();
    await loadMetrics();
  };

  const handleClearMetrics = () => {
    telemetry.clear();
    loadMetrics();
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Telemetry Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">Performance metrics and diagnostics</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<Zap className="w-5 h-5 text-blue-600" />}
          title="Total Builds"
          value={summary.totalBuilds}
          subtitle={`Avg: ${summary.averageBuildTime.toFixed(0)}ms`}
        />

        <MetricCard
          icon={<Database className="w-5 h-5 text-green-600" />}
          title="Cache Hit Rate"
          value={`${(summary.cacheHitRate * 100).toFixed(1)}%`}
          subtitle={`${cacheStats.entryCount} entries`}
        />

        <MetricCard
          icon={<Activity className="w-5 h-5 text-purple-600" />}
          title="Average FPS"
          value={summary.averageFPS.toFixed(0)}
          subtitle="Viewer performance"
        />

        <MetricCard
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          title="Total Errors"
          value={summary.totalErrors}
          subtitle={errors.length > 0 ? 'View below' : 'No errors'}
        />
      </div>

      {/* Cache Stats */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cache Statistics</h3>
          <button
            onClick={handleClearCache}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
          >
            Clear Cache
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Entries</div>
            <div className="text-2xl font-bold text-gray-900">{cacheStats.entryCount}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Total Size</div>
            <div className="text-2xl font-bold text-gray-900">
              {cacheStats.totalSizeMB.toFixed(2)} MB
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Oldest Entry</div>
            <div className="text-sm font-medium text-gray-700">
              {cacheStats.oldestEntry
                ? new Date(cacheStats.oldestEntry).toLocaleString()
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Generation Stats */}
      {summary.totalGenerations > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Generative AI Statistics
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Generations</div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalGenerations}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {(summary.generationSuccessRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {errors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
            <button
              onClick={handleClearMetrics}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
            >
              Clear Metrics
            </button>
          </div>

          <div className="space-y-2">
            {errors.map((error, i) => (
              <div
                key={i}
                className="border-l-4 border-red-500 bg-red-50 p-3 rounded-r"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800">{error.errorType}</div>
                    <div className="text-sm text-red-700 mt-1">{error.message}</div>
                    <div className="text-xs text-red-600 mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
}

function MetricCard({ icon, title, value, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <div className="text-sm font-medium text-gray-600">{title}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}
