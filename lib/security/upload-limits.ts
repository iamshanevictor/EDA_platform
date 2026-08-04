import Papa, { type ParseError } from "papaparse";

export const UPLOAD_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRows: 10_000,
  maxColumns: 100,
  maxCells: 500_000,
  maxHeaderLength: 128,
  maxCellLength: 10_000,
  maxFileNameLength: 255,
  maxStoredJsonBytes: 8 * 1024 * 1024,
  maxPageSize: 1_000,
  maxCorrelationColumns: 30,
} as const;

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export interface ValidatedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export function validateCsvFileMetadata(file: FileMetadata): void {
  const normalizedName = file.name.trim();

  if (!normalizedName || normalizedName.length > UPLOAD_LIMITS.maxFileNameLength) {
    throw new UploadValidationError("The CSV filename is invalid or too long.");
  }

  if (/\p{Cc}/u.test(normalizedName)) {
    throw new UploadValidationError("The CSV filename contains control characters.");
  }

  if (!normalizedName.toLowerCase().endsWith(".csv")) {
    throw new UploadValidationError("Only .csv files are accepted.");
  }

  if (file.size <= 0) {
    throw new UploadValidationError("The CSV file is empty.");
  }

  if (file.size > UPLOAD_LIMITS.maxFileBytes) {
    throw new UploadValidationError("The CSV file exceeds the 2 MiB limit.");
  }

  const allowedTypes = new Set(["", "text/csv", "application/vnd.ms-excel"]);
  if (!allowedTypes.has(file.type.toLowerCase())) {
    throw new UploadValidationError("The uploaded file is not a supported CSV type.");
  }
}

export function decodeUtf8Csv(buffer: ArrayBuffer): string {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    if (decoded.includes("\0")) {
      throw new UploadValidationError("The CSV file contains null bytes.");
    }
    return decoded;
  } catch (error) {
    if (error instanceof UploadValidationError) {
      throw error;
    }
    throw new UploadValidationError("The CSV file must use valid UTF-8 encoding.");
  }
}

export function parseAndValidateCsv(csvText: string): ValidatedCsv {
  const headerResult = Papa.parse<string[]>(csvText, {
    delimiter: ",",
    preview: 1,
    skipEmptyLines: "greedy",
  });

  rejectParseErrors(headerResult.errors);

  const rawHeaders = headerResult.data[0];
  if (!rawHeaders || rawHeaders.length === 0) {
    throw new UploadValidationError("The CSV file must contain a header row.");
  }

  const headers = rawHeaders.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim(),
  );

  if (headers.some((header) => header.length === 0)) {
    throw new UploadValidationError("CSV headers cannot be empty.");
  }

  if (headers.some((header) => header.length > UPLOAD_LIMITS.maxHeaderLength)) {
    throw new UploadValidationError("A CSV header exceeds 128 characters.");
  }

  if (headers.length > UPLOAD_LIMITS.maxColumns) {
    throw new UploadValidationError("The CSV exceeds the 100-column limit.");
  }

  if (new Set(headers).size !== headers.length) {
    throw new UploadValidationError("CSV headers must be unique after trimming.");
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    delimiter: ",",
    header: true,
    preview: UPLOAD_LIMITS.maxRows + 1,
    skipEmptyLines: "greedy",
    transformHeader: (header, index) =>
      (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim(),
  });

  rejectParseErrors(parsed.errors);

  if (parsed.data.length === 0) {
    throw new UploadValidationError("The CSV file must contain at least one data row.");
  }

  if (parsed.data.length > UPLOAD_LIMITS.maxRows || parsed.meta.truncated) {
    throw new UploadValidationError("The CSV exceeds the 10,000-row limit.");
  }

  if (parsed.data.length * headers.length > UPLOAD_LIMITS.maxCells) {
    throw new UploadValidationError("The CSV exceeds the 500,000-cell limit.");
  }

  for (const row of parsed.data) {
    for (const header of headers) {
      const value = row[header] ?? "";
      if (value.length > UPLOAD_LIMITS.maxCellLength) {
        throw new UploadValidationError("A CSV cell exceeds 10,000 characters.");
      }
    }
  }

  return { headers, rows: parsed.data };
}

export function validateStoredJsonSize(rows: Record<string, string>[]): void {
  const encodedSize = new TextEncoder().encode(JSON.stringify(rows)).byteLength;
  if (encodedSize > UPLOAD_LIMITS.maxStoredJsonBytes) {
    throw new UploadValidationError(
      "The parsed CSV exceeds the 8 MiB stored-data limit.",
    );
  }
}

function rejectParseErrors(errors: ParseError[]): void {
  if (errors.length === 0) {
    return;
  }

  const firstError = errors[0];
  const row = firstError.row === undefined ? "" : ` near row ${firstError.row + 1}`;
  throw new UploadValidationError(`The CSV is malformed${row}.`);
}
