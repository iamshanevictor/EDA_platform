'use client';

import { forwardRef } from 'react';
import { ReportData } from '@/app/actions/generateReport';

interface ReportTemplateProps {
  reportData: ReportData;
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ reportData }, ref) => {
    const { dataset, analysis, insights } = reportData;
    const numericColumns = Object.keys(analysis.column_types).filter(
      col => analysis.column_types[col] === 'numeric'
    );

    // Helper function to get width class
    const getWidthClass = (percentage: number) => {
      const width = Math.min(percentage, 100);
      if (width >= 90) return 'w-full';
      if (width >= 80) return 'w-4/5';
      if (width >= 70) return 'w-3/4';
      if (width >= 60) return 'w-3/5';
      if (width >= 50) return 'w-1/2';
      if (width >= 40) return 'w-2/5';
      if (width >= 30) return 'w-1/3';
      if (width >= 20) return 'w-1/5';
      if (width >= 10) return 'w-1/10';
      return 'w-0';
    };

    return (
      <div ref={ref} className="max-w-4xl mx-auto p-8 bg-white text-black">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Exploratory Data Analysis Report
          </h1>
          <h2 className="text-xl text-gray-600 mb-4">{dataset.file_name}</h2>
          <div className="flex justify-center space-x-8 text-sm text-gray-500">
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span>Dataset ID: {dataset.id}</span>
            <span>Records: {insights.data_overview.total_records.toLocaleString()}</span>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
            Executive Summary
          </h2>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {insights.data_quality_score}%
                </div>
                <div className="text-sm text-gray-600">Data Quality Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {insights.data_overview.total_records.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {insights.data_overview.total_columns}
                </div>
                <div className="text-sm text-gray-600">Columns</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {insights.data_overview.missing_data_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Missing Data</div>
              </div>
            </div>
          </div>
          
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              This report provides a comprehensive analysis of the dataset <strong>{dataset.file_name}</strong> 
              containing {insights.data_overview.total_records.toLocaleString()} records across {insights.data_overview.total_columns} columns. 
              The dataset shows a data quality score of {insights.data_quality_score}% with {insights.data_overview.numeric_columns} numeric 
              and {insights.data_overview.text_columns} text columns. The analysis reveals key patterns and relationships 
              that provide valuable insights for data-driven decision making.
            </p>
          </div>
        </section>

        {/* Data Quality Assessment */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
            Data Quality Assessment
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Completeness Analysis</h3>
              <div className="space-y-2">
                {Object.entries(analysis.missing_values).map(([column, count]) => {
                  const percentage = ((count as number) / insights.data_overview.total_records) * 100;
                  return (
                    <div key={column} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 truncate max-w-32" title={column}>
                        {column}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`bg-red-500 h-2 rounded-full ${getWidthClass(percentage)}`}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Column Types Distribution</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Numeric Columns</span>
                  <span className="text-sm font-medium text-blue-600">
                    {insights.data_overview.numeric_columns}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Text Columns</span>
                  <span className="text-sm font-medium text-green-600">
                    {insights.data_overview.text_columns}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Total Columns</span>
                  <span className="text-sm font-medium text-gray-900">
                    {insights.data_overview.total_columns}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Findings */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
            Key Findings
          </h2>
          <div className="bg-green-50 p-4 rounded-lg">
            <ul className="space-y-2">
              {insights.key_findings.map((finding, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-green-600 font-bold mt-1">•</span>
                  <span className="text-gray-700">{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Statistical Summary */}
        {numericColumns.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
              Statistical Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Column</th>
                    <th className="border border-gray-300 p-2 text-center">Count</th>
                    <th className="border border-gray-300 p-2 text-center">Mean</th>
                    <th className="border border-gray-300 p-2 text-center">Median</th>
                    <th className="border border-gray-300 p-2 text-center">Std Dev</th>
                    <th className="border border-gray-300 p-2 text-center">Min</th>
                    <th className="border border-gray-300 p-2 text-center">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {numericColumns.map(column => {
                    const stats = analysis.summary_stats[column] as {
                      count: number;
                      mean: number;
                      median: number;
                      std_dev: number;
                      min: number;
                      max: number;
                    };
                    if (!stats) return null;
                    return (
                      <tr key={column}>
                        <td className="border border-gray-300 p-2 font-medium">{column}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.count}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.mean?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.median?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.std_dev?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.min?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.max?.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Correlation Analysis */}
        {insights.top_correlations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
              Correlation Analysis
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Top Correlations</h3>
              <div className="space-y-2">
                {insights.top_correlations.map((correlation, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{correlation.pair}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            Math.abs(correlation.value) > 0.7 ? 'bg-red-500' :
                            Math.abs(correlation.value) > 0.5 ? 'bg-orange-500' :
                            'bg-yellow-500'
                          } ${getWidthClass(Math.abs(correlation.value) * 100)}`}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">
                        {correlation.value.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
            Recommendations
          </h2>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <ul className="space-y-2">
              {insights.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-yellow-600 font-bold mt-1">→</span>
                  <span className="text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
          <p>Report generated by EDA Platform on {new Date().toLocaleString()}</p>
          <p>Dataset: {dataset.file_name} | Size: {(dataset.file_size / 1024).toFixed(2)} KB</p>
        </div>
      </div>
    );
  }
);

ReportTemplate.displayName = 'ReportTemplate';
