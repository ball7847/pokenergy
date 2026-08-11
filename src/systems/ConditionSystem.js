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

    // 기존 conditions는 한 그룹 내 AND 조건이다.
    // conditionGroups가 있으면 각 그룹은 AND, 그룹끼리는 OR로 판정한다.
    const groups = pokemon.conditionGroups?.length
      ? pokemon.conditionGroups
      : [pokemon.conditions ?? []];

    return groups.some(group =>
      group.every(condition => this.registry.run(condition.type, condition, ctx))
    );
  }

  getCandidates(state, portalInput) {
    return this.pokemonData.filter(pokemon => !pokemon.starter && this.matches(pokemon, state, portalInput));
  }
}
