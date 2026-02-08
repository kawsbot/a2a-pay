import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;

  // Client is the wallet provider
  const client = provider.wallet;
  // Provider is a new keypair
  const serviceProvider = anchor.web3.Keypair.generate();

  const serviceType = `translation-${Date.now()}`;
  const amount = new anchor.BN(100_000_000); // 0.1 SOL

  let escrowPda: anchor.web3.PublicKey;

  before(async () => {
    [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.publicKey.toBuffer(),
        serviceProvider.publicKey.toBuffer(),
        Buffer.from(serviceType),
      ],
      program.programId
    );
  });

  it("creates an escrow", async () => {
    const tx = await program.methods
      .createEscrow(serviceType, amount)
      .accounts({
        escrowAccount: escrowPda,
        client: client.publicKey,
        provider: serviceProvider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("  create_escrow tx:", tx);

    const account = await program.account.escrowAccount.fetch(escrowPda);
    assert.equal(account.client.toBase58(), client.publicKey.toBase58());
    assert.equal(account.provider.toBase58(), serviceProvider.publicKey.toBase58());
    assert.equal(account.amount.toNumber(), amount.toNumber());
    assert.equal(account.serviceType, serviceType);
    assert.deepEqual(account.status, { created: {} });
  });

  it("marks service as delivered by provider", async () => {
    const tx = await program.methods
      .completeService()
      .accounts({
        escrowAccount: escrowPda,
        provider: serviceProvider.publicKey,
      })
      .signers([serviceProvider])
      .rpc();

    console.log("  complete_service tx:", tx);

    const account = await program.account.escrowAccount.fetch(escrowPda);
    assert.deepEqual(account.status, { delivered: {} });
  });

  it("releases payment to provider", async () => {
    const providerBalanceBefore = await provider.connection.getBalance(
      serviceProvider.publicKey
    );

    const tx = await program.methods
      .releasePayment()
      .accounts({
        escrowAccount: escrowPda,
        client: client.publicKey,
        provider: serviceProvider.publicKey,
      })
      .rpc();

    console.log("  release_payment tx:", tx);

    const account = await program.account.escrowAccount.fetch(escrowPda);
    assert.deepEqual(account.status, { released: {} });

    const providerBalanceAfter = await provider.connection.getBalance(
      serviceProvider.publicKey
    );
    assert.equal(
      providerBalanceAfter - providerBalanceBefore,
      amount.toNumber()
    );
  });

  // Test dispute flow with a separate escrow
  describe("dispute flow", () => {
    const serviceType2 = `summarize-${Date.now()}`;
    const disputeAmount = new anchor.BN(50_000_000); // 0.05 SOL
    const provider2 = anchor.web3.Keypair.generate();
    let escrowPda2: anchor.web3.PublicKey;

    before(async () => {
      [escrowPda2] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          client.publicKey.toBuffer(),
          provider2.publicKey.toBuffer(),
          Buffer.from(serviceType2),
        ],
        program.programId
      );
    });

    it("creates escrow and disputes for refund", async () => {
      // Create
      await program.methods
        .createEscrow(serviceType2, disputeAmount)
        .accounts({
          escrowAccount: escrowPda2,
          client: client.publicKey,
          provider: provider2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const clientBalanceBefore = await provider.connection.getBalance(
        client.publicKey
      );

      // Dispute
      const tx = await program.methods
        .dispute()
        .accounts({
          escrowAccount: escrowPda2,
          client: client.publicKey,
          provider: provider2.publicKey,
        })
        .rpc();

      console.log("  dispute tx:", tx);

      const account = await program.account.escrowAccount.fetch(escrowPda2);
      assert.deepEqual(account.status, { disputed: {} });

      const clientBalanceAfter = await provider.connection.getBalance(
        client.publicKey
      );
      // Client should get refund (minus tx fee)
      assert.isTrue(clientBalanceAfter > clientBalanceBefore);
    });
  });
});
