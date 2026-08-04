import { describe, expect, it } from "vitest";
import { requireDatasetId, requirePage, requirePageSize } from "./identifiers";

describe("untrusted numeric identifiers", () => {
  it("accepts bounded positive integers", () => {
    expect(requireDatasetId(1)).toBe(1);
    expect(requirePage(2)).toBe(2);
    expect(requirePageSize(1_000)).toBe(1_000);
  });

  it("rejects unsafe, fractional, negative, and oversized values", () => {
    expect(() => requireDatasetId(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => requireDatasetId(-1)).toThrow();
    expect(() => requirePage(1.5)).toThrow();
    expect(() => requirePageSize(1_001)).toThrow("between 1 and 1000");
  });
});
