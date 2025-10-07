'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisResults } from '@/components/AnalysisResults';
import { AdvancedCharts } from '@/components/AdvancedCharts';
import { ReportGenerator } from '@/components/ReportGenerator';
import { DataChatbot } from '@/components/DataChatbot';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { deleteDataset } from '@/app/actions/deleteDataset';
import { getDatasetData, getDatasetSample } from '@/app/actions/getDatasetData';
import { Loader2, Trash2 } from 'lucide-react';

interface Dataset {
  id: number;
  file_name: string;
  file_size: number;
  created_at: string;
  data?: Record<string, unknown>[];
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

interface OptimizedDatasetTabsProps {
  datasets: DatasetWithAnalysis[];
}

export function OptimizedDatasetTabs({ datasets }: OptimizedDatasetTabsProps) {
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(
    datasets.length > 0 ? datasets[0].id : null
  );
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<DatasetWithAnalysis | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeDataset = datasets.find(d => d.id === activeDatasetId);

  const handleDeleteClick = (dataset: DatasetWithAnalysis) => {
    setDatasetToDelete(dataset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDatasetToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!datasetToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteDataset(datasetToDelete.id);
      if (result.success) {
        // Remove from local state
        const updatedDatasets = datasets.filter(d => d.id !== datasetToDelete.id);
        if (updatedDatasets.length > 0) {
          setActiveDatasetId(updatedDatasets[0].id);
        } else {
          setActiveDatasetId(null);
        }
        setDeleteDialogOpen(false);
        setDatasetToDelete(null);
      } else {
        alert(`Failed to delete dataset: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting dataset:', error);
      alert('An error occurred while deleting the dataset');
    } finally {
      setIsDeleting(false);
    }
  };

  if (datasets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No datasets uploaded yet. Go to the Upload page to add your first dataset.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dataset Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {datasets.map((dataset) => (
          <Button
            key={dataset.id}
            variant={activeDatasetId === dataset.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveDatasetId(dataset.id)}
            className="flex items-center gap-2"
          >
            <span className="truncate max-w-32">{dataset.file_name}</span>
            <span className="text-xs opacity-70">({(dataset.file_size / 1024).toFixed(0)}KB)</span>
            {dataset.analysis && (
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            )}
          </Button>
        ))}
      </div>

      {/* Active Dataset Content */}
      {activeDataset && (
        <OptimizedDatasetContent 
          dataset={activeDataset} 
          onDeleteClick={handleDeleteClick}
        />
      )}

      {/* Chatbot Toggle (Managed by DataChatbot component) */}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        datasetName={datasetToDelete?.file_name || ''}
        isDeleting={isDeleting}
      />

      {/* Data Chatbot */}
      {activeDatasetId && (
        <DataChatbot
          datasetId={activeDatasetId}
          isOpen={chatbotOpen}
          onToggle={() => setChatbotOpen(!chatbotOpen)}
        />
      )}
    </div>
  );
}

// Optimized dataset content component with lazy loading
function OptimizedDatasetContent({ 
  dataset, 
  onDeleteClick 
}: { 
  dataset: DatasetWithAnalysis;
  onDeleteClick: (dataset: DatasetWithAnalysis) => void;
}) {
  const [datasetData, setDatasetData] = useState<Record<string, unknown>[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataPage, setDataPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // Load data lazily when component mounts or dataset changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Use sample data for initial load (better performance)
        const sampleData = await getDatasetSample(dataset.id, 1000);
        setDatasetData(sampleData);
        
        // Get total count for display
        const fullData = await getDatasetData(dataset.id, 1, 1);
        setTotalRows(fullData.totalRows);
        setHasMoreData(fullData.hasMore);
      } catch (error) {
        console.error('Error loading dataset data:', error);
        // Fallback to existing data if available
        if (dataset.data) {
          setDatasetData(dataset.data);
          setTotalRows(dataset.data.length);
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [dataset.id, dataset.data]);

  const loadMoreData = async () => {
    if (!hasMoreData) return;
    
    setIsLoadingData(true);
    try {
      const nextPage = dataPage + 1;
      const result = await getDatasetData(dataset.id, nextPage, 1000);
      setDatasetData(prev => prev ? [...prev, ...result.data] : result.data);
      setDataPage(nextPage);
      setHasMoreData(result.hasMore);
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const dataPreview = datasetData ? datasetData.slice(0, 3) : [];

  return (
    <div className="space-y-4">
      {/* Dataset Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="truncate">{dataset.file_name}</span>
            <div className="flex items-center space-x-2">
              {dataset.analysis && (
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs rounded-full">
                  Analyzed
                </span>
              )}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ID: {dataset.id}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteClick(dataset)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Uploaded: {new Date(dataset.created_at).toLocaleString()} | 
            Size: {(dataset.file_size / 1024).toFixed(2)} KB | 
            Records: {totalRows > 0 ? totalRows.toLocaleString() : 'Loading...'}
          </div>
        </CardHeader>
      </Card>

      {/* Detailed Analysis Results */}
      {dataset.analysis ? (
        <AnalysisResults analysis={dataset.analysis} datasetData={datasetData || undefined} />
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No analysis available for this dataset. Re-upload the file to generate analysis and visualizations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Charts - Only render if we have data */}
      {dataset.analysis && datasetData && (
        <AdvancedCharts data={datasetData} analysis={dataset.analysis} />
      )}

      {/* Report Generator */}
      {dataset.analysis && (
        <ReportGenerator 
          datasetId={dataset.id} 
          datasetName={dataset.file_name} 
        />
      )}
      
      {/* Raw Data Preview with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Data Preview</span>
            <div className="flex items-center gap-2">
              {totalRows > 0 && (
                <span className="text-sm text-gray-500">
                  Showing {datasetData?.length || 0} of {totalRows.toLocaleString()} records
                </span>
              )}
              {hasMoreData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMoreData}
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingData && !datasetData ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading data...</span>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4 overflow-auto max-h-64">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {JSON.stringify(dataPreview, null, 2)}
              </pre>
            </div>
          )}
              {totalRows > 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Showing first 3 records. Use &quot;Load More&quot; to see additional data.
                </p>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
