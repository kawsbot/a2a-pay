# A2A Pay - Demo Guide

## Prerequisites

- Solana CLI installed and configured for devnet
- Node.js 18+
- A funded devnet wallet at `~/.config/solana/id.json`

```bash
# Check your setup
solana config set --url devnet
solana balance
# If needed: solana airdrop 2
```

## Quick Start

```bash
# From the project root
cd demo
npm install

# Run the full demo
npm run demo
```

## What the Demo Does

The demo runs a complete agent-to-agent payment cycle using a single wallet (simulating two agents):

### Step 1: Provider Registration
The provider agent registers an "echo" service on-chain (or reuses it if already registered):
- Service type: `echo`
- Price: 500,000 lamports (0.0005 SOL)
- Endpoint: `https://kawsbot.dev/api/echo`

### Step 2: Client Discovery & Payment
The client agent:
- Queries the registry for `echo` services
- Selects the cheapest provider
- Creates an escrow with the listed price and a unique nonce (SOL locked on-chain)

### Step 3: Provider Completes Service
The provider agent:
- Detects the incoming escrow
- Simulates performing the service
- Marks the escrow as "Delivered"

### Step 4: Client Releases Payment
The client agent:
- Verifies the service was delivered
- Releases the escrowed SOL to the provider

## Running Individual Agents

```bash
# Run just the provider
npm run provider

# Run just the client (provider must be registered first)
npm run client
```

## Using the CLI

```bash
# From the project root
npm run cli -- register echo 500000 https://kawsbot.dev/api/echo
npm run cli -- discover echo
npm run cli -- balance
npm run cli -- pay <PROVIDER_PUBKEY> echo 500000
npm run cli -- status <PROVIDER_PUBKEY> echo <NONCE>
```

## Expected Output

```
========================================
  A2A Pay - Agent Payment Demo
========================================

Wallet: 986uMPZJLDPWJCFRUMb34cdVTnNWWmUwanhDoF36NwXA
Balance: 4.5 SOL

--- Step 1: Provider Registration ---
[Provider] Registering "echo" service at 500000 lamports...
[Provider] Registered! TX: 5xK...

--- Step 2: Client Discovery & Payment ---
[Client] Discovering "echo" services...
[Client] Found 1 service(s)
[Client] Creating escrow payment...
[Client] Escrow created! TX: 3nR...
[Client] Nonce: 1770577836007

--- Step 3: Provider Completes Service ---
[Provider] Found escrow! Amount: 500000 lamports
[Provider] Service complete. Marking as delivered...
[Provider] Marked delivered! TX: 4mQ...

--- Step 4: Client Releases Payment ---
[Client] Service delivered! Releasing payment...
[Client] Payment released! TX: 2pL...

========================================
  Demo Complete!
========================================
```
