'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HistogramChartProps {
  data: Record<string, unknown>[];
  numericColumns: string[];
  maxColumns?: number;
}

export function HistogramChart({ data, numericColumns, maxColumns = 4 }: HistogramChartProps) {
  const histogramData = useMemo(() => {
    if (!data || data.length === 0 || numericColumns.length === 0) {
      return [];
    }

    const columnsToShow = numericColumns.slice(0, maxColumns);
    const bins = 10; // Number of bins for histogram

    return columnsToShow.map(column => {
      const values = data
        .map(row => Number(row[column]))
        .filter(val => !isNaN(val) && isFinite(val));

      if (values.length === 0) return null;

      const min = Math.min(...values);
      const max = Math.max(...values);
      const binWidth = (max - min) / bins;

      const histogram = Array.from({ length: bins }, (_, i) => {
        const binStart = min + i * binWidth;
        const binEnd = min + (i + 1) * binWidth;
        const count = values.filter(val => val >= binStart && (i === bins - 1 ? val <= binEnd : val < binEnd)).length;
        
        return {
          range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
          count,
          binStart,
          binEnd
        };
      });

      return {
        column,
        histogram,
        stats: {
          min,
          max,
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          count: values.length
        }
      };
    }).filter(Boolean);
  }, [data, numericColumns, maxColumns]);

  if (histogramData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No numeric data available for histogram
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {histogramData.map((item) => {
        if (!item) return null;
        const { column, histogram, stats } = item;
        return (
        <div key={column} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {column} Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Count:</span>
                <div className="font-medium">{stats.count}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Mean:</span>
                <div className="font-medium">{stats.mean.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Min:</span>
                <div className="font-medium">{stats.min.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Max:</span>
                <div className="font-medium">{stats.max.toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, 'Count']}
                  labelFormatter={(label) => `Range: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        );
      })}
    </div>
  );
}
