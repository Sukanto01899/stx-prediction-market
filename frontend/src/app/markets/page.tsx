"use client";

import { MarketList } from "@/components/MarketList";
import { StatsOverview } from "@/components/StatsOverview";
import { MARKET_CATEGORIES } from "@/lib/constants";
import { useMarkets } from "@/lib/useMarkets";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

export default function MarketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [alerts, setAlerts] = useState<string[]>([]);
  const { markets, loading, error } = useMarkets(60000);

  useEffect(() => {
    const querySearch = searchParams.get("q") || "";
    const queryCategory = searchParams.get("category") || "all";
    setSearch(querySearch);
    setDebouncedSearch(querySearch);
    setCategory(queryCategory);
  }, [searchParams]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (category && category !== "all") params.set("category", category);
    const query = params.toString();
    router.replace(query ? `/markets?${query}` : "/markets");
  }, [debouncedSearch, category, router]);

  useEffect(() => {
    const computeOddsSnapshot = () => {
      const snapshot: Record<string, Record<string, string>> = {};
      markets.forEach((market) => {
        const total = market.totalPool || 0;
        const odds = {
          A: market.outcomeAPoll ? (total / market.outcomeAPoll).toFixed(2) : "0.00",
          B: market.outcomeBPool ? (total / market.outcomeBPool).toFixed(2) : "0.00",
          C: market.outcomeCPool ? (total / market.outcomeCPool).toFixed(2) : "0.00",
          D: market.outcomeDPool ? (total / market.outcomeDPool).toFixed(2) : "0.00",
        };
        snapshot[String(market.id)] = odds;
      });
      return snapshot;
    };

    const computeAlerts = () => {
      if (typeof window === "undefined") return;
      let watchlist: number[] = [];
      try {
        watchlist = JSON.parse(window.localStorage.getItem("watchlist") || "[]");
      } catch {
        watchlist = [];
      }

      const previous = (() => {
        try {
          return JSON.parse(window.localStorage.getItem("market-odds-cache") || "{}");
        } catch {
          return {};
        }
      })();

      const current = computeOddsSnapshot();
      const nextAlerts: string[] = [];

      markets.forEach((market) => {
        if (!watchlist.includes(market.id)) return;
        const blocksRemaining = market.settlementHeight - market.currentBurnHeight;
        if (blocksRemaining > 0 && blocksRemaining <= 12) {
          nextAlerts.push(`Settlement near for #${market.id} (${blocksRemaining} blocks)`);
        }

        const prevOdds = previous[String(market.id)];
        const currOdds = current[String(market.id)];
        if (prevOdds && currOdds) {
          if (
            prevOdds.A !== currOdds.A ||
            prevOdds.B !== currOdds.B ||
            prevOdds.C !== currOdds.C ||
            prevOdds.D !== currOdds.D
          ) {
            nextAlerts.push(`Odds changed on #${market.id}`);
          }
        }
      });

      setAlerts(nextAlerts);
      window.localStorage.setItem("market-odds-cache", JSON.stringify(current));
    };

    const handleWatchlistUpdated = () => computeAlerts();
    window.addEventListener("watchlist-updated", handleWatchlistUpdated);

    computeAlerts();
    const interval = window.setInterval(computeAlerts, 60000);
    return () => {
      window.removeEventListener("watchlist-updated", handleWatchlistUpdated);
      window.clearInterval(interval);
    };
  }, [markets]);

  const categoryChips = useMemo(
    () => ["all", ...MARKET_CATEGORIES.filter((item) => item !== "custom")],
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">All Markets</h1>
        <p className="text-gray-400">Browse and bet on Bitcoin-anchored prediction markets</p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {categoryChips.map((chip) => (
          <button
            key={chip}
            onClick={() => setCategory(chip)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
              category === chip
                ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-200"
                : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      <StatsOverview markets={markets} loading={loading} />
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Alerts</p>
          <ul className="mt-2 space-y-1 text-slate-300">
            {alerts.map((alert, index) => (
              <li key={`${alert}-${index}`}>• {alert}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets, descriptions, or categories"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>
        <div className="w-full md:w-56">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          >
            <option value="all">all</option>
            {MARKET_CATEGORIES.filter((item) => item !== "custom").map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      <MarketList
        markets={markets}
        search={debouncedSearch}
        category={category}
        loading={loading}
        error={error}
      />
    </div>
  );
}
