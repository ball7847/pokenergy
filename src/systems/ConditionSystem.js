export class ConditionSystem {
  constructor(registry, pokemonData) {
    this.registry = registry;
    this.pokemonData = pokemonData;
  }

  createContext(state, portalInput) {
    return {
      state,
      portalInput,
      pokemonData: this.pokemonData,
      totalInput: Object.values(portalInput).reduce((sum, value) => sum + value, 0),
    };
  }

  matches(pokemon, state, portalInput) {
    const ctx = this.createContext(state, portalInput);
    return (pokemon.conditions ?? []).every(condition => this.registry.run(condition.type, condition, ctx));
  }

  getCandidates(state, portalInput) {
    return this.pokemonData.filter(pokemon => !pokemon.starter && this.matches(pokemon, state, portalInput));
  }
}
