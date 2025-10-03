'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScatterPlotProps {
  data: Record<string, unknown>[];
  numericColumns: string[];
  maxPlots?: number;
}

export function ScatterPlot({ data, numericColumns, maxPlots = 6 }: ScatterPlotProps) {
  const scatterData = useMemo(() => {
    if (!data || data.length === 0 || numericColumns.length < 2) {
      return [];
    }

    const plots = [];
    const columnsToUse = numericColumns.slice(0, Math.min(numericColumns.length, 4));

    // Generate scatter plots for all pairs of numeric columns
    for (let i = 0; i < columnsToUse.length; i++) {
      for (let j = i + 1; j < columnsToUse.length; j++) {
        if (plots.length >= maxPlots) break;
        
        const xColumn = columnsToUse[i];
        const yColumn = columnsToUse[j];
        
        const plotData = data
          .map(row => ({
            x: Number(row[xColumn]),
            y: Number(row[yColumn]),
            index: data.indexOf(row)
          }))
          .filter(point => !isNaN(point.x) && !isNaN(point.y) && isFinite(point.x) && isFinite(point.y));

        if (plotData.length > 0) {
          plots.push({
            xColumn,
            yColumn,
            data: plotData,
            correlation: calculateCorrelation(plotData.map(p => p.x), plotData.map(p => p.y))
          });
        }
      }
    }

    return plots;
  }, [data, numericColumns, maxPlots]);

  if (scatterData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need at least 2 numeric columns for scatter plots
        </p>
      </div>
    );
  }

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {scatterData.map((plot, index) => (
        <div key={`${plot.xColumn}-${plot.yColumn}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {plot.xColumn} vs {plot.yColumn}
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Points:</span>
                <span className="font-medium ml-1">{plot.data.length}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Correlation:</span>
                <span className={`font-medium ml-1 ${
                  Math.abs(plot.correlation) > 0.7 ? 'text-red-600 dark:text-red-400' :
                  Math.abs(plot.correlation) > 0.3 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {plot.correlation.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={plot.xColumn}
                  fontSize={12}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={plot.yColumn}
                  fontSize={12}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: number, name: string) => [value, name]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `${plot.xColumn}: ${payload[0].payload.x}, ${plot.yColumn}: ${payload[0].payload.y}`;
                    }
                    return '';
                  }}
                />
                <Scatter dataKey="y" fill={colors[index % colors.length]}>
                  {plot.data.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={colors[index % colors.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((acc, val) => acc + val, 0);
  const sumY = y.reduce((acc, val) => acc + val, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
  const sumY2 = y.reduce((acc, val) => acc + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}
