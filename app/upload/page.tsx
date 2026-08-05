"use client";

import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UploadValidationError,
  validateCsvFileMetadata,
} from "@/lib/security/upload-limits";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

interface UploadResponse {
  datasetId?: number;
  expiresAt?: string;
  error?: string;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploadedDatasetId, setUploadedDatasetId] = useState<number | null>(null);

  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setUploadedDatasetId(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    try {
      validateCsvFileMetadata(file);
      setSelectedFile(file);
    } catch (validationError) {
      setSelectedFile(null);
      event.target.value = "";
      setError(
        validationError instanceof UploadValidationError
          ? validationError.message
          : "Please select a valid CSV file.",
      );
    }
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile || !turnstileToken) {
      setError("Select a CSV file and complete the security challenge.");
      return;
    }

    setIsUploading(true);
    setError("");
    setStatus("Uploading, validating, and analyzing your CSV...");

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("turnstileToken", turnstileToken);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.datasetId) {
        throw new Error(result.error || "The upload could not be completed.");
      }

      setUploadedDatasetId(result.datasetId);
      setStatus(
        result.expiresAt
          ? `Analysis complete. This dataset expires ${new Date(result.expiresAt).toLocaleString()}. Opening your analysis...`
          : "Analysis complete. This dataset expires within 24 hours. Opening your analysis...",
      );
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      window.location.assign("/data");
    } catch (uploadError) {
      setStatus("");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The upload could not be completed.",
      );
    } finally {
      setIsUploading(false);
      setTurnstileResetKey((value) => value + 1);
    }
  }, [selectedFile, turnstileToken]);

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload CSV</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload a bounded CSV for private, session-isolated exploratory analysis.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>CSV file upload and analysis</CardTitle>
          <CardDescription>
            Maximum 2 MiB, 10,000 rows, 100 columns, and 500,000 non-empty cells.
            Data is automatically removed after 24 hours. Each anonymous session may
            make five upload attempts per rolling hour, with at least 30 seconds
            between attempts. Failed processing attempts count toward this safety limit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div>
              <label
                htmlFor="csv-upload"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Choose CSV file
              </label>
              <input
                ref={fileInputRef}
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
            </div>

            {selectedFile && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
                <p><strong>Name:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KiB</p>
              </div>
            )}

            <TurnstileWidget onToken={handleToken} resetKey={turnstileResetKey} />

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200" role="alert">
                {error}
              </p>
            )}

            {status && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200" aria-live="polite">
                <p>{status}</p>
                {uploadedDatasetId && (
                  <Link
                    href="/data"
                    prefetch={false}
                    className="mt-2 inline-block font-medium underline"
                  >
                    View your analysis
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleFileUpload}
              disabled={!selectedFile || !turnstileToken || isUploading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isUploading ? "Processing..." : "Upload and analyze CSV"}
            </button>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <p>
                Your CSV is processed on the application server and stored only in your
                anonymous browser session. Dataset content is not sent to an AI provider.
                Clearing browser data removes your ability to access the session before
                automatic deletion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
