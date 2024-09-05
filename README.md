
# Zombie Army Battle Game

This is a Solana-based blockchain game where players can create and manage their own army of zombies, engage in battles, and grow their zombie collection.

## Game Overview

- Players can initialize their army with a single zombie.
- Each zombie has unique DNA, experience points (XP), and a cooldown period between battles.
- Players can engage in battles using their zombies.
- Winning battles rewards players with XP for their zombie and a chance to create a new zombie.

## Key Features

1. **Army Initialization**: Players can create their army, starting with one zombie. First zombie is created with unique DNA based on the owner's public key and timestamp.

2. **Battle System**: 
   - Players can initiate battles using their zombies.
   - Battles involve selecting from shuffled DNA cards.
   - If player found human on a card, player won the battle. 
   - If its zombie, player lost the battle.
   - Winning battles rewards XP and a new zombie.

3. **Cooldown Mechanism**: Zombies need to wait 60 seconds between fights.

4. **Experience System**: Zombies gain XP from winning battles.

## Technical Details

- Built on the Solana blockchain using the Anchor framework.
- Utilizes Solana's account model for storing game state.
- Implements pseudo-random number generation for battle mechanics.
- Uses DNA-based zombie creation and battle resolution.

This game combines strategic army management with chance-based battles, creating an engaging blockchain gaming experience on the Solana network.
