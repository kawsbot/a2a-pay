#!/usr/bin/env npx ts-node

import { Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import BN from "bn.js";
import {
  connectToDevnet,
  walletFromKeypair,
  escrowStatusToString,
} from "@a2a-pay/sdk";

const SERVICE_TYPE = "echo";

function loadKeypair(): Keypair {
  const keypairPath = resolve(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const secret = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export async function runClient(): Promise<{
  provider: PublicKey;
  tx: string;
  nonce: BN;
}> {
  const keypair = loadKeypair();
  const wallet = walletFromKeypair(keypair);
  const client = connectToDevnet(wallet);

  console.log("\n=== CLIENT AGENT ===");
  console.log(`Wallet: ${client.wallet.toBase58()}`);

  // Step 1: Discover echo services
  console.log(`\n[Client] Discovering "${SERVICE_TYPE}" services...`);
  const services = await client.discoverServices(SERVICE_TYPE);

  if (services.length === 0) {
    throw new Error("No echo services found! Run the provider agent first.");
  }

  console.log(`[Client] Found ${services.length} service(s):`);
  for (const s of services) {
    console.log(
      `  - Owner: ${s.owner.toBase58()}, Price: ${s.price.toString()} lamports`
    );
  }

  // Step 2: Pick the cheapest provider
  const cheapest = services.reduce((min, s) =>
    s.price.lt(min.price) ? s : min
  );
  console.log(
    `\n[Client] Selected cheapest provider: ${cheapest.owner.toBase58()}`
  );
  console.log(`[Client] Price: ${cheapest.price.toString()} lamports`);

  // Step 3: Create escrow payment
  console.log("[Client] Creating escrow payment...");
  const nonce = new BN(Date.now());
  const tx = await client.createEscrow(
    cheapest.owner,
    SERVICE_TYPE,
    cheapest.price,
    nonce
  );
  console.log(`[Client] Escrow created! TX: ${tx}`);
  console.log(`[Client] Nonce: ${nonce.toString()}`);

  return { provider: cheapest.owner, tx, nonce };
}

export async function releaseAfterDelivery(
  provider: PublicKey,
  nonce: BN
): Promise<string> {
  const keypair = loadKeypair();
  const wallet = walletFromKeypair(keypair);
  const client = connectToDevnet(wallet);

  console.log(`[Client] Checking escrow status...`);
  const escrow = await client.getEscrow(
    client.wallet,
    provider,
    SERVICE_TYPE,
    nonce
  );

  if (!escrow) {
    throw new Error("Escrow not found");
  }

  console.log(`[Client] Escrow status: ${escrowStatusToString(escrow.status)}`);

  if ("delivered" in escrow.status) {
    console.log("[Client] Service delivered! Releasing payment...");
    const tx = await client.releasePayment(provider, SERVICE_TYPE, nonce);
    console.log(`[Client] Payment released! TX: ${tx}`);
    return tx;
  }

  throw new Error("Service not yet delivered");
}

// Run standalone
if (require.main === module) {
  runClient().catch((err) => {
    console.error("[Client] Error:", err.message || err);
    process.exit(1);
  });
}
