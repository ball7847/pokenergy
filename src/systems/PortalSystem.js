import { GAME_CONFIG } from '../config/gameConfig.js';

export class PortalSystem {
  constructor({ conditionSystem, effectSystem, productionSystem, pokemonData, energyTypes, random = Math.random }) {
    this.conditionSystem = conditionSystem;
    this.effectSystem = effectSystem;
    this.productionSystem = productionSystem;
    this.pokemonData = pokemonData;
    this.energyTypes = energyTypes;
    this.random = random;
  }

  getCooldownSeconds(state) {
    const ctx = this.effectSystem.runHook('portal:cooldown', state, {
      value: GAME_CONFIG.portal.baseCooldownSeconds,
    });
    return Math.max(GAME_CONFIG.portal.minCooldownSeconds, ctx.value);
  }

  getCandidates(state) {
    return this.conditionSystem.getCandidates(state, state.portal.input);
  }

  validate(state, now = Date.now()) {
    if (now < state.portal.cooldownUntil) return { ok: false, reason: 'cooldown' };

    const usedTypes = this.energyTypes.filter(type => (state.portal.input[type] ?? 0) > 0);
    if (!usedTypes.length) return { ok: false, reason: 'empty_input' };
    if (usedTypes.length > state.unlocks.maxEnergyTypes) return { ok: false, reason: 'too_many_types' };

    for (const type of usedTypes) {
      if ((state.resources.energy[type] ?? 0) < state.portal.input[type]) {
        return { ok: false, reason: 'insufficient_energy', type };
      }
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
    const isNew = !state.pokemon.discovered[pokemon.id];

    const nextCount = (state.pokemon.counts[pokemon.id] ?? 0) + 1;
    state.pokemon.counts[pokemon.id] = nextCount;
    state.pokemon.discovered[pokemon.id] = true;

    const record = state.pokemon.records[pokemon.id] ?? { discoveredAt: null, maxCount: 0 };
    if (isNew) record.discoveredAt = now;
    record.maxCount = Math.max(record.maxCount ?? 0, nextCount);
    state.pokemon.records[pokemon.id] = record;

    state.portal.cooldownUntil = now + this.getCooldownSeconds(state) * 1000;
    state.meta.updatedAt = now;

    this.productionSystem.invalidate();
    return { ok: true, pokemon, isNew, candidateCount: validation.candidates.length };
  }
}
