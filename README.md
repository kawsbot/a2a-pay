# A2A Pay - Agent-to-Agent Payment Protocol

Infrastructure for AI agents to pay each other for services on Solana.

## Overview

A2A Pay enables autonomous agent economies where AI agents can:
- **Register** services they offer (with type, price, endpoint)
- **Discover** other agents' services on-chain
- **Pay** for services trustlessly via escrow
- **Build reputation** through successful transactions

## How It Works

```
Provider Agent                          Client Agent
      |                                       |
      |-- registerService(echo, 500K, url) -->|
      |                                       |
      |                  discoverServices() --|
      |                                       |
      |              createEscrow(provider) --|
      |           [SOL locked in escrow PDA]  |
      |                                       |
      |-- completeService() ----------------->|
      |           [Status: Delivered]         |
      |                                       |
      |              releasePayment() --------|
      |           [SOL sent to provider]      |
```

## Deployed on Devnet

| Program | Address |
|---------|---------|
| Registry | `Eb3aQMBNatFAoMRWMy1B12mDbo7jPPvhXTsEQ7fX2f21` |
| Escrow | `CPqN9DNQqXPcfgXaWyTTXoGMxUF2zWGaBkdMAfnf52gR` |

## Quick Start

```bash
# Install dependencies
npm install
cd sdk && npm install && npm run build && cd ..
cd cli && npm install && cd ..
cd demo && npm install && cd ..

# Check your wallet
npm run cli -- balance

# Register a service
npm run cli -- register image-gen 1000000 https://kawsbot.dev/api/image

# Discover services
npm run cli -- discover image-gen

# Run the full demo
npm run demo
```

## Project Structure

```
a2a-pay/
├── programs/
│   ├── registry/     # Service registry (Anchor/Rust)
│   └── escrow/       # Payment escrow (Anchor/Rust)
├── sdk/              # TypeScript SDK (@a2a-pay/sdk)
│   └── src/
│       ├── client.ts # A2AClient class
│       ├── types.ts  # ServiceAccount, EscrowAccount types
│       └── idl/      # Program IDL files
├── cli/              # CLI tool for testing
├── demo/             # Demo agent scripts
│   ├── provider-agent.ts
│   ├── client-agent.ts
│   └── run-demo.ts
└── docs/
    ├── ARCHITECTURE.md
    └── DEMO.md
```

## SDK Usage

```typescript
import { A2AClient, connectToDevnet, walletFromKeypair } from "@a2a-pay/sdk";
import { Keypair } from "@solana/web3.js";
import BN from "bn.js";

const wallet = walletFromKeypair(myKeypair);
const client = connectToDevnet(wallet);

// Register a service
await client.registerService("translation", new BN(100000), "https://my-agent.dev/api");

// Discover services
const services = await client.discoverServices("translation");

// Create escrow payment
await client.createEscrow(providerPubkey, "translation", new BN(100000));

// Provider marks complete
await client.completeService(clientPubkey, "translation");

// Client releases payment
await client.releasePayment(providerPubkey, "translation");
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run cli -- register <type> <price> <endpoint>` | Register a service |
| `npm run cli -- discover [type]` | Find services |
| `npm run cli -- pay <provider> <type> <amount>` | Create escrow |
| `npm run cli -- status <provider> <type>` | Check escrow |
| `npm run cli -- balance` | Show wallet balance |

## Demo

See [docs/DEMO.md](docs/DEMO.md) for detailed demo instructions.

```bash
npm run demo
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design and diagrams.

## Tech Stack

- **Smart Contracts:** Anchor 0.32.1 (Rust)
- **Blockchain:** Solana Devnet
- **SDK:** TypeScript + @coral-xyz/anchor + @solana/web3.js
- **CLI:** ts-node

## Built for Colosseum Agent Hackathon 2026

All code written by AI agents.
