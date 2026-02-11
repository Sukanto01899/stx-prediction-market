"use client";

import { useEffect, useState } from "react";
import { fetchMarkets, MarketData } from "./markets";

export const useMarkets = (pollMs = 60000) => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (mounted) setLoading(true);
        const data = await fetchMarkets();
        if (mounted) {
          setMarkets(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load market data",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, pollMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pollMs]);

  return { markets, loading, error };
};
