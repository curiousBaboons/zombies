use anchor_lang::error_code;

#[error_code]
pub enum GameErrorCode {
    #[msg("Invalid zombie ID")]
    InvalidZombieId,

    #[msg("Zombie is not ready to fight")]
    ZombieNotReady,

    #[msg("Invalid DNA value")]
    InvalidDna,

    #[msg("Invalid selection")]
    InvalidSelection,

    #[msg("Army is full")]
    ArmyFull,

    #[msg("Insufficient XP")]
    InsufficientXp,

    #[msg("Invalid battle outcome")]
    InvalidBattleOutcome,

    #[msg("Battle already in progress")]
    BattleInProgress,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("You have reach your army limit")]
    NoEmptySlot,
}