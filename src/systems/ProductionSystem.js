import { GAME_CONFIG } from '../config/gameConfig.js';

export class ProductionSystem {
  constructor({ pokemonData, energyTypes, effectSystem }) {
    this.pokemonData = pokemonData;
    this.energyTypes = energyTypes;
    this.effectSystem = effectSystem;
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

      if (pokemon.types.length === 1) {
        production[pokemon.types[0]] += count;
      } else if (GAME_CONFIG.prototypeRules.dualTypeBaseProductionMode === 'split') {
        const perType = 1 / pokemon.types.length;
        for (const type of pokemon.types) production[type] += count * perType;
      }
    }

    this.effectSystem.runHook('production:additive', state, {
      production,
      energyTypes: this.energyTypes,
    });
    this.effectSystem.runHook('production:multiplicative', state, {
      production,
      energyTypes: this.energyTypes,
    });

    const speed = state.debug.productionSpeed ?? 1;
    for (const type of this.energyTypes) production[type] *= speed;

    this.cache = production;
    this.dirty = false;
    return this.cache;
  }
}
