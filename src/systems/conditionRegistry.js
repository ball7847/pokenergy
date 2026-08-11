import { Registry } from '../core/Registry.js';

export function createConditionRegistry() {
  const registry = new Registry();

  registry.register('energy_min', (condition, ctx) =>
    (ctx.portalInput[condition.energy] ?? 0) >= condition.value);

  registry.register('energy_exact', (condition, ctx) =>
    (ctx.portalInput[condition.energy] ?? 0) === condition.value);

  registry.register('total_energy_min', (condition, ctx) =>
    ctx.totalInput >= condition.value);

  registry.register('pokemon_count_min', (condition, ctx) =>
    (ctx.state.pokemon.counts[condition.pokemon] ?? 0) >= condition.value);

  registry.register('pokemon_discovered', (condition, ctx) =>
    Boolean(ctx.state.pokemon.discovered[condition.pokemon]));

  registry.register('type_pokemon_count_min', (condition, ctx) => {
    const count = ctx.pokemonData
      .filter(p => p.types.includes(condition.energy))
      .reduce((sum, p) => sum + (ctx.state.pokemon.counts[p.id] ?? 0), 0);
    return count >= condition.value;
  });

  registry.register('type_discovered_count_min', (condition, ctx) => {
    const count = ctx.pokemonData.filter(p =>
      p.types.includes(condition.energy) && ctx.state.pokemon.discovered[p.id]).length;
    return count >= condition.value;
  });

  registry.register('energy_type_count', (condition, ctx) => {
    const used = Object.values(ctx.portalInput).filter(v => v > 0).length;
    const mode = condition.mode ?? 'exact';
    if (mode === 'min') return used >= condition.value;
    if (mode === 'max') return used <= condition.value;
    return used === condition.value;
  });

  registry.register('energy_not_used', (condition, ctx) =>
    (ctx.portalInput[condition.energy] ?? 0) <= 0);

  registry.register('energy_ratio', (condition, ctx) => {
    const denominator = ctx.portalInput[condition.denominator] ?? 0;
    if (denominator <= 0) return false;
    const ratio = (ctx.portalInput[condition.numerator] ?? 0) / denominator;
    const min = condition.min ?? -Infinity;
    const max = condition.max ?? Infinity;
    return ratio >= min && ratio <= max;
  });

  registry.register('total_discovered_min', (condition, ctx) =>
    Object.keys(ctx.state.pokemon.discovered).length >= condition.value);

  return registry;
}
