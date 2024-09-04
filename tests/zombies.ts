import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zombies } from "../target/types/zombies";
import { assert } from "chai";

describe("zombies", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Zombies as Program<Zombies>;

  const topUp = async (wallet: anchor.web3.Keypair) => {
    const res = await provider.connection.requestAirdrop(wallet.publicKey, 1e9);
    await provider.connection.confirmTransaction(res, "confirmed");
  };

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

  const battle = async (
    user: anchor.web3.Keypair,
    armyPDA: anchor.web3.PublicKey,
    zombieId: number,
    selection: number,
    dna1: anchor.BN,
    dna2: anchor.BN,
    dna3: anchor.BN
  ) => {
    const battlePDA = createBattlePDA(user.publicKey, dna1, dna2, dna3);

    await program.methods
      .battle(zombieId, selection, dna1, dna2, dna3)
      .accounts({
        army: armyPDA,
        battle: battlePDA,
        owner: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
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

  it("removes zombie from army", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);

    let [, armyPDA] = await createArmy(newUser);    
    
    await program.methods
      .removeZombie(0)
      .accounts({
        army: armyPDA,
        owner: newUser.publicKey,
      })
      .signers([newUser])
      .rpc();

    let army_data = await program.account.army.fetch(armyPDA);
    assert(army_data.zombies[0].dna.eq(new anchor.BN(0)));
  });

  it("it battles!", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await topUp(newUser);

    let [, armyPDA] = await createArmy(newUser);    

    const zombie_dna = new anchor.BN(createZombieDna().toString());
    const dna2 = new anchor.BN(createHumanDna().toString());
    const dna3 = new anchor.BN(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;

    const battlePDA = await battle(newUser, armyPDA, zombie_id, selection, zombie_dna, dna2, dna3);

    let battleData = await program.account.battle.fetch(battlePDA);
    assert(battleData.selection === selection);
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
    
    await battle(newUser, armyPDA, zombie_id, selection, dna1, dna2, dna3);

    let army_data = await program.account.army.fetch(armyPDA);
    
    // assert that first zombie dna is greater then 0
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

    await battle(newUser, armyPDA, zombie_id, selection, dna1, dna2, dna3);

    const new_dna1 = new anchor.BN(createHumanDna().toString());
    const new_dna2 = new anchor.BN(createHumanDna().toString());
    const new_dna3 = new anchor.BN(createHumanDna().toString());

    try {
      await battle(newUser, armyPDA, zombie_id, selection, new_dna1, new_dna2, new_dna3);
      assert.fail("Expected an error but none was thrown");
    } catch (e) {
      // make sure that we get this error
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