"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { useStacksAuth } from "@/contexts/StacksAuthContext";
import { openContractCall } from "@stacks/connect";
import { 
  uintCV, 
  FungibleConditionCode,
  makeStandardSTXPostCondition,
} from "@stacks/transactions";
import { NETWORK, CONTRACT_ADDRESS, CONTRACT_NAME, CREATOR_FEE_PERCENT, LP_FEE_PERCENT, PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { fetchUserPosition } from "@/lib/markets";

interface Market {
  id: number;
  title: string;
  totalPool: number;
  outcomeAPoll: number;
  outcomeBPool: number;
  outcomeCPool?: number;
  outcomeDPool?: number;
}

interface BetModalProps {
  market: Market;
  outcome: string;
  initialMode?: "bet" | "cashout" | "liquidity";
  onClose: () => void;
}

export function BetModal({ market, outcome, initialMode = "bet", onClose }: BetModalProps) {
  const { stxAddress } = useStacksAuth();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"bet" | "cashout" | "liquidity">(initialMode);
  const [userPosition, setUserPosition] = useState<{
    outcomeAAmount: number;
    outcomeBAmount: number;
    outcomeCAmount: number;
    outcomeDAmount: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPosition = async () => {
      if (!stxAddress || mode !== "cashout") {
        if (mounted) setUserPosition(null);
        return;
      }
      try {
        const position = await fetchUserPosition(market.id, stxAddress);
        if (mounted) {
          setUserPosition(
            position
              ? {
                  outcomeAAmount: position.outcomeAAmount,
                  outcomeBAmount: position.outcomeBAmount,
                  outcomeCAmount: position.outcomeCAmount,
                  outcomeDAmount: position.outcomeDAmount,
                }
              : null
          );
        }
      } catch {
        if (mounted) setUserPosition(null);
      }
    };
    loadPosition();
    return () => {
      mounted = false;
    };
  }, [stxAddress, market.id, mode]);

  const getOutcomePool = () => {
    switch (outcome) {
      case "A": return market.outcomeAPoll;
      case "B": return market.outcomeBPool;
      case "C": return market.outcomeCPool || 0;
      case "D": return market.outcomeDPool || 0;
      default: return 0;
    }
  };

  const calculatePotentialWin = () => {
    const betAmount = parseFloat(amount) || 0;
    const betMicroSTX = betAmount * 1000000;
    const currentPool = getOutcomePool();
    const newPool = currentPool + betMicroSTX;
    const newTotal = market.totalPool + betMicroSTX;
    
    if (newPool === 0) return 0;
    
    const grossPayout = (betMicroSTX * newTotal) / newPool;
    const fee = grossPayout * ((PLATFORM_FEE_PERCENT + CREATOR_FEE_PERCENT + LP_FEE_PERCENT) / 10000);
    const netPayout = grossPayout - fee;
    
    return (netPayout / 1000000).toFixed(2);
  };

  const calculateCashout = () => {
    const cashAmount = parseFloat(amount) || 0;
    const cashMicroSTX = cashAmount * 1000000;
    const currentPool = getOutcomePool();
    if (currentPool === 0) return "0.00";
    const grossPayout = (cashMicroSTX * market.totalPool) / currentPool;
    const fee = grossPayout * ((PLATFORM_FEE_PERCENT + CREATOR_FEE_PERCENT + LP_FEE_PERCENT) / 10000);
    const netPayout = grossPayout - fee;
    return (netPayout / 1000000).toFixed(2);
  };

  const getUserOutcomeAmount = () => {
    if (!userPosition) return 0;
    switch (outcome) {
      case "A": return userPosition.outcomeAAmount;
      case "B": return userPosition.outcomeBAmount;
      case "C": return userPosition.outcomeCAmount;
      case "D": return userPosition.outcomeDAmount;
      default: return 0;
    }
  };

  const cashoutPreview = () => {
    const cashAmount = parseFloat(amount) || 0;
    const cashMicroSTX = cashAmount * 1000000;
    const currentPool = getOutcomePool();
    if (currentPool === 0 || cashMicroSTX === 0) {
      return {
        gross: 0,
        fees: 0,
        net: 0,
        slippagePct: 0,
      };
    }
    const grossPayout = (cashMicroSTX * market.totalPool) / currentPool;
    const totalFeeBps = PLATFORM_FEE_PERCENT + CREATOR_FEE_PERCENT + LP_FEE_PERCENT;
    const fees = (grossPayout * totalFeeBps) / 10000;
    const net = grossPayout - fees;
    const slippagePct = cashMicroSTX > 0
      ? ((grossPayout - cashMicroSTX) / cashMicroSTX) * 100
      : 0;
    return { gross: grossPayout, fees, net, slippagePct };
  };

  const getFunctionName = () => {
    if (mode === "cashout") return "cash-out";
    if (mode === "liquidity") return "add-liquidity";
    switch (outcome) {
      case "A": return "bet-outcome-a";
      case "B": return "bet-outcome-b";
      case "C": return "bet-outcome-c";
      case "D": return "bet-outcome-d";
      default: return "bet-outcome-a";
    }
  };

  const getOutcomeValue = () => {
    switch (outcome) {
      case "A": return 1;
      case "B": return 2;
      case "C": return 4;
      case "D": return 8;
      default: return 1;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stxAddress || !amount) return;

    setIsSubmitting(true);

    const betAmountMicroSTX = Math.floor(parseFloat(amount) * 1000000);

    try {
      await openContractCall({
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: getFunctionName(),
        functionArgs: mode === "cashout"
          ? [uintCV(market.id), uintCV(getOutcomeValue()), uintCV(betAmountMicroSTX)]
          : [uintCV(market.id), uintCV(betAmountMicroSTX)],
        postConditions: mode === "bet" ? [
          makeStandardSTXPostCondition(
            stxAddress,
            FungibleConditionCode.Equal,
            betAmountMicroSTX
          ),
        ] : mode === "liquidity" ? [
          makeStandardSTXPostCondition(
            stxAddress,
            FungibleConditionCode.Equal,
            betAmountMicroSTX
          ),
        ] : [],
        onFinish: (data) => {
          console.log("Transaction submitted:", data);
          onClose();
        },
        onCancel: () => {
          setIsSubmitting(false);
        },
      });
    } catch (error) {
      console.error("Error placing bet:", error);
      setIsSubmitting(false);
    }
  };

  const outcomeColors: Record<string, string> = {
    A: "text-stacks border-stacks",
    B: "text-bitcoin border-bitcoin",
    C: "text-green-400 border-green-400",
    D: "text-purple-400 border-purple-400",
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold mb-2">
          {mode === "bet" ? "Place Your Bet" : mode === "cashout" ? "Cash Out" : "Provide Liquidity"}
        </h2>
        <p className="text-slate-400 text-sm mb-6">{market.title}</p>

        <div className="flex rounded-lg border border-slate-700 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("bet")}
            className={`flex-1 rounded-md py-2 text-sm transition ${
              mode === "bet" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Bet
          </button>
          <button
            type="button"
            onClick={() => setMode("cashout")}
            className={`flex-1 rounded-md py-2 text-sm transition ${
              mode === "cashout" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Cash Out
          </button>
          <button
            type="button"
            onClick={() => setMode("liquidity")}
            className={`flex-1 rounded-md py-2 text-sm transition ${
              mode === "liquidity" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Liquidity
          </button>
        </div>

        {/* Selected Outcome */}
        {mode !== "liquidity" && (
          <div className={`border rounded-lg p-4 mb-6 ${outcomeColors[outcome]}`}>
            <span className="text-sm opacity-75">
              {mode === "bet" ? "You're betting on:" : "You're cashing out:"}
            </span>
            <p className="text-lg font-semibold">Outcome {outcome}</p>
          </div>
        )}

        {/* Bet Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">
              Bet Amount (STX)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.1"
                step="0.1"
                className="input w-full pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                STX
              </span>
            </div>
          </div>

          {/* Potential Win */}
          {parseFloat(amount) > 0 && (
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">
                  {mode === "bet"
                    ? "Potential Win:"
                    : mode === "cashout"
                    ? "Estimated Cash Out:"
                    : "Estimated LP Share Value:"}
                </span>
                <span className="text-green-400 font-semibold">
                  {mode === "bet"
                    ? calculatePotentialWin()
                    : mode === "cashout"
                    ? calculateCashout()
                    : amount} STX
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Fees:</span>
                <span className="text-slate-300">2% platform + 1% creator + 1% LP</span>
              </div>
              {mode === "cashout" && (() => {
                const preview = cashoutPreview();
                const slippageLabel = preview.slippagePct >= 0 ? "Premium" : "Slippage";
                return (
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gross payout:</span>
                      <span>{(preview.gross / 1000000).toFixed(4)} STX</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total fees:</span>
                      <span>{(preview.fees / 1000000).toFixed(4)} STX</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net payout:</span>
                      <span className="text-amber-300">{(preview.net / 1000000).toFixed(4)} STX</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{slippageLabel} vs stake:</span>
                      <span className={preview.slippagePct >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {preview.slippagePct >= 0 ? "+" : ""}
                        {preview.slippagePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 text-sm text-slate-400 mb-6">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              {mode === "liquidity"
                ? "Liquidity providers earn a share of fees. Liquidity can be withdrawn before settlement."
                : mode === "cashout"
                ? `You can cash out up to ${((getUserOutcomeAmount() || 0) / 1000000).toLocaleString()} STX on this outcome.`
                : "This market will settle based on the Bitcoin block hash at the specified block height. Outcomes are determined trustlessly."}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              !amount ||
              parseFloat(amount) < 0.1 ||
              isSubmitting ||
              (mode === "cashout" && parseFloat(amount) * 1000000 > getUserOutcomeAmount())
            }
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>{mode === "bet" ? "Place Bet" : mode === "cashout" ? "Cash Out" : "Provide Liquidity"}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
