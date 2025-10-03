'use server';

import { createClient } from '@/lib/supabase/server';

interface AnalysisResult {
  summary_stats: Record<string, Record<string, number | string | { value: string; count: number }[]>>;
  missing_values: Record<string, number>;
  column_types: Record<string, string>;
  correlation_matrix: Record<string, Record<string, number>>;
}

export async function analyzeData(datasetId: number, csvData: Record<string, unknown>[]): Promise<AnalysisResult> {
  if (!csvData || csvData.length === 0) {
    throw new Error('No data provided for analysis');
  }

  const columns = Object.keys(csvData[0]);
  const summaryStats: Record<string, Record<string, number | string | { value: string; count: number }[]>> = {};
  const missingValues: Record<string, number> = {};
  const columnTypes: Record<string, string> = {};
  const correlationMatrix: Record<string, Record<string, number>> = {};

  // Initialize correlation matrix
  columns.forEach(col => {
    correlationMatrix[col] = {};
    columns.forEach(otherCol => {
      correlationMatrix[col][otherCol] = 0;
    });
  });

  // Analyze each column
  columns.forEach(column => {
    const values = csvData.map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');
    const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
    
    // Count missing values
    missingValues[column] = csvData.length - nonNullValues.length;
    
    // Determine column type
    if (nonNullValues.length === 0) {
      columnTypes[column] = 'empty';
    } else {
      const firstValue = nonNullValues[0];
      if (typeof firstValue === 'number' || !isNaN(Number(firstValue))) {
        columnTypes[column] = 'numeric';
      } else if (typeof firstValue === 'boolean') {
        columnTypes[column] = 'boolean';
      } else if (firstValue instanceof Date || !isNaN(Date.parse(String(firstValue)))) {
        columnTypes[column] = 'date';
      } else {
        columnTypes[column] = 'text';
      }
    }

    // Calculate summary statistics for numeric columns
    if (columnTypes[column] === 'numeric') {
      const numericValues = nonNullValues.map(val => Number(val)).filter(val => !isNaN(val));
      
      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        const mean = sum / numericValues.length;
        const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
        const stdDev = Math.sqrt(variance);
        
        summaryStats[column] = {
          count: numericValues.length,
          mean: Number(mean.toFixed(4)),
          median: sorted.length % 2 === 0 
            ? Number(((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(4))
            : Number(sorted[Math.floor(sorted.length / 2)].toFixed(4)),
          std_dev: Number(stdDev.toFixed(4)),
          min: Number(Math.min(...numericValues).toFixed(4)),
          max: Number(Math.max(...numericValues).toFixed(4)),
          q1: Number(sorted[Math.floor(sorted.length * 0.25)].toFixed(4)),
          q3: Number(sorted[Math.floor(sorted.length * 0.75)].toFixed(4)),
          range: Number((Math.max(...numericValues) - Math.min(...numericValues)).toFixed(4))
        };
      }
    } else if (columnTypes[column] === 'text') {
      // Text column statistics
      const textValues = nonNullValues.map(val => String(val));
      const uniqueValues = [...new Set(textValues)];
      const valueCounts: Record<string, number> = {};
      textValues.forEach(val => {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
      
      summaryStats[column] = {
        count: textValues.length,
        unique_count: uniqueValues.length,
        most_common: Object.entries(valueCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([value, count]) => ({ value, count })),
        avg_length: Number((textValues.reduce((acc, val) => acc + val.length, 0) / textValues.length).toFixed(2))
      };
    } else if (columnTypes[column] === 'boolean') {
      const booleanValues = nonNullValues.map(val => Boolean(val));
      const trueCount = booleanValues.filter(val => val === true).length;
      
      summaryStats[column] = {
        count: booleanValues.length,
        true_count: trueCount,
        false_count: booleanValues.length - trueCount,
        true_percentage: Number(((trueCount / booleanValues.length) * 100).toFixed(2))
      };
    }
  });

  // Calculate correlation matrix for numeric columns
  const numericColumns = columns.filter(col => columnTypes[col] === 'numeric');
  
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = 0; j < numericColumns.length; j++) {
      const col1 = numericColumns[i];
      const col2 = numericColumns[j];
      
      if (col1 === col2) {
        correlationMatrix[col1][col2] = 1;
      } else {
        const values1 = csvData.map(row => Number(row[col1])).filter(val => !isNaN(val));
        const values2 = csvData.map(row => Number(row[col2])).filter(val => !isNaN(val));
        
        if (values1.length > 0 && values2.length > 0) {
          const correlation = calculateCorrelation(values1, values2);
          correlationMatrix[col1][col2] = Number(correlation.toFixed(4));
        }
      }
    }
  }

  return {
    summary_stats: summaryStats,
    missing_values: missingValues,
    column_types: columnTypes,
    correlation_matrix: correlationMatrix
  };
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((acc, val) => acc + val, 0);
  const sumY = ySlice.reduce((acc, val) => acc + val, 0);
  const sumXY = xSlice.reduce((acc, val, i) => acc + val * ySlice[i], 0);
  const sumX2 = xSlice.reduce((acc, val) => acc + val * val, 0);
  const sumY2 = ySlice.reduce((acc, val) => acc + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

export async function saveAnalysis(datasetId: number, analysis: AnalysisResult): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('dataset_analyses')
    .insert({
      dataset_id: datasetId,
      summary_stats: analysis.summary_stats,
      missing_values: analysis.missing_values,
      column_types: analysis.column_types,
      correlation_matrix: analysis.correlation_matrix
    });

  if (error) {
    throw new Error(`Failed to save analysis: ${error.message}`);
  }
}

export async function getAnalysis(datasetId: number): Promise<AnalysisResult | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('dataset_analyses')
    .select('*')
    .eq('dataset_id', datasetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No analysis found
    }
    throw new Error(`Failed to get analysis: ${error.message}`);
  }

  return {
    summary_stats: data.summary_stats,
    missing_values: data.missing_values,
    column_types: data.column_types,
    correlation_matrix: data.correlation_matrix
  };
}
