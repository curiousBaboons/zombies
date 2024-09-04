use anchor_lang::prelude::*;
use crate::constants::MAX_ZOMBIES;
use crate::errors::GameErrorCode;
use crate::state::Zombie;


#[account]
#[derive(Default)]
pub struct Army {
    pub owner: Pubkey,
    pub zombies: [Zombie; MAX_ZOMBIES],
}

impl Army {

    pub fn add_zombie(&mut self, zombie: Zombie) -> Result<()> {
        // find an empty slot in the zombies array 
        let empty_slot_idx = self.zombies.iter().position(|z| z.dna == 0).ok_or(GameErrorCode::NoEmptySlot)?;
        self.zombies[empty_slot_idx] = zombie;
        Ok(())        
    }
}
