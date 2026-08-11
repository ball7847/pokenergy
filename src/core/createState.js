import { ENERGY_TYPES } from '../data/types.js';
import { POKEMON_DATA } from '../data/pokemon.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

export function createInitialState(now = Date.now()) {
  const counts = Object.fromEntries(POKEMON_DATA.map(p => [p.id, 0]));
  counts.ditto = 1;

  const records = Object.fromEntries(POKEMON_DATA.map(p => [p.id, {
    discoveredAt: null,
    maxCount: 0,
  }]));
  records.ditto = { discoveredAt: now, maxCount: 1 };

  return {
    meta: { saveVersion: GAME_CONFIG.saveVersion, createdAt: now, updatedAt: now },
    resources: { energy: Object.fromEntries(ENERGY_TYPES.map(type => [type, 0])) },
    pokemon: {
      counts,
      discovered: { ditto: true },
      records,
    },
    portal: {
      input: Object.fromEntries(ENERGY_TYPES.map(type => [type, 0])),
      cooldownUntil: 0,
      auto: { enabled: false },
    },
    unlocks: { maxEnergyTypes: GAME_CONFIG.portal.startingMaxEnergyTypes, autoSummon: false },
    story: {
      introNextIndex: 0,
      introComplete: false,
    },
    runtime: { lastTickAt: now },
    logs: [],
    debug: { productionSpeed: 1 },
  };
}
