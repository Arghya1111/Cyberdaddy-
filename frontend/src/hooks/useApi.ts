'use client';

// ============================================================
// CyberDaddy — Generic Data Fetching Hook
// Provides loading, error, data state with retry support.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { APIError } from '@/lib/api';

export interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: APIError | null;
  refetch: () => void;
}

/**
 * Generic hook for fetching data from the backend API.
 * Re-fetches whenever `fetchFn` changes (wrap in useCallback to control).
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  options?: { enabled?: boolean; deps?: unknown[] }
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);
  const mountedRef = useRef(true);
  const [trigger, setTrigger] = useState(0);

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        if (!cancelled && mountedRef.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: APIError) => {
        if (!cancelled && mountedRef.current) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, trigger, ...(options?.deps ?? [])]);

  const refetch = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  return { data, isLoading, error, refetch };
}
