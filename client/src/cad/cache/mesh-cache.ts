/**
 * Mesh Cache using IndexedDB
 *
 * Caches built meshes to avoid recomputing identical models.
 * Cache key is a hash of (cadScript + params).
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MeshCacheEntry {
  key: string;
  cadScript: string;
  params: Record<string, any>;
  meshData: ArrayBuffer;
  edges?: ArrayBuffer;
  metadata: {
    triCount: number;
    volume?: number;
    surfaceArea?: number;
    bbox?: { min: [number, number, number]; max: [number, number, number] };
  };
  timestamp: number;
  accessCount: number;
}

interface CadCacheDB extends DBSchema {
  meshes: {
    key: string;
    value: MeshCacheEntry;
    indexes: { 'by-timestamp': number; 'by-accessCount': number };
  };
}

const DB_NAME = 'cad-mesh-cache';
const DB_VERSION = 1;
const STORE_NAME = 'meshes';
const MAX_CACHE_SIZE_MB = 100; // Maximum cache size in MB
const MAX_CACHE_ENTRIES = 100;

export class MeshCache {
  private db: IDBPDatabase<CadCacheDB> | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.db = await openDB<CadCacheDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-accessCount', 'accessCount');
        },
      });
      console.log('[MeshCache] Initialized');
    } catch (error) {
      console.error('[MeshCache] Failed to initialize:', error);
    }
  }

  /**
   * Generate cache key from cadScript and params
   */
  private generateKey(cadScript: string, params: Record<string, any>): string {
    const payload = JSON.stringify({ cadScript, params });
    return this.hashString(payload);
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached mesh data
   */
  async get(
    cadScript: string,
    params: Record<string, any>
  ): Promise<MeshCacheEntry | undefined> {
    await this.initPromise;
    if (!this.db) return undefined;

    try {
      const key = this.generateKey(cadScript, params);
      const entry = await this.db.get(STORE_NAME, key);

      if (entry) {
        // Update access count
        entry.accessCount++;
        await this.db.put(STORE_NAME, entry);

        console.log('[MeshCache] Cache hit:', key);
        return entry;
      }

      console.log('[MeshCache] Cache miss:', key);
      return undefined;
    } catch (error) {
      console.error('[MeshCache] Get error:', error);
      return undefined;
    }
  }

  /**
   * Store mesh data in cache
   */
  async set(
    cadScript: string,
    params: Record<string, any>,
    meshData: ArrayBuffer,
    metadata: MeshCacheEntry['metadata'],
    edges?: ArrayBuffer
  ): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    try {
      const key = this.generateKey(cadScript, params);

      const entry: MeshCacheEntry = {
        key,
        cadScript,
        params,
        meshData,
        edges,
        metadata,
        timestamp: Date.now(),
        accessCount: 1,
      };

      await this.db.put(STORE_NAME, entry);
      console.log('[MeshCache] Cached:', key);

      // Check cache size and evict if necessary
      await this.evictIfNecessary();
    } catch (error) {
      console.error('[MeshCache] Set error:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    try {
      await this.db.clear(STORE_NAME);
      console.log('[MeshCache] Cleared all entries');
    } catch (error) {
      console.error('[MeshCache] Clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    entryCount: number;
    totalSizeMB: number;
    oldestEntry?: number;
    newestEntry?: number;
  }> {
    await this.initPromise;
    if (!this.db) {
      return { entryCount: 0, totalSizeMB: 0 };
    }

    try {
      const allEntries = await this.db.getAll(STORE_NAME);
      const entryCount = allEntries.length;

      let totalSize = 0;
      let oldestEntry: number | undefined;
      let newestEntry: number | undefined;

      for (const entry of allEntries) {
        totalSize += entry.meshData.byteLength;
        if (entry.edges) {
          totalSize += entry.edges.byteLength;
        }

        if (!oldestEntry || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }
        if (!newestEntry || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp;
        }
      }

      const totalSizeMB = totalSize / (1024 * 1024);

      return { entryCount, totalSizeMB, oldestEntry, newestEntry };
    } catch (error) {
      console.error('[MeshCache] GetStats error:', error);
      return { entryCount: 0, totalSizeMB: 0 };
    }
  }

  /**
   * Evict old entries if cache is too large
   */
  private async evictIfNecessary(): Promise<void> {
    if (!this.db) return;

    try {
      const stats = await this.getStats();

      // Evict by size
      if (stats.totalSizeMB > MAX_CACHE_SIZE_MB) {
        console.log('[MeshCache] Cache size exceeded, evicting oldest entries');
        await this.evictOldest(Math.floor(MAX_CACHE_ENTRIES * 0.2)); // Evict 20%
      }

      // Evict by count
      if (stats.entryCount > MAX_CACHE_ENTRIES) {
        console.log('[MeshCache] Cache count exceeded, evicting least accessed entries');
        await this.evictLeastAccessed(stats.entryCount - MAX_CACHE_ENTRIES);
      }
    } catch (error) {
      console.error('[MeshCache] Evict error:', error);
    }
  }

  /**
   * Evict oldest entries
   */
  private async evictOldest(count: number): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('by-timestamp');

      let cursor = await index.openCursor();
      let deleted = 0;

      while (cursor && deleted < count) {
        await cursor.delete();
        deleted++;
        cursor = await cursor.continue();
      }

      await tx.done;
      console.log(`[MeshCache] Evicted ${deleted} oldest entries`);
    } catch (error) {
      console.error('[MeshCache] EvictOldest error:', error);
    }
  }

  /**
   * Evict least accessed entries
   */
  private async evictLeastAccessed(count: number): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('by-accessCount');

      let cursor = await index.openCursor();
      let deleted = 0;

      while (cursor && deleted < count) {
        await cursor.delete();
        deleted++;
        cursor = await cursor.continue();
      }

      await tx.done;
      console.log(`[MeshCache] Evicted ${deleted} least accessed entries`);
    } catch (error) {
      console.error('[MeshCache] EvictLeastAccessed error:', error);
    }
  }
}

// Singleton instance
let cacheInstance: MeshCache | null = null;

export function getMeshCache(): MeshCache {
  if (!cacheInstance) {
    cacheInstance = new MeshCache();
  }
  return cacheInstance;
}
