'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteDataset(datasetId: number): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  
  try {
    // First, delete the analysis data (if it exists)
    const { error: analysisError } = await supabase
      .from('dataset_analyses')
      .delete()
      .eq('dataset_id', datasetId);

    if (analysisError) {
      console.error('Error deleting analysis:', analysisError);
      // Continue with dataset deletion even if analysis deletion fails
    }

    // Then, delete the dataset
    const { error: datasetError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId);

    if (datasetError) {
      throw new Error(`Failed to delete dataset: ${datasetError.message}`);
    }

    // Revalidate the data page to refresh the UI
    revalidatePath('/data');

    return {
      success: true,
      message: 'Dataset deleted successfully'
    };

  } catch (error) {
    console.error('Delete dataset error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete dataset'
    };
  }
}
