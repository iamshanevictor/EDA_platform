'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HistogramChart } from './charts/HistogramChart';
import { ScatterPlot } from './charts/ScatterPlot';
import { CorrelationHeatmap } from './charts/CorrelationHeatmap';
import { MissingValuesChart } from './charts/MissingValuesChart';
import { BarChart2, ScatterChart as ScatterIcon, Grid, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface AdvancedChartsProps {
  data: Record<string, unknown>[];
  analysis: {
    summary_stats: Record<string, Record<string, number | string | { value: string; count: number }[]>>;
    missing_values: Record<string, number>;
    column_types: Record<string, string>;
    correlation_matrix: Record<string, Record<string, number>>;
  };
}

export function AdvancedCharts({ data, analysis }: AdvancedChartsProps) {
  const [visibleCharts, setVisibleCharts] = useState({
    histogram: true,
    scatter: true,
    correlation: true,
    missing: true
  });

  const numericColumns = Object.keys(analysis.column_types).filter(
    col => analysis.column_types[col] === 'numeric'
  );

  const toggleChart = (chartType: keyof typeof visibleCharts) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chartType]: !prev[chartType]
    }));
  };

  const chartButtons = [
    { key: 'histogram', label: 'Histograms', icon: BarChart2, color: 'blue' },
    { key: 'scatter', label: 'Scatter Plots', icon: ScatterIcon, color: 'green' },
    { key: 'correlation', label: 'Correlation', icon: Grid, color: 'purple' },
    { key: 'missing', label: 'Missing Values', icon: AlertTriangle, color: 'red' }
  ] as const;

  // Determine if we have many columns for space optimization
  const hasManyColumns = Object.keys(analysis.column_types).length > 10;
  const hasManyNumericColumns = numericColumns.length > 6;

  return (
    <div className="space-y-4">
      {/* Compact Chart Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Advanced Visualizations
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {data.length} records • {Object.keys(analysis.column_types).length} columns • {numericColumns.length} numeric
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Compact Chart Toggle Controls */}
          <div className="flex flex-wrap gap-2">
            {chartButtons.map(({ key, label, icon: Icon, color }) => (
              <Button
                key={key}
                variant={visibleCharts[key] ? "default" : "outline"}
                size="sm"
                onClick={() => toggleChart(key)}
                className={`flex items-center gap-1 text-xs px-3 py-1 ${
                  visibleCharts[key] 
                    ? `bg-${color}-600 hover:bg-${color}-700 text-white` 
                    : ''
                }`}
              >
                {visibleCharts[key] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimized Visualization Grid */}
      <div className={`grid gap-4 ${hasManyColumns ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
        {/* Histogram Charts */}
        {visibleCharts.histogram && (
          <Card className={hasManyColumns ? 'w-full' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Distribution Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {numericColumns.length > 0 ? (
                <HistogramChart 
                  data={data} 
                  numericColumns={numericColumns} 
                  maxColumns={hasManyNumericColumns ? 6 : 4}
                />
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  No numeric columns available for histogram analysis
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Scatter Plots */}
        {visibleCharts.scatter && (
          <Card className={hasManyColumns ? 'w-full' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScatterIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                Relationship Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {numericColumns.length >= 2 ? (
                <ScatterPlot 
                  data={data} 
                  numericColumns={numericColumns} 
                  maxPlots={hasManyNumericColumns ? 8 : 6}
                />
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  Need at least 2 numeric columns for scatter plot analysis
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Correlation Heatmap */}
        {visibleCharts.correlation && (
          <Card className={hasManyColumns ? 'w-full' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Grid className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Correlation Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {numericColumns.length > 1 ? (
                <CorrelationHeatmap 
                  correlationMatrix={analysis.correlation_matrix} 
                  numericColumns={numericColumns}
                />
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                  Need at least 2 numeric columns for correlation analysis
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Missing Values Chart */}
        {visibleCharts.missing && (
          <Card className={hasManyColumns ? 'w-full' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                Data Quality Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MissingValuesChart 
                missingValues={analysis.missing_values} 
                totalRecords={data.length}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* No Charts Visible Message */}
      {!Object.values(visibleCharts).some(Boolean) && (
        <Card>
          <CardContent className="text-center py-8">
            <EyeOff className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              All Charts Hidden
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Use the toggle buttons above to show specific visualizations
            </p>
            <Button 
              size="sm"
              onClick={() => setVisibleCharts({
                histogram: true,
                scatter: true,
                correlation: true,
                missing: true
              })}
            >
              Show All Charts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
