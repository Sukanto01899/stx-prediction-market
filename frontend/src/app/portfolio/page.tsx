"use client";

import { useStacksAuth } from "@/contexts/StacksAuthContext";
import { usePortfolio } from "@/lib/usePortfolio";
import { AlertCircle, TrendingUp, Clock, Wallet, Coins, BadgeCheck } from "lucide-react";

export default function PortfolioPage() {
  const { isConnected, stxAddress } = useStacksAuth();
  const { summary, openPositions, claimableItems, lpEntries, loading, error } = usePortfolio(stxAddress);

  const formatSTX = (microSTX: number) => (microSTX / 1000000).toLocaleString();

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
          <p className="text-gray-400">
            Please connect your Stacks wallet to view your portfolio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Portfolio</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-300" />
            Total Invested
          </p>
          <p className="text-2xl font-bold">{formatSTX(summary.totalInvested)} STX</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Est. P/L
          </p>
          <p className={`text-2xl font-bold ${summary.estimatedPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {summary.estimatedPnl >= 0 ? "+" : ""}
            {formatSTX(summary.estimatedPnl)} STX
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-amber-300" />
            Claimable
          </p>
          <p className="text-2xl font-bold text-amber-400">
            {formatSTX(summary.claimableWinnings + summary.claimableRefunds)} STX
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Coins className="w-4 h-4 text-purple-300" />
            LP Earnings
          </p>
          <p className="text-2xl font-bold text-purple-300">{formatSTX(summary.lpEarnings)} STX</p>
        </div>
      </div>

      {loading && (
        <div className="bg-gray-800 rounded-xl p-4 mb-6 text-sm text-gray-300">
          Loading portfolio data...
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Claimable Winnings / Refunds */}
      <div className="bg-gray-800 rounded-xl overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Claimable</h2>
          <p className="text-sm text-gray-400">Winnings or refunds ready to claim</p>
        </div>
        {claimableItems.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p>No claimable items yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {claimableItems.map((item) => (
              <div key={`${item.marketId}-${item.type}`} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-gray-400">
                      {item.type === "winnings"
                        ? `Winnings${item.outcome ? ` (Outcome ${item.outcome})` : ""}`
                        : "Refund"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-amber-300">
                      {formatSTX(item.amount)} STX
                    </p>
                    <p className="text-xs text-gray-500">Market #{item.marketId}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Positions List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Open Positions</h2>
        </div>
        
        {openPositions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No positions yet. Start betting on prediction markets!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {openPositions.map((position) => (
              <div key={position.marketId} className="p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{position.title}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      {position.outcomeAmounts.map((outcome) => (
                        <span
                          key={outcome.outcome}
                          className="px-2 py-1 rounded bg-slate-700/50 text-slate-200"
                        >
                          {outcome.outcome}: {formatSTX(outcome.amount)} STX
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Clock className="w-4 h-4" />
                      <span className="capitalize font-medium">{position.status}</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Est. Value: {formatSTX(position.estimatedValue)} STX
                    </p>
                    <p className={`text-sm ${position.estimatedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {position.estimatedPnl >= 0 ? "+" : ""}
                      {formatSTX(position.estimatedPnl)} STX
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LP Earnings */}
      <div className="bg-gray-800 rounded-xl overflow-hidden mt-8">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">LP Earnings</h2>
        </div>
        {lpEntries.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p>No liquidity positions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {lpEntries.map((entry) => (
              <div key={entry.marketId} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{entry.title}</h3>
                    <p className="text-sm text-gray-400">Market #{entry.marketId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      Liquidity: {formatSTX(entry.liquidity)} STX
                    </p>
                    <p className="text-lg font-semibold text-purple-300">
                      {formatSTX(entry.pendingFees)} STX
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
