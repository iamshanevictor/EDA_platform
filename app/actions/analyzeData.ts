'use server';

import { createClient } from '@/lib/supabase/server';
import { type AnalysisResult } from '@/lib/analysis/analyzeDataset';
import { requireDatasetId } from '@/lib/security/identifiers';

export async function getAnalysis(datasetId: number): Promise<AnalysisResult | null> {
  requireDatasetId(datasetId);
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
    throw new Error('Analysis is unavailable');
  }

  return {
    summary_stats: data.summary_stats,
    missing_values: data.missing_values,
    column_types: data.column_types,
    correlation_matrix: data.correlation_matrix
  };
}
