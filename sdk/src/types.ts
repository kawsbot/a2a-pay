import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface ServiceAccount {
  owner: PublicKey;
  serviceType: string;
  price: BN;
  endpoint: string;
  isActive: boolean;
  createdAt: BN;
  reputation: BN;
}

export interface EscrowAccount {
  client: PublicKey;
  provider: PublicKey;
  amount: BN;
  status: EscrowStatus;
  serviceType: string;
  nonce: BN;
  createdAt: BN;
}

export type EscrowStatus =
  | { created: {} }
  | { delivered: {} }
  | { released: {} }
  | { disputed: {} };

export function escrowStatusToString(status: EscrowStatus): string {
  if ("created" in status) return "Created";
  if ("delivered" in status) return "Delivered";
  if ("released" in status) return "Released";
  if ("disputed" in status) return "Disputed";
  return "Unknown";
}
