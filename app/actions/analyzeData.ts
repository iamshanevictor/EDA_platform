'use server';

import { createClient } from '@/lib/supabase/server';
import {
  analyzeDatasetData,
  type AnalysisResult,
} from '@/lib/analysis/analyzeDataset';

export async function analyzeData(datasetId: number): Promise<AnalysisResult> {
  const supabase = await createClient();
  
  // Fetch the dataset data from the database
  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('data')
    .eq('id', datasetId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch dataset: ${error.message}`);
  }

  if (!dataset || !dataset.data) {
    throw new Error('No data found for this dataset');
  }

  const csvData = dataset.data as Record<string, unknown>[];
  
  return analyzeDatasetData(csvData);
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
