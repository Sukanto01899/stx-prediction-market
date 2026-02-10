# STX Prediction Market

Stacks-native prediction markets anchored to Bitcoin finality. Markets settle using Bitcoin block hashes for deterministic, on-chain resolution. Built with Clarity 4.

---

## Overview

STX Prediction Market lets creators launch binary or multi-outcome markets that settle trustlessly. Participants stake STX on outcomes, pools drive odds, and winners claim pro-rata payouts after settlement.

Key ideas:
- Bitcoin block hashes provide unbiased settlement data.
- No admin settlement; resolution is deterministic.
- Post-conditions enforce transfer safety at the UI layer.

---

## Project Structure

```
stx-prediction-market/
├── Clarinet.toml                # Clarinet configuration
├── contracts/
│   ├── stx-pred-market-v3.clar      # Core prediction market contract
│   └── pred-token-v3.clar           # SIP-010 reward token
├── tests/
│   └── btc-prediction-market.test.ts
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/                 # App router
│   │   ├── components/          # UI components
│   │   ├── contexts/            # Auth context
│   │   └── lib/                 # Utilities
│   └── package.json
└── README.md
```

---

## Fees

| Action | Fee |
|--------|-----|
| Market Creation | 0.0001 STX |
| Winning Payouts | 2% platform fee + 1% creator fee + 1% LP fee |
| Minimum Bet | 1 STX |

---

## Contract Details

Contracts:
- `stx-pred-market-v3.clar` - core market logic
- `pred-token-v3.clar` - SIP-010 reward token
- `sip-010-trait-v3.clar` - SIP-010 trait definition

Settlement types:
- `hash-even-odd` - binary settlement from Bitcoin hash parity
- `hash-range` - multi-outcome settlement from hash range
- `oracle` - oracle-set outcome for real-world events

Key parameters:
- Market creation fee: 0.0001 STX
- Fee split: 2% platform + 1% creator + 1% LP
- Minimum bet: 1 STX
- Minimum liquidity: 5 STX total pool
- Max pool cap: per-market hard ceiling (configurable)
- Settlement finality: 6 Bitcoin blocks
- Challenge window: 6 Bitcoin blocks after settlement

---

## How It Works

### 1) Market Creation
- Creator pays 0.0001 STX
- Sets settlement Bitcoin block height
- Adds a category tag (stored on-chain)
- Sets max pool cap (hard ceiling)
- Chooses binary or multi-outcome format

### 2) Betting
- Users bet on outcomes
- Pools determine odds dynamically

### 2b) Early Cash Out
- Exit positions before settlement
- Cash out amount is based on current pool odds
- 2% platform fee + 1% creator fee + 1% LP fee applied to cash-out payout

### 2c) Liquidity Provision
- LPs can seed pools to tighten odds
- Liquidity can be withdrawn before settlement
- LPs earn a share of fees

### 2d) Auto-Expire (Low Liquidity)
- If settlement height passes with low liquidity, the market expires
- Participants can claim refunds from expired markets

### 3) Settlement
- After settlement height + 6 confirmations
- Anyone can call `settle-market`
- Uses `get-burn-block-info?` to fetch the Bitcoin block hash
- 6-block challenge window starts after settlement before claims
- Oracle markets resolve via `oracle-settle` when an oracle is configured
- Low-liquidity markets can be expired via `expire-market`

### 4) Claiming
- Winners call `claim-winnings`
- Payout = (your_bet / winning_pool) * total_pool
- 2% platform fee + 1% creator fee + 1% LP fee deducted from winnings

---

## Clarity 4 Features Used

| Feature | Usage |
|---------|-------|
| `tenure-height` | Read current Bitcoin block height |
| `get-burn-block-info?` | Retrieve Bitcoin block hashes |
| `stx-account` | Check locked/unlocked STX |
| `bit-and`, `bit-or`, `bit-xor` | Pack outcomes efficiently |
| `bit-shift-left`, `bit-shift-right` | Future: compact state encoding |
| `slice?` | Extract bytes from block hashes |

---

## Getting Started

### Prerequisites
- Clarinet installed
- Node.js 18+
- pnpm or npm

### Contracts

```bash
cd stx-prediction-market

pnpm install
clarinet check
clarinet test
pnpm test
clarinet console
```

### Frontend

```bash
cd frontend

pnpm install
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" > .env.local
echo "NEXT_PUBLIC_NETWORK=testnet" >> .env.local
pnpm dev
```

---

## Contract Surface

### Public

```clarity
(create-binary-market 
  (title (string-utf8 256))
  (description (string-utf8 1024))
  (category (string-ascii 32))
  (oracle (optional principal))
  (max-pool uint)
  (settlement-burn-height uint))

(create-multi-market
  (title (string-utf8 256))
  (description (string-utf8 1024))
  (category (string-ascii 32))
  (oracle (optional principal))
  (max-pool uint)
  (settlement-burn-height uint)
  (enable-outcome-a bool)
  (enable-outcome-b bool)
  (enable-outcome-c bool)
  (enable-outcome-d bool))

(bet-outcome-a (market-id uint) (amount uint))
(bet-outcome-b (market-id uint) (amount uint))
(bet-outcome-c (market-id uint) (amount uint))
(bet-outcome-d (market-id uint) (amount uint))

(cash-out (market-id uint) (outcome uint) (amount uint))
(add-liquidity (market-id uint) (amount uint))
(remove-liquidity (market-id uint) (amount uint))
(claim-lp-fees (market-id uint))
(expire-market (market-id uint))
(claim-refund (market-id uint))
(oracle-settle (market-id uint) (outcome uint))
(set-market-oracle (market-id uint) (oracle (optional principal)))

(settle-market (market-id uint))
(claim-winnings (market-id uint))
(withdraw-creator-fees (market-id uint) (amount uint) (recipient principal))
```

### Read-Only

```clarity
(get-market (market-id uint))
(get-market-odds (market-id uint))
(get-user-position (market-id uint) (user principal))
(calculate-potential-payout (market-id uint) (outcome uint) (bet-amount uint))
(is-market-settleable (market-id uint))
(is-market-expired (market-id uint))
(get-blocks-until-settlement (market-id uint))
```

---

## Settlement Logic

Binary markets use hash parity:

```clarity
;; last byte even -> outcome A
;; last byte odd -> outcome B
(if (is-hash-even block-hash) OUTCOME-A OUTCOME-B)
```

Multi-outcome markets use a hash range:

```clarity
;; first byte maps to enabled outcomes
(mod first-byte num-outcomes)
```

---

## Example (Clarinet Console)

```clarity
(contract-call? .btc-prediction-market-v3 create-binary-market 
  u"Will BTC block 880000 have even hash?" 
  u"Predict the parity of Bitcoin block hash"
  "crypto"
  none
  u1000000000
  u880000)

(contract-call? .btc-prediction-market-v3 bet-outcome-a u0 u10000000)
(contract-call? .btc-prediction-market-v3 get-market-odds u0)
(contract-call? .btc-prediction-market-v3 settle-market u0)
(contract-call? .btc-prediction-market-v3 claim-winnings u0)
```

---

## Security Notes

1. Bitcoin finality: settle after 6 confirmations.
2. Trustless settlement: uses burn block hash on-chain.
3. Post-conditions: frontend enforces transfer limits.
4. No admin settlement: outcome is algorithmic.

---

## Roadmap

- Oracle-based markets for real-world events
- Liquidity provider mechanism
- Governance token integration
- Mobile client
- Multi-chain expansion

---

## License

MIT
