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
const PRICE = 500_000; // lamports
const ENDPOINT = "https://kawsbot.dev/api/echo";
function loadKeypair(): Keypair {
  const keypairPath = resolve(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const secret = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export async function runProvider(): Promise<{
  registered: boolean;
  completed: boolean;
}> {
  const keypair = loadKeypair();
  const wallet = walletFromKeypair(keypair);
  const client = connectToDevnet(wallet);

  console.log("\n=== PROVIDER AGENT ===");
  console.log(`Wallet: ${client.wallet.toBase58()}`);

  // Step 1: Register the echo service
  console.log(
    `\n[Provider] Registering "${SERVICE_TYPE}" service at ${PRICE} lamports...`
  );
  try {
    const tx = await client.registerService(
      SERVICE_TYPE,
      new BN(PRICE),
      ENDPOINT
    );
    console.log(`[Provider] Registered! TX: ${tx}`);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("[Provider] Service already registered, continuing...");
    } else {
      throw err;
    }
  }

  // Step 2: Poll for escrows targeting this provider
  console.log("[Provider] Waiting for incoming escrows...");
  return { registered: true, completed: false };
}

export async function waitForEscrowAndComplete(
  clientPubkey: PublicKey,
  nonce: BN
): Promise<string> {
  const keypair = loadKeypair();
  const wallet = walletFromKeypair(keypair);
  const client = connectToDevnet(wallet);

  console.log(
    `[Provider] Checking for escrow from ${clientPubkey.toBase58()}...`
  );

  const escrow = await client.getEscrow(
    clientPubkey,
    client.wallet,
    SERVICE_TYPE,
    nonce
  );
  if (!escrow) {
    throw new Error("No escrow found");
  }

  console.log(
    `[Provider] Found escrow! Amount: ${escrow.amount.toString()} lamports`
  );
  console.log(`[Provider] Status: ${escrowStatusToString(escrow.status)}`);

  if ("created" in escrow.status) {
    console.log("[Provider] Performing echo service... (simulated)");
    await new Promise((r) => setTimeout(r, 1000));
    console.log("[Provider] Service complete. Marking as delivered...");

    const tx = await client.completeService(clientPubkey, SERVICE_TYPE, nonce);
    console.log(`[Provider] Marked delivered! TX: ${tx}`);
    return tx;
  }

  console.log("[Provider] Escrow not in 'Created' state, skipping.");
  return "";
}

// Run standalone
if (require.main === module) {
  runProvider().catch((err) => {
    console.error("[Provider] Error:", err.message || err);
    process.exit(1);
  });
}
