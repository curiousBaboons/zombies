use anchor_lang::prelude::*;
pub use session_keys::{session_auth_or, Session, SessionError};

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;

use crate::errors::GameErrorCode;
use instructions::*;

declare_id!("Hro7Amn2Hx7kirwdpFcYYGwG3NvqnTxcdgAkDsNpQtXG");

#[program]
pub mod zombies {
    use super::*;

    pub fn init_army(ctx: Context<InitArmy>) -> Result<()> {
        init_army::init_army(ctx)
    }

    #[session_auth_or(
        ctx.accounts.army.owner.key() == ctx.accounts.owner.key(),
        GameErrorCode::Unauthorized
    )]
    pub fn remove_zombie(ctx: Context<RemoveZombie>, zombie_id: u8) -> Result<()> {
        remove_zombie::remove_zombie(ctx, zombie_id)
    }

    #[session_auth_or(
        ctx.accounts.army.owner.key() == ctx.accounts.owner.key(),
        GameErrorCode::Unauthorized
    )]
    pub fn battle(ctx: Context<InitBattle>, zombie_id: u8, selection: u8, dna1: u64, dna2: u64, dna3: u64) -> Result<()> {
        battle::battle(ctx, zombie_id, selection, dna1, dna2, dna3)
    }



}

