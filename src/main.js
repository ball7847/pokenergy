import { GAME_CONFIG } from './config/gameConfig.js';
import { ENERGY_TYPES } from './data/types.js';
import { POKEMON_DATA } from './data/pokemon.js';
import { createInitialState } from './core/createState.js';
import { GameStore } from './core/GameStore.js';
import { Game } from './core/Game.js';
import { createConditionRegistry } from './systems/conditionRegistry.js';
import { ConditionSystem } from './systems/ConditionSystem.js';
import { createEffectRegistry } from './systems/effectRegistry.js';
import { EffectSystem } from './systems/EffectSystem.js';
import { ProductionSystem } from './systems/ProductionSystem.js';
import { PortalSystem } from './systems/PortalSystem.js';
import { PokemonSystem } from './systems/PokemonSystem.js';
import { UnlockSystem } from './systems/UnlockSystem.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { AppView } from './ui/AppView.js';

const saveSystem = new SaveSystem();
const savedState = safeLoad(saveSystem) ?? createInitialState();
const store = new GameStore(savedState);
const conditionSystem = new ConditionSystem(createConditionRegistry(), POKEMON_DATA);
const effectSystem = new EffectSystem(createEffectRegistry(), POKEMON_DATA);
const productionSystem = new ProductionSystem({ pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES, effectSystem });
const pokemonSystem = new PokemonSystem({ pokemonData: POKEMON_DATA, productionSystem });
const portalSystem = new PortalSystem({ conditionSystem, effectSystem, productionSystem, pokemonSystem, pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES });
const unlockSystem = new UnlockSystem(effectSystem);
unlockSystem.recalculate(savedState);

const game = new Game({
  store,
  productionSystem,
  portalSystem,
  unlockSystem,
  saveSystem,
  pokemonSystem,
  config: GAME_CONFIG,
  createInitialState,
});

const view = new AppView({
  root: document.querySelector('#app'),
  game,
  store,
  pokemonData: POKEMON_DATA,
  energyTypes: ENERGY_TYPES,
});

view.mount();
game.start();

window.pokenergy = { game, store, systems: { conditionSystem, effectSystem, productionSystem, portalSystem, pokemonSystem, unlockSystem } };

function safeLoad(system) {
  try {
    return system.load();
  } catch (error) {
    console.error('저장 데이터 불러오기 실패:', error);
    return null;
  }
}
