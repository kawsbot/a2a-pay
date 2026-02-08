#!/usr/bin/env npx ts-node

/**
 * A2A Pay Demo - Full Agent-to-Agent Payment Flow
 *
 * This demo simulates the complete lifecycle:
 * 1. Provider registers an "echo" service
 * 2. Client discovers services and creates escrow payment
 * 3. Provider detects escrow and marks service as complete
 * 4. Client verifies delivery and releases payment
 *
 * NOTE: Since this demo uses a single wallet for both agents,
 * it demonstrates the protocol flow. In production, each agent
 * would have its own keypair.
 */

import {
  Keypair,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { runProvider, waitForEscrowAndComplete } from "./provider-agent";
import { runClient, releaseAfterDelivery } from "./client-agent";

function loadKeypair(): Keypair {
  const keypairPath = resolve(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const secret = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function main() {
  console.log("========================================");
  console.log("  A2A Pay - Agent Payment Demo");
  console.log("========================================");

  const keypair = loadKeypair();
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`\nWallet: ${keypair.publicKey.toBase58()}`);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 1_000_000) {
    console.error("\nInsufficient balance! Need at least 0.001 SOL.");
    console.error("Run: solana airdrop 2");
    process.exit(1);
  }

  // Step 1: Provider registers service
  console.log("\n--- Step 1: Provider Registration ---");
  await runProvider();

  // Step 2: Client discovers and pays
  console.log("\n--- Step 2: Client Discovery & Payment ---");
  const { provider, nonce } = await runClient();

  // Step 3: Provider completes service
  console.log("\n--- Step 3: Provider Completes Service ---");
  await waitForEscrowAndComplete(keypair.publicKey, nonce);

  // Step 4: Client releases payment
  console.log("\n--- Step 4: Client Releases Payment ---");
  await releaseAfterDelivery(provider, nonce);

  // Final status
  const finalBalance = await connection.getBalance(keypair.publicKey);
  console.log("\n========================================");
  console.log("  Demo Complete!");
  console.log("========================================");
  console.log(`Final balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(
    `Cost: ${(balance - finalBalance) / LAMPORTS_PER_SOL} SOL (tx fees + rent)`
  );
}

main().catch((err) => {
  console.error("\nDemo failed:", err.message || err);
  process.exit(1);
});
