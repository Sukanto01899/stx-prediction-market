import { StacksMainnet, StacksTestnet } from "@stacks/network";

// Network configuration - TESTNET DEPLOYED
export const IS_MAINNET = false;
export const NETWORK = new StacksTestnet();

// Contract configuration - TESTNET ADDRESSES
export const CONTRACT_ADDRESS = "ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13";
export const CONTRACT_NAME = "btc-prediction-market";
export const TOKEN_CONTRACT_NAME = "prediction-token";
export const TRAIT_CONTRACT_NAME = "sip-010-trait";

// Fee constants (matching contract)
export const MARKET_CREATION_FEE = 5000000; // 5 STX in microSTX
export const PLATFORM_FEE_PERCENT = 200; // 2% in basis points
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
