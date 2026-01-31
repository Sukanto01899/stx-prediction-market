"use client";

import { useEffect, useState } from "react";
import {
  fetchIsClaimable,
  fetchLpPosition,
  fetchLpState,
  fetchMarkets,
  fetchUserPosition,
  MarketData,
  LpPositionData,
  LpStateData,
  UserPositionData,
} from "./markets";
import { CREATOR_FEE_PERCENT, LP_FEE_PERCENT, LP_FEE_PRECISION, PLATFORM_FEE_PERCENT } from "./constants";

export interface PortfolioPosition {
  marketId: number;
  title: string;
  status: "open" | "settled" | "expired";
  outcomeAmounts: { outcome: string; amount: number }[];
  totalInvested: number;
  estimatedValue: number;
  estimatedPnl: number;
}

export interface ClaimableItem {
  marketId: number;
  title: string;
  type: "winnings" | "refund";
  amount: number;
  outcome?: string;
}

export interface LpEntry {
  marketId: number;
  title: string;
  liquidity: number;
  pendingFees: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  openPositions: number;
  estimatedValue: number;
  estimatedPnl: number;
  claimableWinnings: number;
  claimableRefunds: number;
  lpLiquidity: number;
  lpEarnings: number;
}

const TOTAL_FEE_BPS = PLATFORM_FEE_PERCENT + CREATOR_FEE_PERCENT + LP_FEE_PERCENT;

const getOutcomeLabel = (outcome: number) => {
  if (outcome === 1) return "A";
  if (outcome === 2) return "B";
  if (outcome === 4) return "C";
  if (outcome === 8) return "D";
  return "?";
};

const getOutcomePool = (market: MarketData, outcome: number) => {
  if (outcome === 1) return market.outcomeAPoll;
  if (outcome === 2) return market.outcomeBPool;
  if (outcome === 4) return market.outcomeCPool || 0;
  if (outcome === 8) return market.outcomeDPool || 0;
  return 0;
};

const getOutcomeAmount = (position: UserPositionData, outcome: number) => {
  if (outcome === 1) return position.outcomeAAmount;
  if (outcome === 2) return position.outcomeBAmount;
  if (outcome === 4) return position.outcomeCAmount;
  if (outcome === 8) return position.outcomeDAmount;
  return 0;
};

const estimateCashoutValue = (market: MarketData, position: UserPositionData) => {
  const totalPool = market.totalPool;
  if (totalPool === 0) return 0;
  const outcomes = [1, 2, 4, 8];
  return outcomes.reduce((sum, outcome) => {
    const amount = getOutcomeAmount(position, outcome);
    const pool = getOutcomePool(market, outcome);
    if (amount === 0 || pool === 0) return sum;
    const gross = (amount * totalPool) / pool;
    const fee = (gross * TOTAL_FEE_BPS) / 10000;
    return sum + (gross - fee);
  }, 0);
};

const calculateClaimableWinnings = (market: MarketData, position: UserPositionData) => {
  if (market.winningOutcome === undefined) return 0;
  const winningAmount = getOutcomeAmount(position, market.winningOutcome);
  if (winningAmount === 0) return 0;
  const winningPool = getOutcomePool(market, market.winningOutcome);
  if (winningPool === 0) return 0;
  const gross = (winningAmount * market.totalPool) / winningPool;
  const fee = (gross * TOTAL_FEE_BPS) / 10000;
  return gross - fee;
};

const calculateLpPending = (position: LpPositionData, state: LpStateData) => {
  const earned = Math.floor((position.liquidity * state.accFeePerLiquidity) / LP_FEE_PRECISION);
  return Math.max(0, earned - position.rewardDebt);
};

