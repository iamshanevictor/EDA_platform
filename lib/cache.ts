// Simple in-memory cache for dataset data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key for dataset data
  static getDatasetKey(datasetId: number, page: number, pageSize: number): string {
    return `dataset_${datasetId}_page_${page}_size_${pageSize}`;
  }

  // Generate cache key for dataset sample
  static getSampleKey(datasetId: number, sampleSize: number): string {
    return `dataset_${datasetId}_sample_${sampleSize}`;
  }

  // Generate cache key for analysis
  static getAnalysisKey(datasetId: number): string {
    return `analysis_${datasetId}`;
  }
}

// Export singleton instance
export const dataCache = new DataCache();

// Cache utility functions
export function getCachedData<T>(key: string): T | null {
  return dataCache.get<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttl?: number): void {
  dataCache.set(key, data, ttl);
}

export function isCached(key: string): boolean {
  return dataCache.has(key);
}

export function clearCache(): void {
  dataCache.clear();
}
