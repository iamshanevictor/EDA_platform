import { describe, expect, it } from "vitest";

import { analyzeDatasetData } from "./analyzeDataset";

describe("analyzeDatasetData current behavior", () => {
  it("rejects an empty dataset", () => {
    expect(() => analyzeDatasetData([])).toThrow(
      "No data provided for analysis",
    );
  });

  it("uses population deviation and index-based quartiles", () => {
    const result = analyzeDatasetData([
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: "" },
    ]);

    expect(result.column_types.value).toBe("numeric");
    expect(result.missing_values.value).toBe(1);
    expect(result.summary_stats.value).toEqual({
      count: 4,
      mean: 2.5,
      median: 2.5,
      std_dev: 1.118,
      min: 1,
      max: 4,
      q1: 2,
      q3: 4,
      range: 3,
    });
  });

  it("infers type from the first non-empty value", () => {
    const result = analyzeDatasetData([
      { mixed: "1" },
      { mixed: "not-a-number" },
      { mixed: "2" },
    ]);

    expect(result.column_types.mixed).toBe("numeric");
    expect(result.missing_values.mixed).toBe(0);
    expect(result.summary_stats.mixed.count).toBe(2);
  });

  it("classifies native booleans as numeric before reaching Boolean logic", () => {
    const result = analyzeDatasetData([
      { enabled: true },
      { enabled: "false" },
      { enabled: false },
    ]);

    expect(result.column_types.enabled).toBe("numeric");
    expect(result.summary_stats.enabled).toEqual({
      count: 2,
      mean: 0.5,
      median: 0.5,
      std_dev: 0.5,
      min: 0,
      max: 1,
      q1: 0,
      q3: 1,
      range: 1,
    });
  });

  it("classifies parseable date strings as dates", () => {
    const result = analyzeDatasetData([
      { observedAt: "2025-10-07" },
      { observedAt: "not-a-date" },
    ]);

    expect(result.column_types.observedAt).toBe("date");
    expect(result.summary_stats.observedAt).toBeUndefined();
  });

  it("independently filters correlation vectors instead of preserving rows", () => {
    const result = analyzeDatasetData([
      { x: 1, y: undefined },
      { x: 2, y: 20 },
      { x: undefined, y: 30 },
      { x: 4, y: 10 },
    ]);

    expect(result.correlation_matrix.x.y).toBe(-0.6547);
    expect(result.correlation_matrix.y.x).toBe(-0.6547);
    expect(result.correlation_matrix.x.x).toBe(1);
    expect(result.correlation_matrix.y.y).toBe(1);
  });
});