export const usePortfolio = (stxAddress: string | null, pollMs = 60000) => {
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalInvested: 0,
    openPositions: 0,
    estimatedValue: 0,
    estimatedPnl: 0,
    claimableWinnings: 0,
    claimableRefunds: 0,
    lpLiquidity: 0,
    lpEarnings: 0,
  });
  const [openPositions, setOpenPositions] = useState<PortfolioPosition[]>([]);
  const [claimableItems, setClaimableItems] = useState<ClaimableItem[]>([]);
  const [lpEntries, setLpEntries] = useState<LpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!stxAddress) {
        if (mounted) {
          setOpenPositions([]);
          setClaimableItems([]);
          setLpEntries([]);
          setSummary({
            totalInvested: 0,
            openPositions: 0,
            estimatedValue: 0,
            estimatedPnl: 0,
            claimableWinnings: 0,
            claimableRefunds: 0,
            lpLiquidity: 0,
            lpEarnings: 0,
          });
          setLoading(false);
          setError(null);
        }
        return;
      }

      try {
        if (mounted) setLoading(true);
        const markets = await fetchMarkets();

        const entries = await Promise.all(
          markets.map(async (market) => {
            try {
              const position = await fetchUserPosition(market.id, stxAddress);
              const lpPosition = await fetchLpPosition(market.id, stxAddress);
              if (!position && !lpPosition) return null;
              const lpState = lpPosition ? await fetchLpState(market.id) : null;
              const claimable = position && market.settled && !market.expired
                ? await fetchIsClaimable(market.id)
                : false;
              return { market, position, lpPosition, lpState, claimable };
            } catch {
              return null;
            }
          })
        );

        const nextOpen: PortfolioPosition[] = [];
        const nextClaimable: ClaimableItem[] = [];
        const nextLpEntries: LpEntry[] = [];

        let totalInvested = 0;
        let openInvested = 0;
        let estimatedValue = 0;
        let claimableWinnings = 0;
        let claimableRefunds = 0;
        let lpLiquidity = 0;
        let lpEarnings = 0;

        entries.filter(Boolean).forEach((entry) => {
          if (!entry) return;
          const { market, position, lpPosition, lpState, claimable } = entry;

          if (position) {
            totalInvested += position.totalInvested;

            if (!market.settled && !market.expired) {
              const estimated = estimateCashoutValue(market, position);
              const pnl = estimated - position.totalInvested;
              openInvested += position.totalInvested;
              estimatedValue += estimated;
              nextOpen.push({
                marketId: market.id,
                title: market.title,
                status: "open",
                outcomeAmounts: [
                  { outcome: "A", amount: position.outcomeAAmount },
                  { outcome: "B", amount: position.outcomeBAmount },
                  { outcome: "C", amount: position.outcomeCAmount },
                  { outcome: "D", amount: position.outcomeDAmount },
                ].filter((item) => item.amount > 0),
                totalInvested: position.totalInvested,
                estimatedValue: estimated,
                estimatedPnl: pnl,
              });
            }

            if (market.expired && !position.claimed && position.totalInvested > 0) {
              claimableRefunds += position.totalInvested;
              nextClaimable.push({
                marketId: market.id,
                title: market.title,
                type: "refund",
                amount: position.totalInvested,
              });
            }

            if (claimable && !position.claimed) {
              const winnings = calculateClaimableWinnings(market, position);
              if (winnings > 0) {
                claimableWinnings += winnings;
                nextClaimable.push({
                  marketId: market.id,
                  title: market.title,
                  type: "winnings",
                  amount: winnings,
                  outcome: market.winningOutcome ? getOutcomeLabel(market.winningOutcome) : undefined,
                });
              }
            }
          }

          if (lpPosition && lpState) {
            const pending = calculateLpPending(lpPosition, lpState);
            lpLiquidity += lpPosition.liquidity;
            lpEarnings += pending;
            nextLpEntries.push({
              marketId: market.id,
              title: market.title,
              liquidity: lpPosition.liquidity,
              pendingFees: pending,
            });
          }
        });

        if (mounted) {
          setOpenPositions(nextOpen);
          setClaimableItems(nextClaimable);
          setLpEntries(nextLpEntries);
          setSummary({
            totalInvested,
            openPositions: nextOpen.length,
            estimatedValue,
            estimatedPnl: estimatedValue - openInvested,
            claimableWinnings,
            claimableRefunds,
            lpLiquidity,
            lpEarnings,
          });
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load portfolio");
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
  }, [stxAddress, pollMs]);

  return { summary, openPositions, claimableItems, lpEntries, loading, error };
};
