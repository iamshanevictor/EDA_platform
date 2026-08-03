'use server';

import { createClient } from '@/lib/supabase/server';
import { requireDatasetId, requirePage, requirePageSize } from '@/lib/security/identifiers';

export interface DatasetDataResponse {
  data: Record<string, unknown>[];
  totalRows: number;
  hasMore: boolean;
}

export async function getDatasetData(
  datasetId: number, 
  page: number = 1, 
  pageSize: number = 1000
): Promise<DatasetDataResponse> {
  requireDatasetId(datasetId);
  requirePage(page);
  requirePageSize(pageSize);

  const supabase = await createClient();
  
  try {
    // Fetch the full dataset
    const { data: dataset, error } = await supabase
      .from('datasets')
      .select('data')
      .eq('id', datasetId)
      .single();

    if (error) {
      throw new Error('Dataset data is unavailable');
    }

    if (!dataset || !dataset.data) {
      throw new Error('No data found for this dataset');
    }

    const csvData = dataset.data as Record<string, unknown>[];
    const totalRows = csvData.length;
    
    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = csvData.slice(startIndex, endIndex);
    const hasMore = endIndex < totalRows;

    return {
      data: paginatedData,
      totalRows,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching dataset data');
    throw error instanceof Error ? error : new Error('Dataset data is unavailable');
  }
}

export async function getDatasetSample(
  datasetId: number, 
  sampleSize: number = 1000
): Promise<Record<string, unknown>[]> {
  requireDatasetId(datasetId);
  requirePageSize(sampleSize);

  const supabase = await createClient();
  
  try {
    const { data: dataset, error } = await supabase
      .from('datasets')
      .select('data')
      .eq('id', datasetId)
      .single();

    if (error) {
      throw new Error('Dataset sample is unavailable');
    }

    if (!dataset || !dataset.data) {
      throw new Error('No data found for this dataset');
    }

    const csvData = dataset.data as Record<string, unknown>[];
    
    // Return a random sample for better performance
    if (csvData.length <= sampleSize) {
      return csvData;
    }

    // Simple random sampling
    const shuffled = [...csvData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  } catch (error) {
    console.error('Error fetching dataset sample');
    throw error instanceof Error ? error : new Error('Dataset sample is unavailable');
  }
}
