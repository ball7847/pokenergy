import { GAME_CONFIG } from '../config/gameConfig.js';

export class UnlockSystem {
  constructor(effectSystem) { this.effectSystem = effectSystem; }

  recalculate(state) {
    const unlocks = {
      maxEnergyTypes: GAME_CONFIG.portal.startingMaxEnergyTypes,
      autoSummon: false,
    };
    this.effectSystem.runHook('unlocks', state, { unlocks });
    state.unlocks = unlocks;
    return unlocks;
  }
}
