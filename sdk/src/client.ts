import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  clusterApiUrl,
  GetProgramAccountsFilter,
} from "@solana/web3.js";
import BN from "bn.js";
import registryIdl from "./idl/registry.json";
import escrowIdl from "./idl/escrow.json";
import { ServiceAccount, EscrowAccount } from "./types";

const REGISTRY_PROGRAM_ID = new PublicKey(registryIdl.address);
const ESCROW_PROGRAM_ID = new PublicKey(escrowIdl.address);

export class A2AClient {
  private registryProgram: anchor.Program;
  private escrowProgram: anchor.Program;
  private provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider) {
    this.provider = provider;
    this.registryProgram = new anchor.Program(
      registryIdl as anchor.Idl,
      provider
    );
    this.escrowProgram = new anchor.Program(escrowIdl as anchor.Idl, provider);
  }

  // -- Registry methods --

  async registerService(
    serviceType: string,
    price: BN,
    endpoint: string
  ): Promise<string> {
    const tx = await this.registryProgram.methods
      .registerService(serviceType, price, endpoint)
      .rpc();
    return tx;
  }

  async updateService(
    serviceType: string,
    price: BN | null,
    endpoint: string | null
  ): Promise<string> {
    const [serviceAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("service"),
        this.provider.wallet.publicKey.toBuffer(),
        Buffer.from(serviceType),
      ],
      REGISTRY_PROGRAM_ID
    );

    const tx = await this.registryProgram.methods
      .updateService(price, endpoint)
      .accounts({
        serviceAccount,
        owner: this.provider.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async deactivateService(serviceType: string): Promise<string> {
    const [serviceAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("service"),
        this.provider.wallet.publicKey.toBuffer(),
        Buffer.from(serviceType),
      ],
      REGISTRY_PROGRAM_ID
    );

    const tx = await this.registryProgram.methods
      .deactivateService()
      .accounts({
        serviceAccount,
        owner: this.provider.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async getService(
    owner: PublicKey,
    serviceType: string
  ): Promise<ServiceAccount | null> {
    const [serviceAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("service"), owner.toBuffer(), Buffer.from(serviceType)],
      REGISTRY_PROGRAM_ID
    );
    try {
      const account = await (
        this.registryProgram.account as any
      ).serviceAccount.fetch(serviceAccount);
      return account as ServiceAccount;
    } catch {
      return null;
    }
  }

  async discoverServices(serviceType?: string): Promise<ServiceAccount[]> {
    const filters: GetProgramAccountsFilter[] = [];
    if (serviceType) {
      // Filter by service_type string field
      // Offset: 8 (discriminator) + 32 (owner) + 4 (string len prefix) = 44
      const serviceTypeByteLength = Buffer.byteLength(serviceType, "utf8");
      const serviceTypeBuffer = Buffer.alloc(4 + serviceTypeByteLength);
      serviceTypeBuffer.writeUInt32LE(serviceTypeByteLength, 0);
      serviceTypeBuffer.write(serviceType, 4);
      filters.push({
        memcmp: {
          offset: 40,
          bytes: anchor.utils.bytes.bs58.encode(serviceTypeBuffer),
        },
      });
    }

    const accounts = await (
      this.registryProgram.account as any
    ).serviceAccount.all(filters);

    return accounts
      .map((a: any) => a.account as ServiceAccount)
      .filter((s: ServiceAccount) => s.isActive);
  }

  // -- Escrow methods --

  async createEscrow(
    provider: PublicKey,
    serviceType: string,
    amount: BN,
    nonce: BN
  ): Promise<string> {
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        this.provider.wallet.publicKey.toBuffer(),
        provider.toBuffer(),
        Buffer.from(serviceType),
        nonce.toArrayLike(Buffer, "le", 8),
      ],
      ESCROW_PROGRAM_ID
    );

    const tx = await this.escrowProgram.methods
      .createEscrow(serviceType, amount, nonce)
      .accounts({
        escrowAccount,
        client: this.provider.wallet.publicKey,
        provider,
      })
      .rpc();
    return tx;
  }

  async completeService(
    client: PublicKey,
    serviceType: string,
    nonce: BN
  ): Promise<string> {
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
        Buffer.from(serviceType),
        nonce.toArrayLike(Buffer, "le", 8),
      ],
      ESCROW_PROGRAM_ID
    );

    const tx = await this.escrowProgram.methods
      .completeService()
      .accounts({
        escrowAccount,
        provider: this.provider.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async releasePayment(
    provider: PublicKey,
    serviceType: string,
    nonce: BN
  ): Promise<string> {
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        this.provider.wallet.publicKey.toBuffer(),
        provider.toBuffer(),
        Buffer.from(serviceType),
        nonce.toArrayLike(Buffer, "le", 8),
      ],
      ESCROW_PROGRAM_ID
    );

    const tx = await this.escrowProgram.methods
      .releasePayment()
      .accounts({
        escrowAccount,
        client: this.provider.wallet.publicKey,
        provider,
      })
      .rpc();
    return tx;
  }

  async getEscrow(
    client: PublicKey,
    provider: PublicKey,
    serviceType: string,
    nonce: BN
  ): Promise<EscrowAccount | null> {
    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.toBuffer(),
        provider.toBuffer(),
        Buffer.from(serviceType),
        nonce.toArrayLike(Buffer, "le", 8),
      ],
      ESCROW_PROGRAM_ID
    );
    try {
      const account = await (
        this.escrowProgram.account as any
      ).escrowAccount.fetch(escrowAccount);
      return account as EscrowAccount;
    } catch {
      return null;
    }
  }

  // -- Helpers --

  get wallet(): PublicKey {
    return this.provider.wallet.publicKey;
  }

  get connection(): Connection {
    return this.provider.connection;
  }

  static getServicePDA(owner: PublicKey, serviceType: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("service"), owner.toBuffer(), Buffer.from(serviceType)],
      REGISTRY_PROGRAM_ID
    );
    return pda;
  }

  static getEscrowPDA(
    client: PublicKey,
    provider: PublicKey,
    serviceType: string,
    nonce: BN
  ): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.toBuffer(),
        provider.toBuffer(),
        Buffer.from(serviceType),
        nonce.toArrayLike(Buffer, "le", 8),
      ],
      ESCROW_PROGRAM_ID
    );
    return pda;
  }
}

export function connectToDevnet(wallet: anchor.Wallet): A2AClient {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new A2AClient(provider);
}

export function walletFromKeypair(keypair: Keypair): anchor.Wallet {
  return new anchor.Wallet(keypair);
}
