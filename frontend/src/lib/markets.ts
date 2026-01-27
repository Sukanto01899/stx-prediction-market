import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_URL } from "./constants";
import { deserializeCV, serializeCV, uintCV, cvToValue } from "@stacks/transactions";

export interface MarketData {
  id: number;
  title: string;
  description: string;
  category?: string;
  settlementType?: string;
  settlementHeight: number;
  currentBurnHeight: number;
  settledAtBurnHeight?: number;
  totalPool: number;
  outcomeAPoll: number;
  outcomeBPool: number;
  outcomeCPool?: number;
  outcomeDPool?: number;
  settled: boolean;
  expired?: boolean;
  refundable?: boolean;
  type: "binary" | "multi";
  oracleAddress?: string;
  lpLiquidity?: number;
  lpClaimableFees?: number;
}

const hexToBytes = (hex: string) => {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(normalized.substr(i * 2, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const readOnlyCall = async (fn: string, args: Uint8Array[]) => {
  const res = await fetch(
    `${STACKS_API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${fn}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: CONTRACT_ADDRESS,
        arguments: args.map((arg) => `0x${bytesToHex(arg)}`),
      }),
    }
  );
  const json = await res.json();
  if (!json.okay) {
    throw new Error(json.cause || "Read-only call failed");
  }
  const cv = deserializeCV(hexToBytes(json.result));
  return cvToValue(cv);
};

const fetchBurnHeight = async () => {
  const res = await fetch(`${STACKS_API_URL}/v2/info`);
  const json = await res.json();
  return Number(json.burn_block_height || 0);
};

const toNumber = (value: unknown) => Number(value ?? 0);

export const fetchMarketCount = async () => {
  const value = await readOnlyCall("get-market-count", []);
  return toNumber(value);
};

export const fetchMarket = async (marketId: number, burnHeight: number): Promise<MarketData | null> => {
  const value = await readOnlyCall("get-market", [serializeCV(uintCV(marketId))]);
  if (!value) return null;

  const possibleOutcomes = toNumber(value["possible-outcomes"]);
  const hasC = (possibleOutcomes & 4) !== 0;
  const hasD = (possibleOutcomes & 8) !== 0;

  const settledAt = value["settled-at-burn-height"];
  const settledAtBurnHeight = settledAt === null ? undefined : toNumber(settledAt);
  const oracle = value["oracle"];
  const oracleAddress = oracle === null ? undefined : String(oracle);

  const totalPool = toNumber(value["total-pool"]);
  const expired = Boolean(value["expired"]);

  return {
    id: marketId,
    title: String(value["title"]),
    description: String(value["description"]),
    category: value["category"] ? String(value["category"]) : undefined,
    settlementType: value["settlement-type"] ? String(value["settlement-type"]) : undefined,
    settlementHeight: toNumber(value["settlement-burn-height"]),
    currentBurnHeight: burnHeight,
    settledAtBurnHeight,
    totalPool,
    outcomeAPoll: toNumber(value["outcome-a-pool"]),
    outcomeBPool: toNumber(value["outcome-b-pool"]),
    outcomeCPool: toNumber(value["outcome-c-pool"]),
    outcomeDPool: toNumber(value["outcome-d-pool"]),
    settled: Boolean(value["settled"]),
    expired,
    refundable: expired,
    type: hasC || hasD ? "multi" : "binary",
    oracleAddress,
    lpLiquidity: 0,
    lpClaimableFees: 0,
  };
};

export const fetchMarkets = async (): Promise<MarketData[]> => {
  const burnHeight = await fetchBurnHeight();
  const count = await fetchMarketCount();
  if (!count) return [];
  const ids = Array.from({ length: count }, (_, i) => i);
  const markets = await Promise.all(ids.map((id) => fetchMarket(id, burnHeight)));
  return markets.filter((market): market is MarketData => market !== null);
};
