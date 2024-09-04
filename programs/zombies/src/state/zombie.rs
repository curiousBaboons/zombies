use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hash, Hash};


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Zombie {
    pub dna: u64,
    pub last_fight: i64,
    pub xp: u8,
}

impl Zombie {
    pub fn from_key(owner_key: Pubkey) -> Self {
        let dna = Self::generate_dna(owner_key);
        Zombie {
            dna,
            last_fight: 0,
            xp: 0,
        }
    }

    pub fn generate_dna(owner_key: Pubkey) -> u64 {
        // get timestamp
        let clock = Clock::get().unwrap();
        let timestamp = clock.unix_timestamp as u64;

        // create a hash from the owner key and timestamp
        let mut data = owner_key.to_bytes().to_vec();
        data.extend_from_slice(&timestamp.to_le_bytes());

        let hash_result: Hash = hash(&data);

        // convert the first 8 bytes of the hash to a u64
        let mut dna = u64::from_le_bytes(hash_result.to_bytes()[..8].try_into().unwrap());

        // ensure the most significant bit is set to 1
        if dna < 0x1000000000000000 {
            dna |= 0x1000000000000000;
        }
        dna
    }

    pub fn from_dna(dna: u64) -> Self {
        // ensure the most significant bit is set to 1
        let zombie_dna = dna | 0x1000000000000000; 
        Zombie {
            dna: zombie_dna,
            last_fight: 0,
            xp: 0,
        }
    }

    pub fn is_ready(&self) -> bool {
        // zombie needs to wait 60 seconds between fights
        Clock::get().unwrap().unix_timestamp - self.last_fight >= 60
    }

    pub fn remove(&mut self) {
        // remove zombie by setting dna to 0
        self.dna = 0;
        self.last_fight = 0;
        self.xp = 0;
    }


    pub fn add_xp(&mut self) {
        // add zombie XP point 
        self.xp += 1;
    }

    pub fn set_last_fight(&mut self) {
        // set the last fight timestamp to the current unix timestamp
        self.last_fight = Clock::get().unwrap().unix_timestamp;
    }
    
}
