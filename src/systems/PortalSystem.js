import { GAME_CONFIG } from '../config/gameConfig.js';

export class PortalSystem {
  constructor({ conditionSystem, effectSystem, productionSystem, pokemonSystem, pokemonData, energyTypes, random = Math.random }) {
    this.conditionSystem = conditionSystem;
    this.effectSystem = effectSystem;
    this.productionSystem = productionSystem;
    this.pokemonSystem = pokemonSystem;
    this.pokemonData = pokemonData;
    this.energyTypes = energyTypes;
    this.random = random;
  }

  getBaseCooldownSeconds(state) {
    const totalSummons = state.portal.totalSummons ?? 0;
    const tiers = GAME_CONFIG.portal.cooldownTiers;
    let seconds = tiers[0]?.seconds ?? 2.5;
    for (const tier of tiers) {
      if (totalSummons >= tier.minSummons) seconds = tier.seconds;
    }
    return seconds;
  }

  getCooldownTierTrigger(previousSummons, totalSummons) {
    return GAME_CONFIG.portal.cooldownTiers
      .filter(tier => tier.minSummons > 0)
      .find(tier => previousSummons < tier.minSummons && totalSummons >= tier.minSummons) ?? null;
  }

  getCooldownSeconds(state) {
    const ctx = this.effectSystem.runHook('portal:cooldown', state, { value: this.getBaseCooldownSeconds(state) });
    return Math.max(GAME_CONFIG.portal.minCooldownSeconds, ctx.value);
  }

  getCandidates(state) { return this.conditionSystem.getCandidates(state, state.portal.input); }

  validate(state, now = Date.now()) {
    if (now < state.portal.cooldownUntil) return { ok: false, reason: 'cooldown' };
    const usedTypes = this.energyTypes.filter(type => (state.portal.input[type] ?? 0) > 0);
    if (!usedTypes.length) return { ok: false, reason: 'empty_input' };
    if (usedTypes.length > state.unlocks.maxEnergyTypes) return { ok: false, reason: 'too_many_types' };
    for (const type of usedTypes) {
      if ((state.resources.energy[type] ?? 0) < state.portal.input[type]) return { ok: false, reason: 'insufficient_energy', type };
    }
    const candidates = this.getCandidates(state);
    if (!candidates.length) return { ok: false, reason: 'no_candidates' };
    return { ok: true, usedTypes, candidates };
  }

  summon(state, now = Date.now()) {
    const validation = this.validate(state, now);
    if (!validation.ok) return validation;
    for (const type of validation.usedTypes) state.resources.energy[type] -= state.portal.input[type];

    const index = Math.floor(this.random() * validation.candidates.length);
    const pokemon = validation.candidates[index];
    const acquisition = this.pokemonSystem.acquire(state, pokemon.id, { now });

    const previousSummons = state.portal.totalSummons ?? 0;
    state.portal.totalSummons = previousSummons + 1;
    const cooldownTierTriggered = this.getCooldownTierTrigger(previousSummons, state.portal.totalSummons);

    state.portal.cooldownUntil = now + this.getCooldownSeconds(state) * 1000;
    return {
      ok: true,
      pokemon,
      isNew: acquisition.isNew,
      count: acquisition.count,
      candidateCount: validation.candidates.length,
      totalSummons: state.portal.totalSummons,
      cooldownTierTriggered,
    };
  }
}
