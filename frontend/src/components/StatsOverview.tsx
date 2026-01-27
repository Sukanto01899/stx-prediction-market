"use client";

import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import type { MarketData } from "@/lib/markets";

interface StatsOverviewProps {
  markets: MarketData[];
  loading?: boolean;
}

const formatSTX = (microSTX: number) =>
  (microSTX / 1000000).toLocaleString();

export function StatsOverview({ markets, loading = false }: StatsOverviewProps) {
  const totalMarkets = markets.length;
  const totalVolume = markets.reduce((sum, market) => sum + (market.totalPool || 0), 0);
  const activeMarkets = markets.filter((market) => !market.settled && !market.expired).length;
  const avgSettlementBlocks = markets.length
    ? Math.round(
        markets.reduce(
          (sum, market) => sum + Math.max(0, market.settlementHeight - market.currentBurnHeight),
          0
        ) / markets.length
      )
    : 0;

  const stats = [
    {
      label: "Total Markets",
      value: loading ? "Loading..." : `${totalMarkets}`,
      icon: TrendingUp,
      change: "On testnet",
    },
    {
      label: "Total Volume",
      value: loading ? "Loading..." : `${formatSTX(totalVolume)} STX`,
      icon: DollarSign,
      change: "On-chain pools",
    },
    {
      label: "Active Markets",
      value: loading ? "Loading..." : `${activeMarkets}`,
      icon: Users,
      change: "Not settled",
    },
    {
      label: "Avg Settlement",
      value: loading
        ? "Loading..."
        : avgSettlementBlocks > 0
        ? `~${avgSettlementBlocks * 10} min`
        : "N/A",
      icon: Clock,
      change: "Burn blocks",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-stacks mt-2">{stat.change}</p>
            </div>
            <stat.icon className="w-10 h-10 text-slate-600" />
          </div>
        </div>
      ))}
    </div>
  );
}
