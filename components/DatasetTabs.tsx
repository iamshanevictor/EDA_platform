'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisResults } from '@/components/AnalysisResults';
import { AdvancedCharts } from '@/components/AdvancedCharts';
import { ReportGenerator } from '@/components/ReportGenerator';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { DataChatbot } from '@/components/DataChatbot';
import { deleteDataset } from '@/app/actions/deleteDataset';
import { Trash2 } from 'lucide-react';

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

interface DatasetTabsProps {
  datasets: DatasetWithAnalysis[];
}

export function DatasetTabs({ datasets }: DatasetTabsProps) {
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(
    datasets.length > 0 ? datasets[0].id : null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<DatasetWithAnalysis | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const activeDataset = datasets.find(dataset => dataset.id === activeDatasetId);

  const handleDeleteClick = (dataset: DatasetWithAnalysis, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the dataset selection
    setDatasetToDelete(dataset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!datasetToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteDataset(datasetToDelete.id);
      
      if (result.success) {
        // If the deleted dataset was active, switch to another dataset
        if (activeDatasetId === datasetToDelete.id) {
          const remainingDatasets = datasets.filter(d => d.id !== datasetToDelete.id);
          setActiveDatasetId(remainingDatasets.length > 0 ? remainingDatasets[0].id : null);
        }
        
        // Close dialog and reset state
        setDeleteDialogOpen(false);
        setDatasetToDelete(null);
        
        // Show success message (you could add a toast notification here)
        alert('Dataset deleted successfully!');
      } else {
        alert(`Failed to delete dataset: ${result.message}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting the dataset');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDatasetToDelete(null);
  };

  if (datasets.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Upload some CSV files from the dashboard to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dataset Navigation Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Dataset</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click on a dataset to view its analysis
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {datasets.map((dataset) => {
              const isActive = dataset.id === activeDatasetId;
              const recordCount = Array.isArray(dataset.data) ? dataset.data.length : 0;
              
              return (
                <div
                  key={dataset.id}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                >
                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteClick(dataset, e)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200 z-10"
                    title="Delete dataset"
                  >
                    <Trash2 className="h-3 w-3 text-red-500 hover:text-red-700" />
                  </Button>
                  
                  {/* Dataset Card Content */}
                  <button
                    onClick={() => setActiveDatasetId(dataset.id)}
                    className="w-full text-left group"
                  >
                    <div className="space-y-2">
                      {/* Dataset Icon/Preview */}
                      <div className={`w-full h-12 rounded flex items-center justify-center text-2xl ${
                        isActive 
                          ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        📊
                      </div>
                      
                      {/* Dataset Info */}
                      <div className="space-y-1">
                        <h3 className={`font-medium text-sm truncate ${
                          isActive 
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`} title={dataset.file_name}>
                          {dataset.file_name}
                        </h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div>{recordCount} records</div>
                          <div>{(dataset.file_size / 1024).toFixed(1)} KB</div>
                          <div>{new Date(dataset.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Dataset Content */}
      {activeDataset && (
        <DatasetContent dataset={activeDataset} />
      )}

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

// Client component for dataset content
function DatasetContent({ dataset }: { dataset: DatasetWithAnalysis }) {
  const dataPreview = Array.isArray(dataset.data) 
    ? dataset.data.slice(0, 3)
    : dataset.data;


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
            </div>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Uploaded: {new Date(dataset.created_at).toLocaleString()} | 
            Size: {(dataset.file_size / 1024).toFixed(2)} KB | 
            Records: {Array.isArray(dataset.data) ? dataset.data.length : 'N/A'}
          </div>
        </CardHeader>
      </Card>

      {/* Detailed Analysis Results - Now at the top */}
      {dataset.analysis ? (
        <AnalysisResults analysis={dataset.analysis} datasetData={dataset.data} />
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


      {/* Advanced Charts - Now after the detailed analysis */}
      {dataset.analysis && (
        <AdvancedCharts data={dataset.data} analysis={dataset.analysis} />
      )}

      {/* Report Generator */}
      {dataset.analysis && (
        <ReportGenerator 
          datasetId={dataset.id} 
          datasetName={dataset.file_name} 
        />
      )}
      
      {/* Raw Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Raw Data Preview (First 3 records)</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}