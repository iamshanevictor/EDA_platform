'use server';

import { createClient } from '@/lib/supabase/server';
import { getCachedData, setCachedData } from '@/lib/cache';

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
  // Check cache first
  const cacheKey = `dataset_${datasetId}_page_${page}_size_${pageSize}`;
  const cachedData = getCachedData<DatasetDataResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const supabase = await createClient();
  
  try {
    // Get total count first
    const { error: countError } = await supabase
      .from('datasets')
      .select('data', { count: 'exact', head: true })
      .eq('id', datasetId)
      .single();

    if (countError) {
      throw new Error(`Failed to get dataset count: ${countError.message}`);
    }

    // Fetch the full dataset
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
    const totalRows = csvData.length;
    
    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = csvData.slice(startIndex, endIndex);
    const hasMore = endIndex < totalRows;

    const result = {
      data: paginatedData,
      totalRows,
      hasMore
    };

    // Cache the result for 5 minutes
    setCachedData(cacheKey, result, 5 * 60 * 1000);

    return result;
  } catch (error) {
    console.error('Error fetching dataset data:', error);
    throw error;
  }
}

export async function getDatasetSample(
  datasetId: number, 
  sampleSize: number = 1000
): Promise<Record<string, unknown>[]> {
  // Check cache first
  const cacheKey = `dataset_${datasetId}_sample_${sampleSize}`;
  const cachedData = getCachedData<Record<string, unknown>[]>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const supabase = await createClient();
  
  try {
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
    
    // Return a random sample for better performance
    if (csvData.length <= sampleSize) {
      return csvData;
    }

    // Simple random sampling
    const shuffled = [...csvData].sort(() => 0.5 - Math.random());
    const result = shuffled.slice(0, sampleSize);
    
    // Cache the result for 10 minutes (samples change less frequently)
    setCachedData(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  } catch (error) {
    console.error('Error fetching dataset sample:', error);
    throw error;
  }
}
