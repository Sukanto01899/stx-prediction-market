const { StacksTestnet, StacksMainnet } = require("@stacks/network");
const {
  makeSTXTransfer,
  broadcastTransaction,
  getAddressFromPrivateKey,
  TransactionVersion,
} = require("@stacks/transactions");

const STACKS_API_URL = process.env.STACKS_API_URL || "https://api.testnet.hiro.so";
const PRIVATE_KEY = process.env.SWEEP_PRIVATE_KEY;
const DEST_ADDRESS = process.env.SWEEP_DEST_ADDRESS;
const MIN_STX = Number(process.env.SWEEP_MIN_STX || "100");
const POLL_MS = Number(process.env.SWEEP_POLL_MS || "5000");
const NETWORK_TYPE = (process.env.SWEEP_NETWORK || "testnet").toLowerCase();

if (!PRIVATE_KEY || !DEST_ADDRESS) {
  console.error("Missing SWEEP_PRIVATE_KEY or SWEEP_DEST_ADDRESS in env.");
  process.exit(1);
}

const network = NETWORK_TYPE === "mainnet" ? new StacksMainnet() : new StacksTestnet();
network.coreApiUrl = STACKS_API_URL;

const senderAddress = getAddressFromPrivateKey(
  PRIVATE_KEY,
  NETWORK_TYPE === "mainnet" ? TransactionVersion.Mainnet : TransactionVersion.Testnet
);

const microstx = (stx) => Math.floor(stx * 1_000_000);

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
};

const getBalance = async () => {
  const data = await fetchJson(`${STACKS_API_URL}/v2/accounts/${senderAddress}`);
  return Number(data.balance || 0);
};

const getNonce = async () => {
  const data = await fetchJson(`${STACKS_API_URL}/v2/accounts/${senderAddress}?proof=0`);
  return Number(data.nonce || 0);
};

const sweepOnce = async () => {
  const balance = await getBalance();
  const minMicro = microstx(MIN_STX);
  if (balance < minMicro) {
    console.log(`[skip] balance ${balance} < min ${minMicro}`);
    return;
  }

  const fee = microstx(0.01); // 0.01 STX fee buffer
  const amount = balance - fee;
  if (amount <= 0) {
    console.log("[skip] balance too low after fee");
    return;
  }

  const nonce = await getNonce();
  const txOptions = {
    recipient: DEST_ADDRESS,
    amount,
    senderKey: PRIVATE_KEY,
    network,
    fee,
    nonce,
  };

  const tx = await makeSTXTransfer(txOptions);
  const result = await broadcastTransaction(tx, network);
  console.log("[sent]", result);
};

const loop = async () => {
  try {
    await sweepOnce();
  } catch (error) {
    console.error("[error]", error.message || error);
  } finally {
    setTimeout(loop, POLL_MS);
  }
};

console.log("Sweep bot running");
console.log("From:", senderAddress);
console.log("To:", DEST_ADDRESS);
console.log("Min STX:", MIN_STX);
console.log("Poll:", POLL_MS, "ms");
loop();
