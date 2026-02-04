"use client";

import { useState } from "react";
import { useStacksAuth } from "@/contexts/StacksAuthContext";
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_NAME, 
  MARKET_CREATION_FEE,
  MARKET_CATEGORIES,
  NETWORK 
} from "@/lib/constants";
import { openContractCall } from "@stacks/connect";
import { 
  uintCV, 
  stringAsciiCV,
  principalCV,
  noneCV,
  someCV,
  boolCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode
} from "@stacks/transactions";
import { AlertCircle, Bitcoin, Calendar, DollarSign } from "lucide-react";

export default function CreateMarketPage() {
  const { isConnected, stxAddress } = useStacksAuth();
  const defaultMarket = {
    marketType: "binary" as const,
    question: "Will BTC close above $85k by end of Q2?",
    description:
      "Market resolves at the specified Bitcoin block height. Reference price uses major exchange indices.",
    category: "crypto",
    customCategory: "",
    maxPoolCap: "10000",
    settlementBlock: "900000",
    oracleAddress: "",
  };

  const [marketType, setMarketType] = useState<"binary" | "multi">(
    defaultMarket.marketType
  );
  const [question, setQuestion] = useState(defaultMarket.question);
  const [description, setDescription] = useState(defaultMarket.description);
  const [category, setCategory] = useState(defaultMarket.category);
  const [customCategory, setCustomCategory] = useState(defaultMarket.customCategory);
  const [maxPoolCap, setMaxPoolCap] = useState(defaultMarket.maxPoolCap);
  const [settlementBlock, setSettlementBlock] = useState(
    defaultMarket.settlementBlock
  );
  const [oracleAddress, setOracleAddress] = useState(defaultMarket.oracleAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyDemoData = () => {
    setMarketType(defaultMarket.marketType);
    setQuestion(defaultMarket.question);
    setDescription(defaultMarket.description);
    setCategory(defaultMarket.category);
    setCustomCategory(defaultMarket.customCategory);
    setMaxPoolCap(defaultMarket.maxPoolCap);
    setSettlementBlock(defaultMarket.settlementBlock);
    setOracleAddress(defaultMarket.oracleAddress);
  };

  const handleCreateMarket = async () => {
    if (!isConnected || !stxAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!question || !settlementBlock || !maxPoolCap) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const functionName = marketType === "binary" 
        ? "create-binary-market" 
        : "create-multi-market";

      const resolvedCategory = category === "custom" ? customCategory : category;
      const sanitizedCategory = (resolvedCategory || "general")
        .toLowerCase()
        .replace(/[^a-z0-9-_ ]/g, "")
        .slice(0, 32);

      const oracleArg = oracleAddress.trim()
        ? someCV(principalCV(oracleAddress.trim()))
        : noneCV();

      const maxPoolMicro = Math.floor(parseFloat(maxPoolCap) * 1000000);
      if (!Number.isFinite(maxPoolMicro) || maxPoolMicro <= 0) {
        alert("Please enter a valid max pool cap");
        setIsSubmitting(false);
        return;
      }

      const functionArgs = marketType === "binary"
        ? [
            stringAsciiCV(question.slice(0, 100)),
            stringAsciiCV(description.slice(0, 500) || "No description"),
            stringAsciiCV(sanitizedCategory || "general"),
            oracleArg,
            uintCV(maxPoolMicro),
            uintCV(parseInt(settlementBlock)),
          ]
        : [
            stringAsciiCV(question.slice(0, 100)),
            stringAsciiCV(description.slice(0, 500) || "No description"),
            stringAsciiCV(sanitizedCategory || "general"),
            oracleArg,
            uintCV(maxPoolMicro),
            uintCV(parseInt(settlementBlock)),
            boolCV(true),
            boolCV(true),
            boolCV(true),
            boolCV(true),
          ];

      // Add post condition for the creation fee
      const postConditions = [
        makeStandardSTXPostCondition(
          stxAddress,
          FungibleConditionCode.Equal,
          MARKET_CREATION_FEE
        ),
      ];

      await openContractCall({
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs,
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          console.log("Transaction submitted:", data);
          alert(`Market creation submitted! TX: ${data.txId}`);
          setMarketType(defaultMarket.marketType);
          setQuestion(defaultMarket.question);
          setDescription(defaultMarket.description);
          setCategory(defaultMarket.category);
          setCustomCategory(defaultMarket.customCategory);
          setMaxPoolCap(defaultMarket.maxPoolCap);
          setOracleAddress(defaultMarket.oracleAddress);
          setSettlementBlock(defaultMarket.settlementBlock);
        },
        onCancel: () => {
          console.log("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error creating market:", error);
      alert("Failed to create market. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative max-w-2xl mx-auto font-display text-slate-100">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur">
            <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="font-serif-display text-3xl font-semibold mb-2">Connect Wallet</h2>
            <p className="text-slate-300">
              Connect your Stacks wallet to create a professionally governed prediction market.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-48 left-0 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="relative max-w-6xl mx-auto font-display text-slate-100">
        <header className="mb-10 animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            Create Market
          </span>
          <h1 className="font-serif-display text-4xl md:text-5xl font-semibold mt-4">
            Launch a high-integrity prediction market
          </h1>
          <p className="text-slate-300 mt-3 max-w-2xl">
            Define the question, select the outcome structure, and lock in the settlement block. We’ll handle
            the on-chain creation and fee enforcement.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={applyDemoData}
              className="rounded-full border border-slate-800 bg-slate-950/50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600"
            >
              Fill demo data
            </button>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur">
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Market Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <button
                    onClick={() => setMarketType("binary")}
                    className={`rounded-xl border px-5 py-4 text-left transition-all ${
                      marketType === "binary"
                        ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
                        : "border-slate-800 bg-slate-950/30 hover:border-slate-600"
                    }`}
                  >
                    <h3 className="font-serif-display text-lg">Binary</h3>
                    <p className="text-sm text-slate-400 mt-1">Yes/No, winner-takes-all</p>
                  </button>
                  <button
                    onClick={() => setMarketType("multi")}
                    className={`rounded-xl border px-5 py-4 text-left transition-all ${
                      marketType === "multi"
                        ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
                        : "border-slate-800 bg-slate-950/30 hover:border-slate-600"
                    }`}
                  >
                    <h3 className="font-serif-display text-lg">Multi-Outcome</h3>
                    <p className="text-sm text-slate-400 mt-1">Up to 4 possible outcomes</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Question
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Will BTC close above $100k by Dec 31?"
                  maxLength={100}
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <p className="text-xs text-slate-500 mt-2">{question.length}/100 characters</p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, data sources, and settlement conditions."
                  maxLength={500}
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <p className="text-xs text-slate-500 mt-2">{description.length}/500 characters</p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Category
                </label>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  >
                    {MARKET_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {category === "custom" && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Custom category"
                      maxLength={32}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">32 chars max. Stored on-chain.</p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Max Pool Cap (STX)
                </label>
                <input
                  type="number"
                  value={maxPoolCap}
                  onChange={(e) => setMaxPoolCap(e.target.value)}
                  placeholder="e.g., 5000"
                  min="1"
                  step="1"
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Hard cap for total liquidity in this market.
                </p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Settlement Bitcoin Block
                </label>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                  <Bitcoin className="h-5 w-5 text-amber-400" />
                  <input
                    type="number"
                    value={settlementBlock}
                    onChange={(e) => setSettlementBlock(e.target.value)}
                    placeholder="875000"
                    className="w-full bg-transparent text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  The market resolves using the hash of this Bitcoin block height.
                </p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Oracle Address (optional)
                </label>
                <input
                  type="text"
                  value={oracleAddress}
                  onChange={(e) => setOracleAddress(e.target.value)}
                  placeholder="STX address that can settle outcome"
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                <p className="text-xs text-slate-500 mt-2">
                  If set, settlement uses oracle outcome instead of Bitcoin hash.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleCreateMarket}
                disabled={isSubmitting || !question || !settlementBlock}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-amber-400 px-6 py-4 text-base font-semibold text-slate-950 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700"
              >
                {isSubmitting ? "Creating Market..." : "Create Market (0.0001 STX)"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.9)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Network Fee</p>
                  <p className="text-lg font-semibold">0.0001 STX creation fee</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4">
                The fee is enforced on-chain to reduce spam and align governance incentives.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timing</p>
                  <p className="text-lg font-semibold">Choose a safe block height</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>Pick a future block to avoid reorg risk.</li>
                <li>Give traders enough time to participate.</li>
                <li>Verify settlement sources in the description.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Preview</p>
              <h3 className="font-serif-display text-lg mt-3">
                {question || "Market question will appear here"}
              </h3>
              <p className="text-sm text-slate-400 mt-3">
                {description || "Add a description to help traders understand the rules and data sources."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                {marketType === "binary" ? "Binary Market" : "Multi-Outcome Market"}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


