use anchor_lang::prelude::*;
use crate::state::{Army, Zombie};
use crate::constants::MAX_ZOMBIES;

pub fn init_army(ctx: Context<InitArmy>) -> Result<()> {
    let army = &mut ctx.accounts.army;
    army.owner = *ctx.accounts.owner.key;

    // Initialize the first zombie
    army.zombies[0] = Zombie::from_key(army.owner);
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitArmy<'info>{
    #[account(
        init, 
        payer = owner, 
        space = 8 + 32 + (32 + 8 + 1) * MAX_ZOMBIES, // Adjusted space calculation
        seeds = [b"army".as_ref(), owner.key().as_ref()],
        bump
    )]
    pub army: Account<'info, Army>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>
}
