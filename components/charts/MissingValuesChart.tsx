'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MissingValuesChartProps {
  missingValues: Record<string, number>;
  totalRecords: number;
}

export function MissingValuesChart({ missingValues, totalRecords }: MissingValuesChartProps) {
  const chartData = useMemo(() => {
    const entries = Object.entries(missingValues);
    
    // Bar chart data
    const barData = entries.map(([column, missing]) => ({
      column: column.length > 12 ? column.substring(0, 12) + '...' : column,
      fullColumn: column,
      missing,
      present: totalRecords - missing,
      missingPercentage: (missing / totalRecords) * 100
    })).sort((a, b) => b.missing - a.missing);

    // Pie chart data
    const totalMissing = entries.reduce((sum, [, missing]) => sum + missing, 0);
    const totalPresent = (totalRecords * entries.length) - totalMissing;
    
    const pieData = [
      { name: 'Present', value: totalPresent, color: '#10b981' },
      { name: 'Missing', value: totalMissing, color: '#ef4444' }
    ];

    return { barData, pieData, totalMissing, totalPresent };
  }, [missingValues, totalRecords]);

  const COLORS = ['#10b981', '#ef4444'];

  if (Object.keys(missingValues).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No missing values data available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {chartData.totalPresent.toLocaleString()}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Present Values</div>
        </div>
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {chartData.totalMissing.toLocaleString()}
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">Missing Values</div>
        </div>
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {((chartData.totalMissing / (totalRecords * Object.keys(missingValues).length)) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Missing Rate</div>
        </div>
      </div>

      {/* Side-by-side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart - Overall Missing vs Present */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Overall Data Completeness
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Missing Values by Column */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Missing Values by Column
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="column" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'missing' ? `${value} (${((value / totalRecords) * 100).toFixed(1)}%)` : value,
                    name === 'missing' ? 'Missing' : 'Present'
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `Column: ${payload[0].payload.fullColumn}`;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="present" stackId="a" fill="#10b981" name="present" />
                <Bar dataKey="missing" stackId="a" fill="#ef4444" name="missing" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Detailed Missing Values Report
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2 font-medium">Column</th>
                <th className="text-right p-2 font-medium">Total Records</th>
                <th className="text-right p-2 font-medium">Present</th>
                <th className="text-right p-2 font-medium">Missing</th>
                <th className="text-right p-2 font-medium">Missing %</th>
                <th className="text-center p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {chartData.barData.map((row) => (
                <tr key={row.fullColumn} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-2 font-medium" title={row.fullColumn}>
                    {row.fullColumn}
                  </td>
                  <td className="p-2 text-right">{totalRecords.toLocaleString()}</td>
                  <td className="p-2 text-right text-green-600 dark:text-green-400">
                    {row.present.toLocaleString()}
                  </td>
                  <td className="p-2 text-right text-red-600 dark:text-red-400">
                    {row.missing.toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    {row.missingPercentage.toFixed(1)}%
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      row.missing === 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : row.missingPercentage < 5
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {row.missing === 0 ? 'Complete' : row.missingPercentage < 5 ? 'Good' : 'Needs Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
