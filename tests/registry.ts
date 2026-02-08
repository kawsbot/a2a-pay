import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Registry } from "../target/types/registry";
import { assert } from "chai";

describe("registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.registry as Program<Registry>;
  const owner = provider.wallet;

  const serviceType = `translation-${Date.now()}`;
  const price = new anchor.BN(1_000_000); // 0.001 SOL
  const endpoint = "https://agent.example.com/translate";

  let serviceAccountPda: anchor.web3.PublicKey;

  before(async () => {
    [serviceAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("service"),
        owner.publicKey.toBuffer(),
        Buffer.from(serviceType),
      ],
      program.programId
    );
  });

  it("registers a service", async () => {
    const tx = await program.methods
      .registerService(serviceType, price, endpoint)
      .accounts({
        serviceAccount: serviceAccountPda,
        owner: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("  register_service tx:", tx);

    const account = await program.account.serviceAccount.fetch(serviceAccountPda);
    assert.equal(account.owner.toBase58(), owner.publicKey.toBase58());
    assert.equal(account.serviceType, serviceType);
    assert.equal(account.price.toNumber(), price.toNumber());
    assert.equal(account.endpoint, endpoint);
    assert.equal(account.isActive, true);
    assert.equal(account.reputation.toNumber(), 0);
  });

  it("updates service price and endpoint", async () => {
    const newPrice = new anchor.BN(2_000_000);
    const newEndpoint = "https://agent.example.com/v2/translate";

    const tx = await program.methods
      .updateService(newPrice, newEndpoint)
      .accounts({
        serviceAccount: serviceAccountPda,
        owner: owner.publicKey,
      })
      .rpc();

    console.log("  update_service tx:", tx);

    const account = await program.account.serviceAccount.fetch(serviceAccountPda);
    assert.equal(account.price.toNumber(), newPrice.toNumber());
    assert.equal(account.endpoint, newEndpoint);
  });

  it("deactivates a service", async () => {
    const tx = await program.methods
      .deactivateService()
      .accounts({
        serviceAccount: serviceAccountPda,
        owner: owner.publicKey,
      })
      .rpc();

    console.log("  deactivate_service tx:", tx);

    const account = await program.account.serviceAccount.fetch(serviceAccountPda);
    assert.equal(account.isActive, false);
  });
});
