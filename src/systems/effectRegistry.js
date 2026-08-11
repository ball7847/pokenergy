import { Registry } from '../core/Registry.js';

/**
 * 모든 효과 handler는 같은 형태로 context를 받아 필요한 값을 수정한다.
 * phase를 데이터에 넣지 않고 handler 내부 책임으로 둬 데이터 포맷을 단순하게 유지한다.
 */
export function createEffectRegistry() {
  const registry = new Registry();

  registry.register('ditto_add_type', (effect, ctx) => {
    if (ctx.hook !== 'production:additive') return;
    ctx.production[effect.energy] += (ctx.state.pokemon.counts.ditto ?? 0) * effect.value;
  });

  registry.register('count_bonus', (effect, ctx) => {
    if (ctx.hook !== 'production:additive') return;
    const count = effect.pokemon.reduce((sum, id) => sum + (ctx.state.pokemon.counts[id] ?? 0), 0);
    ctx.production[effect.energy] += count * effect.value;
  });

  registry.register('creation_trio_bonus', (effect, ctx) => {
    if (ctx.hook !== 'production:additive') return;
    const count = effect.pokemon.reduce((sum, id) => sum + (ctx.state.pokemon.counts[id] ?? 0), 0);
    for (const energy of ctx.energyTypes) ctx.production[energy] += count * effect.value;
  });

  registry.register('type_multiplier', (effect, ctx) => {
    if (ctx.hook !== 'production:multiplicative') return;
    ctx.production[effect.energy] *= 1 + effect.value;
  });

  registry.register('second_tick_chance_count_energy', (effect, ctx) => {
    if (ctx.hook !== 'production:second_tick') return;
    if (ctx.random() >= effect.chance) return;
    const count = ctx.state.pokemon.counts[effect.pokemon] ?? 0;
    if (count <= 0) return;
    const amount = count * (effect.value ?? 1);
    ctx.gains[effect.energy] = (ctx.gains[effect.energy] ?? 0) + amount;
    ctx.abilityEvents?.push({
      pokemonId: effect.pokemon,
      abilityName: effect.abilityName ?? effect.type,
      energy: effect.energy,
      amount,
    });
  });

  registry.register('cooldown_flat', (effect, ctx) => {
    if (ctx.hook !== 'portal:cooldown') return;
    ctx.value -= effect.value;
  });

  registry.register('max_energy_types_add', (effect, ctx) => {
    if (ctx.hook !== 'unlocks') return;
    ctx.unlocks.maxEnergyTypes += effect.value;
  });

  registry.register('auto_summon_unlock', (_effect, ctx) => {
    if (ctx.hook !== 'unlocks') return;
    ctx.unlocks.autoSummon = true;
  });

  return registry;
}
