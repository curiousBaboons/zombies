use anchor_lang::prelude::*;
use crate::constants::MAX_CARDS;


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[derive(PartialEq)]
#[derive(Default, InitSpace)]
pub enum BattleOutcome {
    #[default]
    Won,
    Lost,
}


#[account]
#[derive(Default, InitSpace)]
pub struct Battle {
    pub owner: Pubkey,
    pub zombie_id: u8,
    pub shuffled_order: [u64; MAX_CARDS as usize],
    pub selection: u8,
    pub outcome: BattleOutcome,
}

impl Battle {
    pub fn shuffle_dna(&mut self, dna_values: [u64; MAX_CARDS as usize]) {
        let random_index = Self::random_number();
        // shuffle the dna values based on the random index
        self.shuffled_order = match random_index {
            0 => dna_values,
            1 => [dna_values[1], dna_values[2], dna_values[0]],
            2 => [dna_values[2], dna_values[0], dna_values[1]],
            _ => [0, 0, 0],
        };
    }

    pub fn determine_battle_outcome(&mut self) {
        // find selected dna in shuffled_order using selection 
        let selected_dna = self.shuffled_order[self.selection as usize];
        let selected_dna_hex = format!("{:x}", selected_dna);
        let first_char = selected_dna_hex.chars().next().unwrap();

        // determine battle outcome based on the first character of the selected dna
        self.outcome = match first_char {
            '1' => BattleOutcome::Lost,
            _ => BattleOutcome::Won,
        };
    }

    fn random_number() -> u8 {
        // generate a random number between 0 and 2
        let slot = Clock::get().unwrap().slot;
        let xorshift_output = Self::xorshift64(slot);
        let random_no = xorshift_output % MAX_CARDS as u64;
        random_no.try_into().unwrap()
    }

    fn xorshift64(seed: u64) -> u64 {
        // Xorshift64 algorithm
        let mut x = seed;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        x
    }
}