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
import { UnlockSystem } from './systems/UnlockSystem.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { AppView } from './ui/AppView.js';

const store = new GameStore(createInitialState());
const conditionSystem = new ConditionSystem(createConditionRegistry(), POKEMON_DATA);
const effectSystem = new EffectSystem(createEffectRegistry(), POKEMON_DATA);
const productionSystem = new ProductionSystem({ pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES, effectSystem });
const portalSystem = new PortalSystem({ conditionSystem, effectSystem, productionSystem, pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES });
const unlockSystem = new UnlockSystem(effectSystem);
const saveSystem = new SaveSystem();

const game = new Game({ store, productionSystem, portalSystem, unlockSystem, saveSystem, config: GAME_CONFIG });
const view = new AppView({ root: document.querySelector('#app'), game, store, pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES });

view.mount();
game.log('메타몽 1마리와 함께 시작합니다.');
game.start();

// 개발자 콘솔에서 시스템을 확인할 수 있게 최소한만 노출.
window.pokenergy = { game, store, systems: { conditionSystem, effectSystem, productionSystem, portalSystem, unlockSystem } };
