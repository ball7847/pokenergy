export class PokemonSystem {
  constructor({ pokemonData, productionSystem }) {
    this.pokemonData = pokemonData;
    this.productionSystem = productionSystem;
    this.byId = new Map(pokemonData.map(pokemon => [pokemon.id, pokemon]));
  }

  acquire(state, pokemonId, { amount = 1, now = Date.now() } = {}) {
    const pokemon = this.byId.get(pokemonId);
    if (!pokemon) throw new Error(`알 수 없는 포켓몬 ID: ${pokemonId}`);

    const wasDiscovered = Boolean(state.pokemon.discovered[pokemonId]);
    const nextCount = (state.pokemon.counts[pokemonId] ?? 0) + amount;
    state.pokemon.counts[pokemonId] = nextCount;
    state.pokemon.discovered[pokemonId] = true;

    const record = state.pokemon.records[pokemonId] ?? { discoveredAt: null, maxCount: 0 };
    if (!wasDiscovered) record.discoveredAt = now;
    record.maxCount = Math.max(record.maxCount ?? 0, nextCount);
    state.pokemon.records[pokemonId] = record;
    state.meta.updatedAt = now;

    this.productionSystem.invalidate();
    return { pokemon, isNew: !wasDiscovered, count: nextCount };
  }
}
