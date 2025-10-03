'use client';

import { useMemo } from 'react';

interface SimpleBarChartProps {
  data: Record<string, unknown>;
  width?: number;
  height?: number;
  maxBars?: number;
}

export function SimpleBarChart({ 
  data, 
  width = 400, 
  height = 200, 
  maxBars = 8 
}: SimpleBarChartProps) {
  const chartData = useMemo(() => {
    if (!data || typeof data !== 'object') {
      return [];
    }

    // Convert object to array of key-value pairs
    const entries = Object.entries(data);
    
    // Filter out non-numeric values and limit to maxBars
    const numericEntries = entries
      .filter(([, value]) => {
        const numValue = Number(value);
        return !isNaN(numValue) && isFinite(numValue);
      })
      .slice(0, maxBars);

    if (numericEntries.length === 0) {
      return [];
    }

    // Find min and max values for scaling
    const values = numericEntries.map(([, value]) => Number(value));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;

    // If all values are the same, set a small range to avoid division by zero
    const adjustedRange = range === 0 ? 1 : range;

    return numericEntries.map(([key, value]) => {
      const numValue = Number(value);
      const normalizedValue = (numValue - minValue) / adjustedRange;
      const barHeight = Math.max(normalizedValue * (height - 40), 4); // Minimum 4px height
      
      return {
        key: key.length > 12 ? key.substring(0, 12) + '...' : key,
        value: numValue,
        normalizedValue,
        barHeight,
        displayValue: numValue.toLocaleString()
      };
    });
  }, [data, maxBars, height]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No numeric data available for visualization
        </p>
      </div>
    );
  }

  const barWidth = Math.max((width - 40) / chartData.length - 4, 20);

  return (
    <div className="w-full">
      <div className="mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Data Visualization (First Row)
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing numeric values from the first data record
        </p>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
        <svg width={width} height={height} className="w-full h-auto">
          {/* Background */}
          <rect
            width={width}
            height={height}
            fill="transparent"
            className="text-gray-100 dark:text-gray-800"
          />
          
          {/* Bars */}
          {chartData.map((item, index) => {
            const x = 20 + index * (barWidth + 4);
            const y = height - 20 - item.barHeight;
            
            return (
              <g key={item.key}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={item.barHeight}
                  fill="currentColor"
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  rx="2"
                />
                
                {/* Value label on top of bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 dark:fill-gray-300"
                >
                  {item.displayValue}
                </text>
                
                {/* Key label at bottom */}
                <text
                  x={x + barWidth / 2}
                  y={height - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  transform={`rotate(-45, ${x + barWidth / 2}, ${height - 5})`}
                >
                  {item.key}
                </text>
              </g>
            );
          })}
          
          {/* Y-axis line */}
          <line
            x1="15"
            y1="20"
            x2="15"
            y2={height - 20}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-400 dark:text-gray-500"
          />
          
          {/* X-axis line */}
          <line
            x1="15"
            y1={height - 20}
            x2={width - 5}
            y2={height - 20}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-400 dark:text-gray-500"
          />
        </svg>
        
        {/* Legend */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <p>Showing {chartData.length} numeric fields from the first data record</p>
        </div>
      </div>
    </div>
  );
}
