export class EffectSystem {
  constructor(registry, pokemonData) {
    this.registry = registry;
    this.pokemonData = pokemonData;
  }

  forEachUnlockedEffect(state, callback) {
    for (const pokemon of this.pokemonData) {
      if (!state.pokemon.discovered[pokemon.id]) continue;
      for (const effect of pokemon.effects ?? []) callback(effect, pokemon);
    }
  }

  runHook(hook, state, context = {}) {
    const ctx = { ...context, hook, state };
    this.forEachUnlockedEffect(state, effect => this.registry.run(effect.type, effect, ctx));
    return ctx;
  }
}
