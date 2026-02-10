import { StacksMainnet, StacksTestnet } from "@stacks/network";

// Network configuration - MAINNET DEPLOYED
export const IS_MAINNET = true;
export const NETWORK = new StacksMainnet();

// Contract configuration - MAINNET ADDRESSES
export const CONTRACT_ADDRESS = "SP1K2XGT5RNGT42N49BH936VDF8NXWNZJY15BPV4F";
export const CONTRACT_NAME = "btc-prediction-market-v4";
export const TOKEN_CONTRACT_NAME = "prediction-token-v4";
export const TRAIT_CONTRACT_NAME = "sip-010-trait-v4";

// Fee constants (matching contract)
export const MARKET_CREATION_FEE = 100; // 0.0001 STX in microSTX
export const PLATFORM_FEE_PERCENT = 200; // 2% in basis points
export const CREATOR_FEE_PERCENT = 100; // 1% in basis points
export const LP_FEE_PERCENT = 100; // 1% in basis points
export const LP_FEE_PRECISION = 1000000;
export const MIN_BET_AMOUNT = 1000000; // 1 STX minimum bet

// Outcome constants
export const OUTCOME_A = 1;
export const OUTCOME_B = 2;
export const OUTCOME_C = 4;
export const OUTCOME_D = 8;

// API endpoints
export const STACKS_API_URL = IS_MAINNET
  ? "https://api.mainnet.hiro.so"
  : "https://api.testnet.hiro.so";

export const BTC_EXPLORER_URL = IS_MAINNET
  ? "https://mempool.space"
  : "https://mempool.space/testnet";

export const MARKET_CATEGORIES = [
  "general",
  "crypto",
  "macro",
  "tech",
  "network",
  "sports",
  "culture",
  "governance",
  "stats",
  "custom",
] as const;
