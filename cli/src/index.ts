#!/usr/bin/env node

import { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { resolve } from "path";
import BN from "bn.js";
import { A2AClient, connectToDevnet, walletFromKeypair, escrowStatusToString } from "@a2a-pay/sdk";

function loadKeypair(): Keypair {
  const keypairPath = resolve(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const secret = JSON.parse(readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function getClient(): A2AClient {
  const keypair = loadKeypair();
  const wallet = walletFromKeypair(keypair);
  return connectToDevnet(wallet);
}

async function register(serviceType: string, price: string, endpoint: string) {
  const client = getClient();
  console.log(`Registering service "${serviceType}"...`);
  console.log(`  Price: ${price} lamports`);
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Owner: ${client.wallet.toBase58()}`);

  const tx = await client.registerService(
    serviceType,
    new BN(price),
    endpoint
  );
  console.log(`\nRegistered! TX: ${tx}`);
}

async function discover(serviceType?: string) {
  const client = getClient();
  console.log(
    serviceType
      ? `Discovering "${serviceType}" services...`
      : "Discovering all services..."
  );

  const services = await client.discoverServices(serviceType);

  if (services.length === 0) {
    console.log("No active services found.");
    return;
  }

  console.log(`\nFound ${services.length} service(s):\n`);
  for (const s of services) {
    console.log(`  Owner:    ${s.owner.toBase58()}`);
    console.log(`  Type:     ${s.serviceType}`);
    console.log(`  Price:    ${s.price.toString()} lamports`);
    console.log(`  Endpoint: ${s.endpoint}`);
    console.log(`  Rep:      ${s.reputation.toString()}`);
    console.log();
  }
}

async function pay(providerKey: string, serviceType: string, amount: string) {
  const client = getClient();
  const provider = new PublicKey(providerKey);

  console.log(`Creating escrow payment...`);
  console.log(`  Provider: ${provider.toBase58()}`);
  console.log(`  Service:  ${serviceType}`);
  console.log(`  Amount:   ${amount} lamports`);

  const tx = await client.createEscrow(provider, serviceType, new BN(amount));
  console.log(`\nEscrow created! TX: ${tx}`);

  const escrowPDA = A2AClient.getEscrowPDA(client.wallet, provider, serviceType);
  console.log(`Escrow PDA: ${escrowPDA.toBase58()}`);
}

async function status(providerKey: string, serviceType: string) {
  const client = getClient();
  const provider = new PublicKey(providerKey);

  const escrow = await client.getEscrow(client.wallet, provider, serviceType);
  if (!escrow) {
    console.log("Escrow not found.");
    return;
  }

  console.log("Escrow status:");
  console.log(`  Client:   ${escrow.client.toBase58()}`);
  console.log(`  Provider: ${escrow.provider.toBase58()}`);
  console.log(`  Amount:   ${escrow.amount.toString()} lamports`);
  console.log(`  Status:   ${escrowStatusToString(escrow.status)}`);
  console.log(`  Service:  ${escrow.serviceType}`);
}

async function balance() {
  const keypair = loadKeypair();
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const bal = await connection.getBalance(keypair.publicKey);
  console.log(`Wallet:  ${keypair.publicKey.toBase58()}`);
  console.log(`Balance: ${bal / LAMPORTS_PER_SOL} SOL (${bal} lamports)`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "register":
        if (args.length < 4) {
          console.log("Usage: a2a-pay register <service_type> <price> <endpoint>");
          process.exit(1);
        }
        await register(args[1], args[2], args[3]);
        break;

      case "discover":
        await discover(args[1]);
        break;

      case "pay":
        if (args.length < 4) {
          console.log("Usage: a2a-pay pay <provider_pubkey> <service_type> <amount>");
          process.exit(1);
        }
        await pay(args[1], args[2], args[3]);
        break;

      case "status":
        if (args.length < 3) {
          console.log("Usage: a2a-pay status <provider_pubkey> <service_type>");
          process.exit(1);
        }
        await status(args[1], args[2]);
        break;

      case "balance":
        await balance();
        break;

      default:
        console.log("A2A Pay CLI - Agent-to-Agent Payment Protocol\n");
        console.log("Commands:");
        console.log("  register <service_type> <price> <endpoint>  Register a service");
        console.log("  discover [service_type]                     Find services");
        console.log("  pay <provider> <service_type> <amount>      Create escrow payment");
        console.log("  status <provider> <service_type>            Check escrow status");
        console.log("  balance                                     Show wallet balance");
        break;
    }
  } catch (err: any) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

main();
