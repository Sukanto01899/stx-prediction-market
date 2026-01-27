"use client";

import { useEffect, useState } from "react";
import { useStacksAuth } from "@/contexts/StacksAuthContext";
import { Clock, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { BetModal } from "./BetModal";
import { openContractCall } from "@stacks/connect";
import { CONTRACT_ADDRESS, CONTRACT_NAME, NETWORK } from "@/lib/constants";
import { uintCV } from "@stacks/transactions";
import type { MarketData } from "@/lib/markets";

interface MarketCardProps {
  market: MarketData;
}

export function MarketCard({ market }: MarketCardProps) {
  const { isConnected } = useStacksAuth();
  const [expanded, setExpanded] = useState(false);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [betModalMode, setBetModalMode] = useState<"bet" | "cashout" | "liquidity">("bet");
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [oracleOutcome, setOracleOutcome] = useState("A");
  const [oracleSubmitting, setOracleSubmitting] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  const settlementConfirmations = 6;
  const challengeWindow = 6;
  const blocksRemaining = market.settlementHeight - market.currentBurnHeight;
  const timeRemaining = blocksRemaining * 10; // ~10 min per BTC block
  const estimatedClaimBlocks = market.settledAtBurnHeight !== undefined
    ? Math.max(0, market.settledAtBurnHeight + challengeWindow - market.currentBurnHeight)
    : Math.max(0, market.settlementHeight + settlementConfirmations + challengeWindow - market.currentBurnHeight);

  const formatSTX = (microSTX: number) => {
    return (microSTX / 1000000).toLocaleString();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  const calculateOdds = (pool: number, total: number) => {
    if (pool === 0) return "∞";
    return (total / pool).toFixed(2) + "x";
  };

  const calculatePercentage = (pool: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((pool / total) * 100);
  };

  const handleBet = (outcome: string) => {
    if (!isConnected) return;
    setSelectedOutcome(outcome);
    setBetModalMode("bet");
    setBetModalOpen(true);
  };

  const handleProvideLiquidity = () => {
    if (!isConnected) return;
    setSelectedOutcome("A");
    setBetModalMode("liquidity");
    setBetModalOpen(true);
  };

  const getWatchlist = () => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("watchlist") || "[]");
    } catch {
      return [];
    }
  };

  const setWatchlist = (list: number[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("watchlist", JSON.stringify(list));
    window.dispatchEvent(new Event("watchlist-updated"));
  };

  const toggleWatchlist = () => {
    const list = getWatchlist();
    const next = list.includes(market.id)
      ? list.filter((id: number) => id !== market.id)
      : [...list, market.id];
    setWatchlist(next);
    setIsWatched(next.includes(market.id));
  };

  useEffect(() => {
    const list = getWatchlist();
    setIsWatched(list.includes(market.id));
  }, [market.id]);

  const handleOracleSettle = async () => {
    if (!isConnected || oracleSubmitting) return;
    setOracleSubmitting(true);
    const outcomeValue = oracleOutcome === "A"
      ? 1
      : oracleOutcome === "B"
      ? 2
      : oracleOutcome === "C"
      ? 4
      : 8;
    try {
      await openContractCall({
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "oracle-settle",
        functionArgs: [uintCV(market.id), uintCV(outcomeValue)],
        onFinish: () => {
          setOracleSubmitting(false);
        },
        onCancel: () => {
          setOracleSubmitting(false);
        },
      });
    } catch (error) {
      console.error("Oracle settle failed", error);
      setOracleSubmitting(false);
    }
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_16px_40px_-26px_rgba(2,6,23,0.9)] transition hover:border-slate-600">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[11px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border ${
                  market.type === "binary"
                    ? "border-cyan-400/40 text-cyan-300 bg-cyan-500/10"
                    : "border-amber-400/40 text-amber-300 bg-amber-500/10"
                }`}
              >
                {market.type === "binary" ? "Binary" : "Multi-outcome"}
              </span>
              {market.settlementType === "oracle" && (
                <span className="text-[11px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-purple-400/40 text-purple-300 bg-purple-500/10">
                  Oracle market
                </span>
              )}
              {market.category && (
                <span className="text-[11px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-slate-700 text-slate-300 bg-slate-900/40">
                  {market.category}
                </span>
              )}
              <span className="text-xs text-slate-500">#{market.id}</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-1">{market.title}</h3>
            <p className="text-slate-400 text-sm">{market.description}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em]">Settlement</span>
            <span className="text-slate-200">#{market.settlementHeight}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-400">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
              <span className="uppercase tracking-[0.2em]">Pool</span>
            </div>
            <p className="text-sm text-slate-200 mt-1">{formatSTX(market.totalPool)} STX</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span className="uppercase tracking-[0.2em]">Time</span>
            </div>
            <p className="text-sm text-slate-200 mt-1">{formatTime(timeRemaining)}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-300" />
              <span className="uppercase tracking-[0.2em]">Block</span>
            </div>
            <p className="text-sm text-slate-200 mt-1">#{market.settlementHeight}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <span>Fees: 2% platform + 1% creator + 1% LP</span>
          <span>
            {estimatedClaimBlocks === 0 ? "Claimable now" : `Claimable in ${estimatedClaimBlocks} blocks`}
          </span>
          {market.expired && (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200">
              Expired
            </span>
          )}
          {market.refundable && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
              Refundable
            </span>
          )}
          {isConnected && (
            <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-400">
              LP: {formatSTX(market.lpLiquidity || 0)} STX - Claimable {formatSTX(market.lpClaimableFees || 0)} STX
            </span>
          )}
        </div>

        {market.settlementType === "oracle" && isConnected && market.oracleAddress && (
          <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-purple-300">Oracle Settle</p>
                <p className="text-slate-400 text-xs mt-1">
                  Authorized: {market.oracleAddress}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={oracleOutcome}
                  onChange={(e) => setOracleOutcome(e.target.value)}
                  className="rounded-lg border border-purple-500/30 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  <option value="A">Outcome A</option>
                  <option value="B">Outcome B</option>
                  {market.type === "multi" && (
                    <>
                      <option value="C">Outcome C</option>
                      <option value="D">Outcome D</option>
                    </>
                  )}
                </select>
                <button
                  onClick={handleOracleSettle}
                  disabled={oracleSubmitting}
                  className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {oracleSubmitting ? "Submitting..." : "Settle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outcome Bars */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{market.type === "binary" ? "Yes (Even)" : "Quarter A (0-63)"}</span>
              <span className="text-cyan-300">
                {calculateOdds(market.outcomeAPoll, market.totalPool)}
              </span>
            </div>
            <div className="h-7 bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400/70 transition-all"
                style={{
                  width: `${calculatePercentage(market.outcomeAPoll, market.totalPool)}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {calculatePercentage(market.outcomeAPoll, market.totalPool)}%
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{market.type === "binary" ? "No (Odd)" : "Quarter B (64-127)"}</span>
              <span className="text-amber-300">
                {calculateOdds(market.outcomeBPool, market.totalPool)}
              </span>
            </div>
            <div className="h-7 bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400/70 transition-all"
                style={{
                  width: `${calculatePercentage(market.outcomeBPool, market.totalPool)}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {calculatePercentage(market.outcomeBPool, market.totalPool)}%
              </span>
            </div>
          </div>

          {market.type === "multi" && expanded && (
            <>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Quarter C (128-191)</span>
                  <span className="text-emerald-300">
                    {calculateOdds(market.outcomeCPool || 0, market.totalPool)}
                  </span>
                </div>
                <div className="h-7 bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400/70 transition-all"
                    style={{
                      width: `${calculatePercentage(market.outcomeCPool || 0, market.totalPool)}%`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {calculatePercentage(market.outcomeCPool || 0, market.totalPool)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Quarter D (192-255)</span>
                  <span className="text-violet-300">
                    {calculateOdds(market.outcomeDPool || 0, market.totalPool)}
                  </span>
                </div>
                <div className="h-7 bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-violet-400/70 transition-all"
                    style={{
                      width: `${calculatePercentage(market.outcomeDPool || 0, market.totalPool)}%`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {calculatePercentage(market.outcomeDPool || 0, market.totalPool)}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {market.type === "multi" && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Show all outcomes
              </>
            )}
          </button>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleBet("A")}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Bet {market.type === "binary" ? "Yes" : "A"}
          </button>
          <button
            onClick={() => handleBet("B")}
            className="rounded-lg border border-amber-400/40 bg-amber-500/10 py-2 text-sm text-amber-200 transition hover:bg-amber-500/20"
          >
            Bet {market.type === "binary" ? "No" : "B"}
          </button>
          {market.type === "multi" && (
            <>
              <button
                onClick={() => handleBet("C")}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
              >
                Bet C
              </button>
              <button
                onClick={() => handleBet("D")}
                className="rounded-lg border border-violet-400/40 bg-violet-500/10 py-2 text-sm text-violet-200 transition hover:bg-violet-500/20"
              >
                Bet D
              </button>
            </>
          )}
        </div>

        <button
          onClick={handleProvideLiquidity}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900/60 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
        >
          Provide Liquidity (Earn Fee Share)
        </button>

        <button
          onClick={toggleWatchlist}
          className={`mt-3 w-full rounded-lg border py-2 text-sm transition ${
            isWatched
              ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-200"
              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600"
          }`}
        >
          {isWatched ? "Watching market" : "Add to watchlist"}
        </button>
      </div>

      {/* Bet Modal */}
      {betModalOpen && selectedOutcome && (
        <BetModal
          market={market}
          outcome={selectedOutcome}
          initialMode={betModalMode}
          onClose={() => setBetModalOpen(false)}
        />
      )}
    </>
  );
}

