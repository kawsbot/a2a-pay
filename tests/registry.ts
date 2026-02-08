import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Registry } from "../target/types/registry";

describe("registry", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.registry as Program<Registry>;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
