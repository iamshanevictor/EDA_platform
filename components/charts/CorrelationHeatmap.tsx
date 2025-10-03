'use client';

import { useMemo } from 'react';
// Recharts imports removed as this component uses custom heatmap implementation

interface CorrelationHeatmapProps {
  correlationMatrix: Record<string, Record<string, number>>;
  numericColumns: string[];
}

export function CorrelationHeatmap({ correlationMatrix, numericColumns }: CorrelationHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!correlationMatrix || numericColumns.length === 0) {
      return [];
    }

    const data = [];
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = 0; j < numericColumns.length; j++) {
        const xCol = numericColumns[i];
        const yCol = numericColumns[j];
        const correlation = correlationMatrix[xCol]?.[yCol] || 0;
        
        data.push({
          x: i,
          y: j,
          xLabel: xCol,
          yLabel: yCol,
          correlation,
          value: correlation
        });
      }
    }

    return data;
  }, [correlationMatrix, numericColumns]);

  const getColorIntensity = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.8) return 'bg-red-500';
    if (abs > 0.6) return 'bg-orange-500';
    if (abs > 0.4) return 'bg-yellow-500';
    if (abs > 0.2) return 'bg-green-500';
    return 'bg-gray-300';
  };

  const getTextColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    return abs > 0.5 ? 'text-white' : 'text-gray-900 dark:text-gray-100';
  };

  if (numericColumns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No numeric columns available for correlation heatmap
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Correlation Heatmap
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pearson correlation coefficients between numeric variables
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="w-full">
        <div className="w-full">
          {/* Header row with column names */}
          <div className="flex">
            <div className="w-24 h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {/* Empty corner cell */}
            </div>
            {numericColumns.map((col) => (
              <div 
                key={col} 
                className="flex-1 min-w-24 h-12 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300"
                title={col}
              >
                <span className="truncate max-w-full">{col}</span>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {numericColumns.map((rowCol, rowIndex) => (
            <div key={rowCol} className="flex">
              {/* Row label */}
              <div className="w-24 h-8 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300" title={rowCol}>
                <span className="truncate max-w-full">{rowCol}</span>
              </div>
              
              {/* Correlation values */}
              {numericColumns.map((colCol, colIndex) => {
                const correlation = correlationMatrix[rowCol]?.[colCol] || 0;
                const isDiagonal = rowIndex === colIndex;
                
                return (
                  <div
                    key={`${rowCol}-${colCol}`}
                    className={`flex-1 min-w-24 h-8 flex items-center justify-center text-xs font-medium border border-gray-200 dark:border-gray-700 ${
                      isDiagonal 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                        : `${getColorIntensity(correlation)} ${getTextColor(correlation)}`
                    }`}
                    title={`${rowCol} vs ${colCol}: ${correlation.toFixed(3)}`}
                  >
                    {isDiagonal ? '1.00' : correlation.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Strong (|r| &gt; 0.8)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>Moderate (|r| &gt; 0.6)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Weak (|r| &gt; 0.4)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Very Weak (|r| ≤ 0.4)</span>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="font-semibold text-gray-900 dark:text-white">
            {numericColumns.length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Variables</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="font-semibold text-gray-900 dark:text-white">
            {heatmapData.filter(d => Math.abs(d.correlation) > 0.7).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Strong Correlations</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="font-semibold text-gray-900 dark:text-white">
            {heatmapData.filter(d => Math.abs(d.correlation) > 0.3 && Math.abs(d.correlation) <= 0.7).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Moderate Correlations</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="font-semibold text-gray-900 dark:text-white">
            {heatmapData.filter(d => Math.abs(d.correlation) <= 0.3).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Weak Correlations</div>
        </div>
      </div>
    </div>
  );
}
