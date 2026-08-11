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

    // 단순 conditions는 기본 AND. conditionMode: 'any'면 조건끼리 OR.
    // conditionGroups는 복합 조건용으로, 각 그룹 내부는 AND / 그룹끼리는 OR이다.
    if (pokemon.conditionGroups?.length) {
      return pokemon.conditionGroups.some(group =>
        group.every(condition => this.registry.run(condition.type, condition, ctx))
      );
    }

    const conditions = pokemon.conditions ?? [];
    if (pokemon.conditionMode === 'any') {
      return conditions.some(condition => this.registry.run(condition.type, condition, ctx));
    }
    return conditions.every(condition => this.registry.run(condition.type, condition, ctx));
  }

  getCandidates(state, portalInput) {
    return this.pokemonData.filter(pokemon => !pokemon.starter && this.matches(pokemon, state, portalInput));
  }
}
