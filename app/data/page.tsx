import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatasetTabs } from '@/components/DatasetTabs';
import { getAnalysis } from '@/app/actions/analyzeData';

interface Dataset {
  id: number;
  file_name: string;
  file_size: number;
  created_at: string;
  data: Record<string, unknown>[];
}

interface Analysis {
  summary_stats: Record<string, Record<string, number | string | { value: string; count: number }[]>>;
  missing_values: Record<string, number>;
  column_types: Record<string, string>;
  correlation_matrix: Record<string, Record<string, number>>;
}

interface DatasetWithAnalysis extends Dataset {
  analysis?: Analysis | null;
}

export default async function DataPage() {
  const supabase = await createClient();
  
  // Fetch all records from the datasets table with limit for performance
  const { data: datasets, error } = await supabase
    .from('datasets')
    .select('id, file_name, file_size, created_at, data')
    .order('created_at', { ascending: false })
    .limit(50); // Limit to 50 most recent records for performance

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Data Viewer & EDA Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View uploaded CSV datasets with automated EDA analysis
          </p>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
            <CardDescription>
              There was an error fetching the datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-800 dark:text-red-200">
                Error: {error.message}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch analysis data for each dataset
  const datasetsWithAnalysis: DatasetWithAnalysis[] = await Promise.all(
    (datasets || []).map(async (dataset) => {
      try {
        const analysis = await getAnalysis(dataset.id);
        return { ...dataset, analysis };
      } catch (error) {
        console.error(`Error fetching analysis for dataset ${dataset.id}:`, error);
        return { ...dataset, analysis: null };
      }
    })
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Data Viewer & EDA Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View uploaded CSV datasets with automated EDA analysis ({datasetsWithAnalysis.length} datasets)
        </p>
      </div>

      <DatasetTabs datasets={datasetsWithAnalysis} />
    </div>
  );
}