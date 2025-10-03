'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      console.log('Selected CSV file:', file);
      console.log('File name:', file.name);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
    } else if (file) {
      alert('Please select a CSV file');
      setSelectedFile(null);
    }
  };

  const testTableAccess = async () => {
    try {
      console.log('Testing table access...');
      console.log('Supabase client:', supabase);
      
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .limit(1);
      
      console.log('Query result - data:', data);
      console.log('Query result - error:', error);
      
      if (error) {
        console.error('Table access test failed:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Table access test failed: ${error.message || 'Unknown error'}\nCode: ${error.code || 'N/A'}\nDetails: ${error.details || 'N/A'}`);
      } else {
        console.log('Table access test successful:', data);
        alert(`Table access test successful! Found ${data?.length || 0} records.`);
      }
    } catch (err) {
      console.error('Table access test error:', err);
      alert(`Table access test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);

    try {
      // Parse CSV file using PapaParse
      Papa.parse(selectedFile, {
        header: true, // Use first row as header
        complete: async (results) => {
          try {
            console.log('Parsed CSV data:', results.data);
            console.log('Parse errors:', results.errors);

            // Insert data into Supabase datasets table
            const { data, error } = await supabase
              .from('datasets')
              .insert({
                file_name: selectedFile.name,
                file_size: selectedFile.size,
                data: results.data
              });

            if (error) {
              console.error('Supabase insert error:', error);
              alert(`Error uploading file: ${error.message}`);
            } else {
              console.log('Successfully inserted data:', data);
              alert('File uploaded and parsed successfully!');
              setSelectedFile(null);
              // Reset the file input
              const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
              if (fileInput) {
                fileInput.value = '';
              }
            }
          } catch (parseError) {
            console.error('Error processing parsed data:', parseError);
            alert('Error processing the parsed data');
          } finally {
            setIsUploading(false);
          }
        },
        error: (error) => {
          console.error('PapaParse error:', error);
          alert(`Error parsing CSV file: ${error.message}`);
          setIsUploading(false);
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file');
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload and manage your CSV files
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>CSV File Upload</CardTitle>
          <CardDescription>
            Select a CSV file to upload and process
          </CardDescription>
          <div className="mt-2 flex gap-2">
            <button
              onClick={testTableAccess}
              className="w-fit bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded-md transition-colors duration-200 text-sm"
            >
              Test Table Access
            </button>
            <button
              onClick={() => {
                console.log('Environment check:');
                console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
                console.log('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ? 'Set' : 'Not set');
                alert('Check console for environment variables status');
              }}
              className="w-fit bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-md transition-colors duration-200 text-sm"
            >
              Check Env Vars
            </button>
          </div>
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
                  bg-white dark:bg-gray-800"
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
                <button
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Parse CSV'}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
