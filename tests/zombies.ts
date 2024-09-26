import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zombies } from "../target/types/zombies";
import { assert, use } from "chai";

import { SessionTokenManager } from "@magicblock-labs/gum-sdk";

import { Keypair } from "@solana/web3.js";

describe("zombies", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Zombies as Program<Zombies>;

  const topUp = async (wallet: anchor.web3.Keypair) => {
    const res = await provider.connection.requestAirdrop(wallet.publicKey, 1e9);
    await provider.connection.confirmTransaction(res, "confirmed");
  };

  const sessionManager = new SessionTokenManager(
    // @ts-ignore
    provider.wallet,
    provider.connection,
    "devnet"
  );


  const createArmy = async (payer: anchor.web3.Keypair) => {
    const [armyPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("army"), payer.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initArmy()
      .accounts({
        systemProgram: anchor.web3.SystemProgram.programId,
        army: armyPDA,
        owner: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    const army = await program.account.army.fetch(armyPDA);
    return [army, armyPDA] as const;
  };

  const createBattlePDA = (
    user: anchor.web3.PublicKey,
    dna1: anchor.BN,
    dna2: anchor.BN,
    dna3: anchor.BN
  ) => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        user.toBuffer(),
        dna1.toArrayLike(Buffer, "le", 8),
        dna2.toArrayLike(Buffer, "le", 8),
        dna3.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];
  };

  const createSessionSigner = async (wallet) => {
    const sessionSigner = anchor.web3.Keypair.generate();
    const keys = await sessionManager.program.methods
      .createSession(true, null)
      .accounts({
        sessionSigner: sessionSigner.publicKey,
        authority: wallet.publicKey,
        targetProgram: program.programId,
      })
      .signers([sessionSigner, wallet])
      .rpcAndKeys();
    
    const sessionToken = keys.pubkeys.sessionToken as anchor.web3.PublicKey;
    return { sessionSigner, sessionToken };
  };

  const battle = async (
    battlePDA,
    user: anchor.web3.Keypair,
    armyPDA: anchor.web3.PublicKey,
    zombieId: number,
    selection: number,
    dna1: anchor.BN,
    dna2: anchor.BN,
    dna3: anchor.BN
  ) => {
    await program.methods
      .battle(zombieId, selection, dna1, dna2, dna3)
      .accounts({
        army: armyPDA,
        battle: battlePDA,
        owner: user.publicKey,
        signer: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        sessionToken: null,
      })
      .signers([user])
      .rpc();
  
    return battlePDA;
  };
  
  const battle_with_session = async (
    battlePDA,
    user: anchor.web3.PublicKey,
    armyPDA: anchor.web3.PublicKey,
    zombieId: number,
    selection: number,
    dna1: anchor.BN,
    dna2: anchor.BN,
    dna3: anchor.BN,
    sessionSigner: anchor.web3.Keypair,
    sessionToken: anchor.web3.PublicKey
  ) => {
    await program.methods
      .battle(zombieId, selection, dna1, dna2, dna3)
      .accounts({
        army: armyPDA,
        battle: battlePDA,
        owner: user,
        signer: sessionSigner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        sessionToken,
      })
      .signers([sessionSigner])
      .rpc();
  
    return battlePDA;
  };
  

  it("Is initialize the Army!", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);
    
    let [army] = await createArmy(newUser);    
    
    
    assert(army.owner.equals(newUser.publicKey));
    
    const zombie = army.zombies[0];
    assert(zombie.dna > 0)
    console.log(zombie.dna.toString(16))
  });

  
  it("removes zombie from army using session token", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);
  
    let [, armyPDA] = await createArmy(newUser);
    
    const { sessionSigner, sessionToken } = await createSessionSigner(newUser);
    
    // Use the session token to remove a zombie
    await program.methods
      .removeZombie(0)
      .accounts({
        army: armyPDA,
        owner: newUser.publicKey,
        signer: sessionSigner.publicKey,
        sessionToken,
      })
      .signers([sessionSigner])
      .rpc();
  
    let army_data = await program.account.army.fetch(armyPDA);
    assert(army_data.zombies[0].dna.eq(new anchor.BN(0)));
  });

  it("removes zombie from army without session token", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);
  
    let [, armyPDA] = await createArmy(newUser);    
    
    await program.methods
      .removeZombie(0)
      .accounts({
        army: armyPDA,
        owner: newUser.publicKey,
        signer: newUser.publicKey,
        sessionToken: null
      })
      .signers([newUser])
      .rpc();
  
    let army_data = await program.account.army.fetch(armyPDA);
    assert(army_data.zombies[0].dna.eq(new anchor.BN(0)));
  });

  it("fails to remove zombie from army without session token (unauthorized)", async () => {
    const armyOwner = anchor.web3.Keypair.generate();
    const randomUser = anchor.web3.Keypair.generate();
    await topUp(armyOwner);
    await topUp(randomUser);
  
    const [, armyPDA] = await createArmy(armyOwner);
    
    try {
      await program.methods
        .removeZombie(0)
        .accounts({
          army: armyPDA,
          owner: randomUser.publicKey,
          signer: randomUser.publicKey,
          sessionToken: null
        })
        .signers([randomUser])
        .rpc();

      assert.fail("Expected an error, but none was thrown");
    } catch (error: any) {
      // Check if the error is an AnchorError
      if (error instanceof anchor.AnchorError) {
        assert(
          error.error.errorCode.code === "Unauthorized" ||
          error.error.errorCode.code === "ConstraintHasOne",
          "Expected Unauthorized or ConstraintHasOne error"
        );
      } else {
        // If it's not an AnchorError, check if it's a custom error
        assert(error.toString().includes("Unauthorized"), "Expected an error containing 'Unauthorized'");
      }
    }
  
    // Verify the zombie is still in the army
    let army_data = await program.account.army.fetch(armyPDA);
    assert(!army_data.zombies[0].dna.eq(new anchor.BN(0)), "Zombie should not have been removed");
  });
  
  it("fails to remove zombie from army with session token (unauthorized)", async () => {
    const armyOwner = anchor.web3.Keypair.generate();
    const randomUser = anchor.web3.Keypair.generate();
    await topUp(armyOwner);
    await topUp(randomUser);
  
    const { sessionSigner, sessionToken } = await createSessionSigner(randomUser);
    const [, armyPDA] = await createArmy(armyOwner);
  
    try {
      await program.methods
        .removeZombie(0)
        .accounts({
          army: armyPDA,
          owner: armyOwner.publicKey, // Correct owner, but not the signer
          signer: sessionSigner.publicKey,
          sessionToken,
        })
        .signers([sessionSigner])
        .rpc();
      assert.fail("Expected an error, but none was thrown");
    } catch (error: any) {
      // Log the full error for debugging
      // console.log("Error:", error);
  
      assert(
        error.error.errorCode.code === "Unauthorized" ||
        error.error.errorCode.code === "InvalidToken" ||
        error.error.errorCode.code === "ConstraintHasOne",
        "Unexpected error"
      );
    }
  
    // Verify the zombie is still in the army
    let army_data = await program.account.army.fetch(armyPDA);
    assert(!army_data.zombies[0].dna.eq(new anchor.BN(0)), "Zombie should not have been removed");
  });
  
  it("it battles using session token", async () => {
    const secondUser = anchor.web3.Keypair.generate();
    await topUp(secondUser);

    let [, armyPDA] = await createArmy(secondUser);    

    const zombie_dna = new anchor.BN(createZombieDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    const { sessionSigner, sessionToken } = await createSessionSigner(secondUser);    
    const battlePDA = createBattlePDA(secondUser.publicKey, zombie_dna, dna2, dna3);  
    await battle_with_session(battlePDA, secondUser.publicKey, armyPDA, zombie_id, selection, zombie_dna, dna2, dna3, sessionSigner, sessionToken);

    let battleData = await program.account.battle.fetch(battlePDA);
    assert(battleData.selection === selection);
  });

  it("it battles without session token", async () => {
    const secondUser = anchor.web3.Keypair.generate();
    await topUp(secondUser);

    let [, armyPDA] = await createArmy(secondUser);    

    const zombie_dna = new anchor.BN(createZombieDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    const battlePDA = createBattlePDA(secondUser.publicKey, zombie_dna, dna2, dna3);  
    await battle(battlePDA, secondUser, armyPDA, zombie_id, selection, zombie_dna, dna2, dna3);

    let battleData = await program.account.battle.fetch(battlePDA);
    assert(battleData.selection === selection);
  });

  it("fails to battle army _unauthorized_ (without session token)", async () => {
    const armyOwner = anchor.web3.Keypair.generate();
    const randomUser = anchor.web3.Keypair.generate();
    await topUp(armyOwner);
    await topUp(randomUser);
  
    const [, armyPDA] = await createArmy(armyOwner);
    const zombie_dna = new anchor.BN(createZombieDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    
    try {
      const battlePDA = createBattlePDA(armyOwner.publicKey, zombie_dna, dna2, dna3);  
      await battle(battlePDA, randomUser, armyPDA, zombie_id, selection, zombie_dna, dna2, dna3);
      assert.fail("Expected an error, but none was thrown");
    } catch (error: any) {
      
      if (error instanceof anchor.AnchorError) {
        assert(
          error.error.errorCode.code === "Unauthorized" ||
          error.error.errorCode.code === "ConstraintHasOne",
          "Expected Unauthorized or ConstraintHasOne error"
        );
      } else {
        // If it's not an AnchorError, check if it's a custom error
        assert(error.toString().includes("Unauthorized"), "Expected an error containing 'Unauthorized'");
      }
    }
  });
  
  it("fails to battle with _unauthorized_ session token ", async () => {
    const armyOwner = anchor.web3.Keypair.generate();
    const randomUser = anchor.web3.Keypair.generate();
    await topUp(armyOwner);
    await topUp(randomUser);
  
    const [, armyPDA] = await createArmy(armyOwner);
    const zombie_dna = new anchor.BN(createZombieDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    try {
      
      const { sessionSigner, sessionToken } = await createSessionSigner(randomUser);    
      const battlePDA = createBattlePDA(armyOwner.publicKey, zombie_dna, dna2, dna3);  
      await battle_with_session(battlePDA, armyOwner.publicKey, armyPDA, zombie_id, selection, zombie_dna, dna2, dna3, sessionSigner, sessionToken);

      assert.fail("Expected an error, but none was thrown");
    } catch (error: any) {
      // Log the full error for debugging
      // console.log("Error:", error);
  
      assert(
        error.error.errorCode.code === "Unauthorized" ||
        error.error.errorCode.code === "InvalidToken" ||
        error.error.errorCode.code === "ConstraintHasOne",
        "Unexpected error"
      );
    }
  
    // Verify the zombie is still in the army
    let army_data = await program.account.army.fetch(armyPDA);
    assert(!army_data.zombies[0].dna.eq(new anchor.BN(0)), "Zombie should not have been removed");
  });

  it("adds zombie to army when battle won", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);

    let [, armyPDA] = await createArmy(newUser);    
    
    const dna1 = new anchor.BN(createHumanDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    const battlePDA = createBattlePDA(newUser.publicKey, dna1, dna2, dna3);  
    await battle(battlePDA, newUser, armyPDA, zombie_id, selection, dna1, dna2, dna3);

    let army_data = await program.account.army.fetch(armyPDA);
    assert(army_data.zombies[1].dna.gt(new anchor.BN(0)));
  });

  it("zombie needs rest between battles", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);

    let [, armyPDA] = await createArmy(newUser);    
    
    const dna1 = new anchor.BN(createHumanDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    const battlePDA = createBattlePDA(newUser.publicKey, dna1, dna2, dna3);  
    await battle(battlePDA, newUser, armyPDA, zombie_id, selection, dna1, dna2, dna3);

    const new_dna1 = new anchor.BN(createHumanDna().toString());
    const new_dna2 = new anchor.BN(createHumanDna().toString());
    const new_dna3 = new anchor.BN(createHumanDna().toString());

    try {
      const battlePDA2 = createBattlePDA(newUser.publicKey, new_dna1, new_dna2, new_dna3);  
      await battle(battlePDA2, newUser, armyPDA, zombie_id, selection, new_dna1, new_dna2, new_dna3);
      assert.fail("Expected an error but none was thrown");
    } catch (e) {
      // console.log(e);
      assert.equal(e.error.errorCode.code, "ZombieNotReady");
    }
  });
});



function createZombieDna() {
  return parseInt('1' + getRandomHexString(13), 16);
}

function createHumanDna() {
  return parseInt('2' + getRandomHexString(13), 16);
}

function getRandomHexString(length: number) {
  return Array.from({ length }, () => 
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}