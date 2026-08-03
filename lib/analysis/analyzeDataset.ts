import { UPLOAD_LIMITS } from "../security/upload-limits";

export interface AnalysisResult {
  summary_stats: Record<
    string,
    Record<string, number | string | { value: string; count: number }[]>
  >;
  missing_values: Record<string, number>;
  column_types: Record<string, string>;
  correlation_matrix: Record<string, Record<string, number>>;
}

export function analyzeDatasetData(
  csvData: Record<string, unknown>[],
): AnalysisResult {
  if (!csvData || csvData.length === 0) {
    throw new Error("No data provided for analysis");
  }

  const columns = Object.keys(csvData[0]);
  const summaryStats: AnalysisResult["summary_stats"] = {};
  const missingValues: AnalysisResult["missing_values"] = {};
  const columnTypes: AnalysisResult["column_types"] = {};
  const correlationMatrix: AnalysisResult["correlation_matrix"] = {};

  columns.forEach((column) => {
    correlationMatrix[column] = {};
    columns.forEach((otherColumn) => {
      correlationMatrix[column][otherColumn] = 0;
    });
  });

  columns.forEach((column) => {
    const values = csvData
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined && value !== "");
    const nonNullValues = values.filter(
      (value) => value !== null && value !== undefined && value !== "",
    );

    missingValues[column] = csvData.length - nonNullValues.length;

    if (nonNullValues.length === 0) {
      columnTypes[column] = "empty";
    } else {
      const firstValue = nonNullValues[0];
      if (typeof firstValue === "number" || !isNaN(Number(firstValue))) {
        columnTypes[column] = "numeric";
      } else if (typeof firstValue === "boolean") {
        columnTypes[column] = "boolean";
      } else if (
        firstValue instanceof Date ||
        !isNaN(Date.parse(String(firstValue)))
      ) {
        columnTypes[column] = "date";
      } else {
        columnTypes[column] = "text";
      }
    }

    if (columnTypes[column] === "numeric") {
      const numericValues = nonNullValues
        .map((value) => Number(value))
        .filter((value) => !isNaN(value));

      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = numericValues.reduce((acc, value) => acc + value, 0);
        const mean = sum / numericValues.length;
        const variance =
          numericValues.reduce(
            (acc, value) => acc + Math.pow(value - mean, 2),
            0,
          ) / numericValues.length;
        const stdDev = Math.sqrt(variance);

        summaryStats[column] = {
          count: numericValues.length,
          mean: Number(mean.toFixed(4)),
          median:
            sorted.length % 2 === 0
              ? Number(
                  (
                    (sorted[sorted.length / 2 - 1] +
                      sorted[sorted.length / 2]) /
                    2
                  ).toFixed(4),
                )
              : Number(sorted[Math.floor(sorted.length / 2)].toFixed(4)),
          std_dev: Number(stdDev.toFixed(4)),
          min: Number(Math.min(...numericValues).toFixed(4)),
          max: Number(Math.max(...numericValues).toFixed(4)),
          q1: Number(sorted[Math.floor(sorted.length * 0.25)].toFixed(4)),
          q3: Number(sorted[Math.floor(sorted.length * 0.75)].toFixed(4)),
          range: Number(
            (Math.max(...numericValues) - Math.min(...numericValues)).toFixed(4),
          ),
        };
      }
    } else if (columnTypes[column] === "text") {
      const textValues = nonNullValues.map((value) => String(value));
      const uniqueValues = [...new Set(textValues)];
      const valueCounts: Record<string, number> = {};
      textValues.forEach((value) => {
        valueCounts[value] = (valueCounts[value] || 0) + 1;
      });

      summaryStats[column] = {
        count: textValues.length,
        unique_count: uniqueValues.length,
        most_common: Object.entries(valueCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 5)
          .map(([value, count]) => ({ value, count })),
        avg_length: Number(
          (
            textValues.reduce((acc, value) => acc + value.length, 0) /
            textValues.length
          ).toFixed(2),
        ),
      };
    } else if (columnTypes[column] === "boolean") {
      const booleanValues = nonNullValues.map((value) => Boolean(value));
      const trueCount = booleanValues.filter((value) => value === true).length;

      summaryStats[column] = {
        count: booleanValues.length,
        true_count: trueCount,
        false_count: booleanValues.length - trueCount,
        true_percentage: Number(
          ((trueCount / booleanValues.length) * 100).toFixed(2),
        ),
      };
    }
  });

  const numericColumns = columns.filter(
    (column) => columnTypes[column] === "numeric",
  ).slice(0, UPLOAD_LIMITS.maxCorrelationColumns);

  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = 0; j < numericColumns.length; j++) {
      const columnA = numericColumns[i];
      const columnB = numericColumns[j];

      if (columnA === columnB) {
        correlationMatrix[columnA][columnB] = 1;
      } else {
        const valuesA = csvData
          .map((row) => Number(row[columnA]))
          .filter((value) => !isNaN(value));
        const valuesB = csvData
          .map((row) => Number(row[columnB]))
          .filter((value) => !isNaN(value));

        if (valuesA.length > 0 && valuesB.length > 0) {
          const correlation = calculateCorrelation(valuesA, valuesB);
          correlationMatrix[columnA][columnB] = Number(
            correlation.toFixed(4),
          );
        }
      }
    }
  }

  return {
    summary_stats: summaryStats,
    missing_values: missingValues,
    column_types: columnTypes,
    correlation_matrix: correlationMatrix,
  };
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((acc, value) => acc + value, 0);
  const sumY = ySlice.reduce((acc, value) => acc + value, 0);
  const sumXY = xSlice.reduce(
    (acc, value, index) => acc + value * ySlice[index],
    0,
  );
  const sumX2 = xSlice.reduce((acc, value) => acc + value * value, 0);
  const sumY2 = ySlice.reduce((acc, value) => acc + value * value, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  return denominator === 0 ? 0 : numerator / denominator;
}
