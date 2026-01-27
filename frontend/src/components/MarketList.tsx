"use client";

import { MarketCard } from "./MarketCard";
import type { MarketData } from "@/lib/markets";

interface MarketListProps {
  markets: MarketData[];
  search?: string;
  category?: string;
  loading?: boolean;
  error?: string | null;
}

export function MarketList({
  markets,
  search = "",
  category = "all",
  loading = false,
  error = null,
}: MarketListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="h-72 rounded-2xl border border-slate-800 bg-slate-950/40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
        Failed to load markets: {error}
      </div>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();
  const filteredMarkets = markets.filter((market) => {
    const matchesCategory = normalizedCategory === "all"
      ? true
      : (market.category || "").toLowerCase() === normalizedCategory;
    const matchesSearch = normalizedSearch.length === 0
      ? true
      : `${market.title} ${market.description} ${market.category || ""}`
          .toLowerCase()
          .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  if (filteredMarkets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
        No markets match your filters yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {filteredMarkets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
