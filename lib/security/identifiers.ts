import { UPLOAD_LIMITS } from "./upload-limits";

export function requireDatasetId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid dataset identifier.");
  }
  return value;
}

export function requirePage(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid page number.");
  }
  return value;
}

export function requirePageSize(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > UPLOAD_LIMITS.maxPageSize
  ) {
    throw new Error(`Page size must be between 1 and ${UPLOAD_LIMITS.maxPageSize}.`);
  }
  return value;
}
