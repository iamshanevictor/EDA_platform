'use server';

import { createClient } from '@/lib/supabase/server';

export interface ReportData {
  dataset: {
    id: number;
    file_name: string;
    file_size: number;
    created_at: string;
    data: Record<string, unknown>[];
  };
  analysis: {
    summary_stats: Record<string, Record<string, number | string | { value: string; count: number }[]>>;
    missing_values: Record<string, number>;
    column_types: Record<string, string>;
    correlation_matrix: Record<string, Record<string, number>>;
  };
  insights: {
    data_quality_score: number;
    key_findings: string[];
    recommendations: string[];
    top_correlations: Array<{ pair: string; value: number }>;
    data_overview: {
      total_records: number;
      total_columns: number;
      numeric_columns: number;
      text_columns: number;
      missing_data_percentage: number;
    };
  };
}

export async function generateReportData(datasetId: number): Promise<ReportData> {
  const supabase = await createClient();
  
  // Fetch dataset
  const { data: dataset, error: datasetError } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', datasetId)
    .single();

  if (datasetError) {
    throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
  }

  if (!dataset) {
    throw new Error('Dataset not found');
  }

  // Fetch analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('dataset_analyses')
    .select('*')
    .eq('dataset_id', datasetId)
    .single();

  if (analysisError) {
    throw new Error(`Failed to fetch analysis: ${analysisError.message}`);
  }

  if (!analysis) {
    throw new Error('Analysis not found for this dataset');
  }

  // Generate insights
  const insights = generateInsights(dataset, analysis);

  return {
    dataset,
    analysis,
    insights
  };
}

function generateInsights(dataset: { data: Record<string, unknown>[] }, analysis: { column_types: Record<string, string>; missing_values: Record<string, number>; correlation_matrix: Record<string, Record<string, number>> }) {
  const data = dataset.data as Record<string, unknown>[];
  const totalRecords = data.length;
  const totalColumns = Object.keys(analysis.column_types).length;
  const numericColumns = Object.values(analysis.column_types).filter(type => type === 'numeric').length;
  const textColumns = Object.values(analysis.column_types).filter(type => type === 'text').length;
  
  // Calculate missing data percentage
  const totalMissing = Object.values(analysis.missing_values).reduce((sum: number, count: number) => sum + count, 0);
  const totalCells = totalRecords * totalColumns;
  const missingDataPercentage = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;

  // Calculate data quality score (0-100)
  const completenessScore = Math.max(0, 100 - missingDataPercentage);
  const diversityScore = Math.min(100, (numericColumns / totalColumns) * 100 + (textColumns / totalColumns) * 50);
  const dataQualityScore = Math.round((completenessScore + diversityScore) / 2);

  // Find top correlations
  const correlations: Array<{ pair: string; value: number }> = [];
  const numericCols = Object.keys(analysis.column_types).filter(col => analysis.column_types[col] === 'numeric');
  
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const col1 = numericCols[i];
      const col2 = numericCols[j];
      const correlation = analysis.correlation_matrix[col1]?.[col2] || 0;
      if (Math.abs(correlation) > 0.3) {
        correlations.push({
          pair: `${col1} ↔ ${col2}`,
          value: correlation
        });
      }
    }
  }
  
  correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  // Generate key findings
  const keyFindings: string[] = [];
  
  if (missingDataPercentage > 10) {
    keyFindings.push(`Data completeness: ${(100 - missingDataPercentage).toFixed(1)}% of data is complete`);
  } else {
    keyFindings.push(`Excellent data quality: ${(100 - missingDataPercentage).toFixed(1)}% data completeness`);
  }
  
  if (numericColumns > 0) {
    keyFindings.push(`${numericColumns} numeric columns available for statistical analysis`);
  }
  
  if (correlations.length > 0) {
    const strongestCorrelation = correlations[0];
    keyFindings.push(`Strongest correlation: ${strongestCorrelation.pair} (${strongestCorrelation.value.toFixed(3)})`);
  }
  
  if (totalRecords > 1000) {
    keyFindings.push(`Large dataset with ${totalRecords.toLocaleString()} records`);
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (missingDataPercentage > 5) {
    recommendations.push('Consider data imputation strategies for missing values');
  }
  
  if (numericColumns >= 2) {
    recommendations.push('Perform correlation analysis to identify relationships between variables');
  }
  
  if (textColumns > 0) {
    recommendations.push('Consider text analysis or categorization for text columns');
  }
  
  if (totalRecords > 10000) {
    recommendations.push('Consider sampling techniques for large-scale analysis');
  }

  return {
    data_quality_score: dataQualityScore,
    key_findings: keyFindings,
    recommendations: recommendations,
    top_correlations: correlations.slice(0, 5),
    data_overview: {
      total_records: totalRecords,
      total_columns: totalColumns,
      numeric_columns: numericColumns,
      text_columns: textColumns,
      missing_data_percentage: missingDataPercentage
    }
  };
}
