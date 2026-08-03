'use server';

import { createClient } from '@/lib/supabase/server';
import { requireDatasetId } from '@/lib/security/identifiers';
import { revalidatePath } from 'next/cache';

export async function deleteDataset(datasetId: number): Promise<{ success: boolean; message: string }> {
  requireDatasetId(datasetId);
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
    const { data: deletedDataset, error: datasetError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId)
      .select('id')
      .maybeSingle();

    if (datasetError) {
      throw new Error('Dataset deletion failed');
    }

    if (!deletedDataset) {
      return {
        success: false,
        message: 'Dataset not found or already expired'
      };
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
      message: 'Failed to delete dataset'
    };
  }
}
