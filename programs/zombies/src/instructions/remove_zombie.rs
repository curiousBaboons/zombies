use anchor_lang::prelude::*;
pub use session_keys::{Session, SessionError, SessionToken};


pub use crate::errors::GameErrorCode;
use crate::state::Army;


pub fn remove_zombie(ctx: Context<RemoveZombie>, zombie_id: u8) -> Result<()> {
    let army = &mut ctx.accounts.army;
    
    army.zombies[zombie_id as usize].remove();
    Ok(())
}



#[derive(Accounts, Session)]
#[instruction(zombie_id: u8)]
pub struct RemoveZombie<'info> {
    #[account(
        mut,
        has_one = owner
    )]
    pub army: Account<'info, Army>,

    #[session(
        signer = signer,
        // The authority of the user account which must have created the session
        authority = owner.key()
    )]
    pub session_token: Option<Account<'info, SessionToken>>,

    /// CHECK: This is the actual owner, not necessarily the signer
    pub owner: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
}