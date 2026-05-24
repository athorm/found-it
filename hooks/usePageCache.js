"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDataCache } from "@/lib/dataCache";

/**
 * usePageCache — Stale-While-Revalidate hook for page-level data.
 *
 * @param {string}   key      Unique cache key (e.g. "items-lost", "profile-abc123")
 * @param {Function} fetchFn  Async function that returns the fresh data
 * @param {object}   options
 * @param {number}   options.ttl        Time-to-live in ms (default: 60000 = 60s)
 * @param {boolean}  options.enabled    Whether to fetch at all (default: true)
 * @param {any[]}    options.deps       Extra dependencies to re-run the fetch
 *
 * @returns {{ data, loading, refresh, updateCache }}
 *   - data:        The cached or freshly-fetched data
 *   - loading:     True only on the very first fetch (no cache available)
 *   - refresh:     Force a fresh fetch and update cache
 *   - updateCache: Manually update the cached data without a fetch
 */
export function usePageCache(key, fetchFn, options = {}) {
  const { ttl = 60000, enabled = true, deps = [] } = options;
  const cache = useDataCache();

  const [data, setData] = useState(() => {
    // Synchronous cache read on mount — instant data if available
    if (!key) return null;
    const entry = cache.get(key);
    return entry ? entry.data : null;
  });

  const [loading, setLoading] = useState(() => {
    // Only show loading if there's no cached data
    if (!key) return false;
    const entry = cache.get(key);
    return !entry;
  });

  // Track whether we've done the initial fetch for this key
  const fetchedRef = useRef(false);
  const keyRef = useRef(key);

  // Reset when key changes
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      fetchedRef.current = false;

      // Try to load from cache for the new key
      if (key) {
        const entry = cache.get(key);
        if (entry) {
          setData(entry.data);
          setLoading(false);
        } else {
          setData(null);
          setLoading(true);
        }
      }
    }
  }, [key, cache]);

  const doFetch = useCallback(async (isBackground = false) => {
    if (!key || !fetchFn || !enabled) return;

    if (!isBackground) {
      // Only set loading if we have no data to show
      const entry = cache.get(key);
      if (!entry) setLoading(true);
    }

    try {
      const freshData = await fetchFn();
      // Only update if the key hasn't changed while we were fetching
      if (keyRef.current === key) {
        cache.set(key, freshData);
        setData(freshData);
      }
    } catch (err) {
      console.error(`[usePageCache] fetch error for "${key}":`, err);
    } finally {
      if (keyRef.current === key) {
        setLoading(false);
      }
    }
  }, [key, fetchFn, enabled, cache]);

  // Main effect: check cache, serve stale, revalidate
  useEffect(() => {
    if (!key || !enabled) return;

    const entry = cache.get(key);
    const now = Date.now();

    if (entry) {
      // We have cached data — serve it immediately
      setData(entry.data);
      setLoading(false);

      // If the entry is stale, revalidate in background
      if (now - entry.timestamp > ttl) {
        doFetch(true); // background — no loading spinner
      }
    } else {
      // No cache — fetch with loading state
      doFetch(false);
    }

    fetchedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ...deps]);

  // Force refresh (bypasses cache, always fetches)
  const refresh = useCallback(() => {
    if (key) cache.invalidate(key);
    return doFetch(false);
  }, [key, cache, doFetch]);

  // Manually update cached data (e.g. after optimistic update)
  const updateCache = useCallback((updater) => {
    if (!key) return;
    const newData = typeof updater === "function" ? updater(data) : updater;
    cache.set(key, newData);
    setData(newData);
  }, [key, cache, data]);

  return { data, loading, refresh, updateCache };
}
