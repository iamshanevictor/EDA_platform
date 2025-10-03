'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NumericStats {
  count: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  range: number;
}

interface TextStats {
  count: number;
  unique_count: number;
  most_common: Array<{ value: string; count: number }>;
  avg_length: number;
}

interface AnalysisResultsProps {
  analysis: {
    summary_stats: Record<string, unknown>;
    missing_values: Record<string, number>;
    column_types: Record<string, string>;
    correlation_matrix: Record<string, Record<string, number>>;
  };
  datasetData?: Record<string, unknown>[];
}

export function AnalysisResults({ analysis, datasetData }: AnalysisResultsProps) {
  const { summary_stats, missing_values, column_types, correlation_matrix } = analysis;

  const numericColumns = Object.entries(column_types)
    .filter(([, type]) => type === 'numeric')
    .map(([name]) => name);

  const textColumns = Object.entries(column_types)
    .filter(([, type]) => type === 'text')
    .map(([name]) => name);

  const allColumns = Object.keys(column_types);
  const hasManyColumns = allColumns.length > 10;
  const hasManyNumericColumns = numericColumns.length > 6;

  return (
    <div className="space-y-4">
      {/* Overview - Compact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dataset Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`grid gap-2 ${hasManyColumns ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="font-semibold text-blue-600 dark:text-blue-400">
                {Object.keys(column_types).length}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Columns</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="font-semibold text-green-600 dark:text-green-400">
                {numericColumns.length}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Numeric</div>
            </div>
            <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <div className="font-semibold text-purple-600 dark:text-purple-400">
                {textColumns.length}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Text</div>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              <div className="font-semibold text-orange-600 dark:text-orange-400">
                {Object.values(missing_values).reduce((sum, count) => sum + count, 0)}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">Missing</div>
            </div>
            {datasetData && (
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="font-semibold text-gray-600 dark:text-gray-400">
                  {datasetData.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Records</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Missing Values - Compact Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Missing Values</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`grid gap-2 ${hasManyColumns ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2'}`}>
            {Object.entries(missing_values).map(([column, count]) => (
              <div key={column} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                <span className="font-medium truncate" title={column}>{column}</span>
                <span className={`px-2 py-1 rounded text-xs ml-2 flex-shrink-0 ${
                  count === 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Numeric Statistics - Compact Grid */}
      {numericColumns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Numeric Statistics</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`grid gap-2 ${hasManyNumericColumns ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
              {numericColumns.map(column => {
                const stats = summary_stats[column] as NumericStats;
                if (!stats) return null;

                return (
                  <div key={column} className="border border-gray-200 dark:border-gray-700 rounded p-2">
                    <h4 className="font-semibold text-sm mb-1 truncate" title={column}>{column}</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Count:</span>
                        <span className="font-medium">{stats.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Mean:</span>
                        <span className="font-medium">{stats.mean}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Median:</span>
                        <span className="font-medium">{stats.median}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Std Dev:</span>
                        <span className="font-medium">{stats.std_dev}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Min:</span>
                        <span className="font-medium">{stats.min}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Max:</span>
                        <span className="font-medium">{stats.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Q1:</span>
                        <span className="font-medium">{stats.q1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Q3:</span>
                        <span className="font-medium">{stats.q3}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Text Column Statistics - Compact Grid */}
      {textColumns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Text Statistics</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`grid gap-3 ${textColumns.length > 2 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {textColumns.map(column => {
                const stats = summary_stats[column] as TextStats;
                if (!stats) return null;

                return (
                  <div key={column} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <h4 className="font-semibold text-base mb-2 truncate" title={column}>{column}</h4>
                    <div className="grid grid-cols-1 gap-2 text-xs mb-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Count:</span>
                        <span className="font-medium">{stats.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Unique:</span>
                        <span className="font-medium">{stats.unique_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Avg Length:</span>
                        <span className="font-medium">{stats.avg_length} chars</span>
                      </div>
                    </div>
                    {stats.most_common && stats.most_common.length > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Top Values:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stats.most_common.slice(0, 3).map((item, index) => (
                            <span key={index} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded text-xs">
                              {item.value} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}