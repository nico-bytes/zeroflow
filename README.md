# ZeroFlow

ZeroFlow is a privacy-first AMM on Zama FHEVM that implements a Uniswap V2-style pool for encrypted cUSDC and cZama.
Users can add liquidity at a fixed initial price (1 cZama = 2 cUSDC), swap between the two assets, and reveal their
real balances only when they choose to decrypt.

## Overview

ZeroFlow combines a familiar AMM experience with fully homomorphic encryption (FHE) so balances and transfers stay
encrypted on-chain. The system is designed as a minimal, auditable swap focused on a single cUSDC/cZama pool, with a
deterministic initial price and straightforward liquidity math.

## Problems Solved

- **On-chain privacy for balances**: Encrypted token balances prevent public exposure of user holdings.
- **Private swaps**: Swap inputs and outputs are transferred via confidential token methods.
- **Simple liquidity bootstrapping**: A fixed initial price removes ambiguity during the first liquidity add.
- **Minimal surface area**: A single-pool AMM keeps the code small and easier to reason about.

## Advantages

- **FHE-backed confidentiality** without sacrificing the on-chain AMM model.
- **Predictable pool creation** with a strict 1 cZama = 2 cUSDC initial ratio.
- **Uniswap V2-style constant product pricing** with a 0.3% fee.
- **Front-end transparency**: encrypted balances are visible, but decryption is user-triggered.
- **Clear integration points** for wallets and relayers using Zama FHEVM tooling.

## Core Features

- Add liquidity with ratio checks (initial price enforced, subsequent adds must match pool ratio).
- Remove liquidity for proportional encrypted payouts.
- Swap cUSDC -> cZama and cZama -> cUSDC with slippage protection.
- Encrypted balance display with explicit decrypt action in the UI.
- ERC20 LP token to represent pool share.

## Architecture

### Smart Contracts (contracts/)

- **ERC7984USDC.sol**: Confidential ERC7984 token for cUSDC, minted in encrypted form.
- **ERC7984Zama.sol**: Confidential ERC7984 token for cZama, minted in encrypted form.
- **ZamaSwap.sol**: Single-pool AMM with constant product formula, 0.3% fee, and LP token minting.
- **FHECounter.sol**: Legacy example from the template (not part of the swap flow).

### Frontend (ui/)

- React + Vite UI for swaps and liquidity.
- **Reads**: viem for view calls and balance lookups.
- **Writes**: ethers for state-changing transactions.
- Encrypted balances are shown by default; a decrypt action reveals real values.
- ABI definitions are embedded as TypeScript constants (no JSON files).

## Tech Stack

- **Solidity + Hardhat** for contracts, tasks, tests, and deployment.
- **Zama FHEVM** libraries for encryption and confidential transfers.
- **OpenZeppelin Confidential ERC7984** for encrypted tokens.
- **React + Vite** for the interface.
- **viem** (read) + **ethers** (write) for on-chain interactions.
- **RainbowKit** for wallet connection.
- **npm** for package management.

## Contract Design Details

- **Pool type**: Single Uniswap V2-style pair (cUSDC/cZama).
- **Initial price**: Enforced by `addLiquidity` when total supply is zero (1 cZama = 2 cUSDC).
- **Fee**: 0.3% applied to swaps (997/1000).
- **Reserves**: Stored as `uint64` to align with encrypted token amounts.
- **Slippage**: Explicit `minOut` parameters in swap functions.
- **Privacy**: Transfers use confidential ERC7984 methods with FHE encryption.

## Repository Layout

```
contracts/   Smart contracts (swap and tokens)
deploy/      Deployment scripts (local and Sepolia)
tasks/       Custom Hardhat tasks
test/        Contract tests
ui/          React frontend
docs/        Zama-specific references
```

## Setup

### Prerequisites

- Node.js 20+
- npm
- Access to a Sepolia RPC provider (Infura supported)
- A funded Sepolia account for deployment

### Install Dependencies

```bash
npm install
```

### Compile and Test Contracts

```bash
npm run compile
npm run test
```

### Local Node (Contracts Only)

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

Note: The frontend is intentionally **not** configured for localhost. It targets Sepolia.

## Deployment (Sepolia)

1. Ensure your `.env` includes:
   - `INFURA_API_KEY`
   - `PRIVATE_KEY`
2. Deploy using the Sepolia network configuration in `hardhat.config.ts`.
3. Do **not** use mnemonic-based deployment. Only private key deployment is supported.

```bash
npx hardhat deploy --network sepolia
```

## Frontend Integration

1. Copy the ABI entries from `deployments/sepolia` into TypeScript constants.
2. Update addresses and ABI arrays in `ui/src/config/contracts.ts`.
3. Keep contract config in TypeScript only (no JSON files).
4. The frontend must not rely on environment variables or local storage.

## Running the Frontend

```bash
cd ui
npm install
npm run dev
```

## Usage Flow

1. Connect a wallet via RainbowKit.
2. Mint cUSDC and cZama to your address (for demo/test flows).
3. Approve the swap contract as operator where required by the confidential token.
4. Add liquidity at the required initial ratio or current pool ratio.
5. Swap between cUSDC and cZama with slippage limits.
6. View encrypted balances and decrypt when you need to reveal actual values.

## Security and Risk Notes

- **Impermanent loss** applies to LP positions.
- **Slippage protection** should be set thoughtfully for swaps.
- **Encrypted balances** protect visibility, but key management remains user responsibility.
- **Single-pair scope** keeps the system auditable but limits asset variety.

## Future Plans

- Multiple pools with a factory/router pattern.
- Configurable fees and fee distribution to LPs.
- Pool analytics (TVL, volume, fee APR).
- Deeper UI guidance for encrypted allowances and operator approvals.
- Safer onboarding for new users (guided liquidity setup and warnings).
- Expanded test coverage for edge cases and adversarial inputs.

## Documentation

- Zama FHEVM references are in `docs/`.
- Deployment artifacts for Sepolia are in `deployments/sepolia`.

## License

BSD-3-Clause-Clear. See `LICENSE`.
