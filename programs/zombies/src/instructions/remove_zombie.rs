use anchor_lang::prelude::*;

pub use crate::errors::GameErrorCode;
use crate::state::Army;

pub fn remove_zombie(ctx: Context<RemoveZombie>, zombie_id: u8) -> Result<()> {
    let army = &mut ctx.accounts.army;
    
    army.zombies[zombie_id as usize].remove();
    Ok(())
}

#[derive(Accounts)]
#[instruction(zombie_id: u8)]
pub struct RemoveZombie<'info> {
    #[account(
        mut, 
        has_one = owner
    )]
    pub army: Account<'info, Army>,
    pub owner: Signer<'info>,
}

