"use client";
import { createContext, useContext, useRef, useCallback } from "react";

/**
 * DataCacheContext — lightweight in-memory cache for page data.
 *
 * Uses a mutable Map stored in a useRef so writes never cause re-renders.
 * Each entry: { data, timestamp }
 * The cache lives for the duration of the browser tab — perfect for
 * session-scoped stale-while-revalidate.
 */
const DataCacheContext = createContext(null);

export function DataCacheProvider({ children }) {
  // Mutable store — never triggers re-renders on write
  const cacheRef = useRef(new Map());

  const get = useCallback((key) => {
    return cacheRef.current.get(key) || null;
  }, []);

  const set = useCallback((key, data) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const invalidate = useCallback((key) => {
    cacheRef.current.delete(key);
  }, []);

  // Invalidate all keys that start with a given prefix
  const invalidatePrefix = useCallback((prefix) => {
    for (const key of cacheRef.current.keys()) {
      if (key.startsWith(prefix)) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return (
    <DataCacheContext.Provider value={{ get, set, invalidate, invalidatePrefix, clear }}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const ctx = useContext(DataCacheContext);
  if (!ctx) {
    throw new Error("useDataCache must be used within a DataCacheProvider");
  }
  return ctx;
}
