'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import { analyzeData, saveAnalysis } from '@/app/actions/analyzeData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const supabase = createClient();

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadStatus('');
      console.log('Selected CSV file:', file);
      console.log('File name:', file.name);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
    } else if (file) {
      alert('Please select a CSV file');
      setSelectedFile(null);
    }
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading file...');

    try {
      // Parse CSV file using PapaParse with optimized settings
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          try {
            console.log('Parsed CSV data:', results.data);
            console.log('Parse errors:', results.errors);

            setUploadStatus('Saving data to database...');

            // Insert data into Supabase datasets table
            const { data: insertData, error } = await supabase
              .from('datasets')
              .insert({
                file_name: selectedFile.name,
                file_size: selectedFile.size,
                data: results.data
              })
              .select('id')
              .single();

            if (error) {
              console.error('Supabase insert error:', error);
              alert(`Error uploading file: ${error.message}`);
              return;
            }

            console.log('Successfully inserted data:', insertData);
            setUploadStatus('Running EDA analysis...');
            setIsAnalyzing(true);

            // Run EDA analysis
            try {
              const analysis = await analyzeData(insertData.id, results.data as Record<string, unknown>[]);
              await saveAnalysis(insertData.id, analysis);
              
              console.log('Analysis completed:', analysis);
              setUploadStatus('Analysis completed successfully!');
              
              // Show success message
              alert('File uploaded and analyzed successfully! Check the Data Viewer to see the analysis results.');
              
              // Reset form
              setSelectedFile(null);
              const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
              if (fileInput) {
                fileInput.value = '';
              }
            } catch (analysisError) {
              console.error('Analysis error:', analysisError);
              setUploadStatus('Upload successful, but analysis failed. You can still view the data.');
              alert('File uploaded successfully, but analysis failed. You can still view the raw data.');
            }

          } catch (parseError) {
            console.error('Error processing parsed data:', parseError);
            alert('Error processing the parsed data');
          } finally {
            setIsUploading(false);
            setIsAnalyzing(false);
            setTimeout(() => setUploadStatus(''), 3000);
          }
        },
        error: (error) => {
          console.error('PapaParse error:', error);
          alert(`Error parsing CSV file: ${error.message}`);
          setIsUploading(false);
          setIsAnalyzing(false);
          setUploadStatus('');
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file');
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadStatus('');
    }
  }, [selectedFile, supabase]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload and analyze your CSV files with automated EDA
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>CSV File Upload & Analysis</CardTitle>
          <CardDescription>
            Select a CSV file to upload, parse, and automatically analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="csv-upload" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Choose CSV File
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading || isAnalyzing}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-300
                  dark:hover:file:bg-blue-800
                  border border-gray-300 dark:border-gray-600
                  rounded-md p-2
                  bg-white dark:bg-gray-800
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {selectedFile && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  File Selected
                </h3>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p><strong>Name:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                </div>
                
                {/* Status Display */}
                {(isUploading || isAnalyzing) && uploadStatus && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-800 dark:text-blue-200">{uploadStatus}</span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleFileUpload}
                  disabled={isUploading || isAnalyzing}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : 'Upload & Analyze CSV'}
                </button>
              </div>
            )}

            {/* Process Steps */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What happens when you upload:
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>1. Parse CSV file and validate data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>2. Save data to database</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>3. Run automated EDA analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>4. Generate statistics and insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>5. View results in Data Viewer</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}