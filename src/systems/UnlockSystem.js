import { GAME_CONFIG } from '../config/gameConfig.js';

export class UnlockSystem {
  constructor(effectSystem) { this.effectSystem = effectSystem; }

  recalculate(state) {
    const unlocks = {
      maxEnergyTypes: GAME_CONFIG.portal.startingMaxEnergyTypes,
      autoSummon: false,
    };
    this.effectSystem.runHook('unlocks', state, { unlocks });

    const unlockedCount = this.getUnlockedEnergyTypeCount(state);
    for (const tier of GAME_CONFIG.portal.energyTypeUnlockTiers ?? []) {
      if (unlockedCount >= tier.unlockedTypes) {
        unlocks.maxEnergyTypes = Math.max(unlocks.maxEnergyTypes, tier.maxEnergyTypes);
      }
    }

    state.unlocks = unlocks;
    return unlocks;
  }

  getUnlockedEnergyTypeCount(state) {
    return Object.values(state.progression?.unlockedEnergyTypes ?? {}).filter(Boolean).length;
  }

  /**
   * 에너지 보유량이 처음 0을 초과한 타입을 영구적으로 해금 처리한다.
   * 반환값은 이번 호출에서 새로 넘은 포탈 강화 단계 목록이다.
   */
  updateEnergyUnlocks(state) {
    state.progression ??= { unlockedEnergyTypes: {}, portalEnergyTier: 0 };
    state.progression.unlockedEnergyTypes ??= {};
    state.progression.portalEnergyTier ??= 0;

    for (const [type, amount] of Object.entries(state.resources?.energy ?? {})) {
      if ((Number(amount) || 0) > 0) state.progression.unlockedEnergyTypes[type] = true;
    }

    const unlockedCount = this.getUnlockedEnergyTypeCount(state);
    const tiers = GAME_CONFIG.portal.energyTypeUnlockTiers ?? [];
    let reachedTier = 0;
    for (let i = 0; i < tiers.length; i += 1) {
      if (unlockedCount >= tiers[i].unlockedTypes) reachedTier = i + 1;
    }

    const previousTier = Math.max(0, Number(state.progression.portalEnergyTier) || 0);
    const triggered = [];
    if (reachedTier > previousTier) {
      for (let i = previousTier; i < reachedTier; i += 1) triggered.push(tiers[i]);
      state.progression.portalEnergyTier = reachedTier;
    }

    this.recalculate(state);
    return triggered;
  }
}
