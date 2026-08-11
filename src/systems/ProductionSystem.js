export class ProductionSystem {
  constructor({ pokemonData, energyTypes, effectSystem, random = Math.random }) {
    this.pokemonData = pokemonData;
    this.energyTypes = energyTypes;
    this.effectSystem = effectSystem;
    this.random = random;
    this.cache = Object.fromEntries(energyTypes.map(type => [type, 0]));
    this.dirty = true;
  }

  invalidate() { this.dirty = true; }

  getProduction(state) {
    if (!this.dirty) return this.cache;

    const production = Object.fromEntries(this.energyTypes.map(type => [type, 0]));

    for (const pokemon of this.pokemonData) {
      const count = state.pokemon.counts[pokemon.id] ?? 0;
      if (!count) continue;

      // 확정 규칙: 단일/복합 타입 모두 자신의 각 타입 에너지를 1마리당 +1/s 생산한다.
      for (const type of pokemon.types) production[type] += count;
    }

    this.effectSystem.runHook('production:additive', state, { production, energyTypes: this.energyTypes });
    this.effectSystem.runHook('production:multiplicative', state, { production, energyTypes: this.energyTypes });

    const speed = state.debug.productionSpeed ?? 1;
    for (const type of this.energyTypes) production[type] *= speed;

    this.cache = production;
    this.dirty = false;
    return this.cache;
  }

  /** 정확히 1초 생산분을 계산하고 상태에 반영한다. 확률형 능력도 이 시점에 1회 판정한다. */
  produceOneSecond(state) {
    const baseGains = { ...this.getProduction(state) };
    const gains = { ...baseGains };
    const abilityEvents = [];
    this.effectSystem.runHook('production:second_tick', state, {
      baseGains,
      gains,
      energyTypes: this.energyTypes,
      random: this.random,
      abilityEvents,
    });

    for (const type of this.energyTypes) {
      state.resources.energy[type] += gains[type] ?? 0;
    }
    return { gains, abilityEvents };
  }
}
