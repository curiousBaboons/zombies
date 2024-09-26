use anchor_lang::prelude::*;
use session_keys::{SessionToken, Session};

use crate::state::{Army, Zombie, Battle, BattleOutcome};
use crate::errors::GameErrorCode;

pub fn battle(ctx: Context<InitBattle>, zombie_id: u8, selection: u8, dna1: u64, dna2: u64, dna3: u64) -> Result<()> {
    let battle = &mut ctx.accounts.battle;
    let army = &mut ctx.accounts.army;

    battle.owner = *ctx.accounts.owner.key;
    battle.zombie_id = zombie_id;
    battle.selection = selection;

    // check if zombie is ready 
    if !army.zombies[zombie_id as usize].is_ready() {
        return Err(GameErrorCode::ZombieNotReady.into());
    }

    // update zombie last fight timestamp 
    army.zombies[zombie_id as usize].set_last_fight();

    battle.shuffle_dna([dna1, dna2, dna3]);
    battle.determine_battle_outcome();

    if battle.outcome == BattleOutcome::Won {
        // add XP to zombie
        army.zombies[zombie_id as usize].add_xp();

        // get human DNA from shuffled order using battle.selection as index
        let human_dna = battle.shuffled_order[battle.selection as usize];
        // create new zombie from human DNA, using Zombie from_dna()
        let new_zombie = Zombie::from_dna(human_dna);
        // add zombie to army
        army.add_zombie(new_zombie)?;
    }

    Ok(())
}

#[derive(Accounts, Session)]
#[instruction(zombie_id: u8, selection: u8, dna1: u64, dna2: u64, dna3: u64)]
pub struct InitBattle<'info>{
    #[session(
        signer = signer,
        // The authority of the user account which must have created the session
        authority = owner.key()
    )]
    // Session Tokens are passed as optional accounts
    pub session_token: Option<Account<'info, SessionToken>>,    
    
    #[account(
        init,
        payer = signer,
        space = 8 + Battle::INIT_SPACE,
        seeds = [
            army.owner.key().as_ref(),
            dna1.to_le_bytes().as_ref(), 
            dna2.to_le_bytes().as_ref(), 
            dna3.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub battle: Account<'info, Battle>,    
    
    #[account(
        mut,
        has_one = owner
    )]
    pub army: Account<'info, Army>,    
    
    /// CHECK: This is the actual owner, not necessarily the signer
    pub owner: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

