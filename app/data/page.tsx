import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleBarChart } from '@/components/SimpleBarChart';
import { Suspense } from 'react';

interface Dataset {
  id: number;
  file_name: string;
  file_size: number;
  created_at: string;
  data: Record<string, unknown>[];
}

// Loading component for individual dataset
function DatasetSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Optimized dataset component
function DatasetCard({ dataset }: { dataset: Dataset }) {
  const dataPreview = Array.isArray(dataset.data) 
    ? dataset.data.slice(0, 3) // Show only first 3 records for preview
    : dataset.data;

  // Get the first row for visualization
  const firstRowData = Array.isArray(dataset.data) && dataset.data.length > 0 
    ? dataset.data[0] 
    : null;

  return (
    <Card key={dataset.id} className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{dataset.file_name}</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ID: {dataset.id}
          </span>
        </CardTitle>
        <CardDescription>
          Uploaded: {new Date(dataset.created_at).toLocaleString()} | 
          Size: {(dataset.file_size / 1024).toFixed(2)} KB
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              File Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">File Name:</span>
                <p className="text-gray-600 dark:text-gray-400 truncate">{dataset.file_name}</p>
              </div>
              <div>
                <span className="font-medium">File Size:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {(dataset.file_size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <span className="font-medium">Records:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {Array.isArray(dataset.data) ? dataset.data.length : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Data Visualization */}
          {firstRowData && (
            <div>
              <SimpleBarChart 
                data={firstRowData} 
                width={400} 
                height={200} 
                maxBars={6}
              />
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Preview (First 3 records)
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4 overflow-auto max-h-64">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {JSON.stringify(dataPreview, null, 2)}
              </pre>
            </div>
            {Array.isArray(dataset.data) && dataset.data.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Showing 3 of {dataset.data.length} records. Full data available in database.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
            Data Viewer
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View uploaded CSV datasets
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Data Viewer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View uploaded CSV datasets ({datasets?.length || 0} records)
        </p>
      </div>

      {!datasets || datasets.length === 0 ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              No datasets have been uploaded yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Upload some CSV files from the dashboard to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <DatasetSkeleton key={i} />
            ))}
          </div>
        }>
          <div className="space-y-6">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </Suspense>
      )}
    </div>
  );
}