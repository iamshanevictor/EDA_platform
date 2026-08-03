import { describe, expect, it } from "vitest";
import {
  UPLOAD_LIMITS,
  UploadValidationError,
  decodeUtf8Csv,
  parseAndValidateCsv,
  validateCsvFileMetadata,
  validateStoredJsonSize,
} from "./upload-limits";

describe("CSV upload limits", () => {
  it("accepts a small, well-formed CSV", () => {
    validateCsvFileMetadata({ name: "sample.csv", size: 24, type: "text/csv" });

    expect(parseAndValidateCsv("name,value\nalpha,1\nbeta,2\n")).toEqual({
      headers: ["name", "value"],
      rows: [
        { name: "alpha", value: "1" },
        { name: "beta", value: "2" },
      ],
    });
  });

  it("rejects files larger than 2 MiB", () => {
    expect(() =>
      validateCsvFileMetadata({
        name: "large.csv",
        size: UPLOAD_LIMITS.maxFileBytes + 1,
        type: "text/csv",
      }),
    ).toThrow("2 MiB");
  });

  it("rejects duplicate and empty headers after trimming", () => {
    expect(() => parseAndValidateCsv("name, name\na,b")).toThrow("unique");
    expect(() => parseAndValidateCsv("name, \na,b")).toThrow("cannot be empty");
  });

  it("rejects inconsistent row widths", () => {
    expect(() => parseAndValidateCsv("a,b\n1\n2,3,4")).toThrow("malformed");
  });

  it("rejects more than 10,000 rows", () => {
    const rows = Array.from(
      { length: UPLOAD_LIMITS.maxRows + 1 },
      (_, index) => String(index),
    );
    expect(() => parseAndValidateCsv(`value\n${rows.join("\n")}`)).toThrow(
      "10,000-row",
    );
  });

  it("rejects invalid UTF-8 and null bytes", () => {
    expect(() => decodeUtf8Csv(new Uint8Array([0xff]).buffer)).toThrow(
      UploadValidationError,
    );
    expect(() => decodeUtf8Csv(new TextEncoder().encode("a\0b").buffer)).toThrow(
      "null bytes",
    );
  });

  it("rejects excessive JSON expansion after parsing", () => {
    expect(() =>
      validateStoredJsonSize([{ value: "x".repeat(UPLOAD_LIMITS.maxStoredJsonBytes) }]),
    ).toThrow("stored-data limit");
  });
});
