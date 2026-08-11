import test from 'node:test';
import assert from 'node:assert/strict';
import { POKEMON_DATA } from '../src/data/pokemon.js';
import { ENERGY_TYPES } from '../src/data/types.js';
import { createInitialState } from '../src/core/createState.js';
import { createConditionRegistry } from '../src/systems/conditionRegistry.js';
import { ConditionSystem } from '../src/systems/ConditionSystem.js';
import { createEffectRegistry } from '../src/systems/effectRegistry.js';
import { EffectSystem } from '../src/systems/EffectSystem.js';
import { ProductionSystem } from '../src/systems/ProductionSystem.js';
import { PokemonSystem } from '../src/systems/PokemonSystem.js';
import { PortalSystem } from '../src/systems/PortalSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { GameStore } from '../src/core/GameStore.js';
import { Game } from '../src/core/Game.js';
import { UnlockSystem } from '../src/systems/UnlockSystem.js';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { formatEnergyNumber } from '../src/utils/format.js';
import { attachJosa, chooseJosa, hasBatchim } from '../src/utils/korean.js';

function createSystems(random = () => 0) {
  const conditionSystem = new ConditionSystem(createConditionRegistry(), POKEMON_DATA);
  const effectSystem = new EffectSystem(createEffectRegistry(), POKEMON_DATA);
  const productionSystem = new ProductionSystem({ pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES, effectSystem, random });
  const pokemonSystem = new PokemonSystem({ pokemonData: POKEMON_DATA, productionSystem });
  const portalSystem = new PortalSystem({ conditionSystem, effectSystem, productionSystem, pokemonSystem, pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES, random });
  return { conditionSystem, effectSystem, productionSystem, pokemonSystem, portalSystem };
}

test('새 게임은 포켓몬 없이 시작한다', () => {
  const state = createInitialState();
  assert.equal(state.pokemon.counts.ditto, 0);
  assert.equal(Boolean(state.pokemon.discovered.ditto), false);
  assert.equal(state.story.dittoGranted, false);
});

test('메타몽은 정확히 1종의 에너지를 총 10 이상 투입하면 후보가 된다', () => {
  const { conditionSystem } = createSystems();
  const state1 = createInitialState();
  state1.portal.input.normal = 10;
  let ids = conditionSystem.getCandidates(state1, state1.portal.input).map(p => p.id);
  assert.equal(ids.includes('ditto'), true);

  const state2 = createInitialState();
  state2.portal.input.fire = 10;
  ids = conditionSystem.getCandidates(state2, state2.portal.input).map(p => p.id);
  assert.equal(ids.includes('ditto'), true);

  state2.portal.input.water = 1;
  ids = conditionSystem.getCandidates(state2, state2.portal.input).map(p => p.id);
  assert.equal(ids.includes('ditto'), false);
});

test('노말 50 투입 시 메타몽과 꼬렛이 후보가 된다', () => {
  const state = createInitialState();
  state.portal.input.normal = 50;
  const { conditionSystem } = createSystems();
  const ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id).sort();
  assert.deepEqual(ids, ['ditto', 'rattata'].sort());
});

test('노말 1000 투입 시 메타몽/꼬렛/이상해씨/파이리/꼬부기가 후보가 된다', () => {
  const state = createInitialState();
  state.portal.input.normal = 1000;
  const { conditionSystem } = createSystems();
  const ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id).sort();
  assert.deepEqual(ids, ['ditto','rattata','bulbasaur','charmander','squirtle'].sort());
});

test('단일타입 포켓몬은 1초마다 보유 수만큼 생산한다', () => {
  const state = createInitialState();
  state.pokemon.counts.ditto = 1;
  state.pokemon.discovered.ditto = true;
  const { productionSystem } = createSystems(() => 0.99);
  productionSystem.produceOneSecond(state);
  assert.equal(state.resources.energy.normal, 1);
});

test('꼬렛 꼬리흔들기는 매초 1% 판정 성공 시 꼬렛 수의 10배만큼 노말에너지를 추가한다', () => {
  const state = createInitialState();
  state.pokemon.counts.rattata = 5;
  state.pokemon.discovered.rattata = true;
  const { productionSystem } = createSystems(() => 0.005);
  productionSystem.produceOneSecond(state);
  // 기본 꼬렛 5 + 꼬리흔들기 추가 50
  assert.equal(state.resources.energy.normal, 55);
});

test('꼬렛 꼬리흔들기는 판정 실패 시 기본 생산만 적용한다', () => {
  const state = createInitialState();
  state.pokemon.counts.rattata = 5;
  state.pokemon.discovered.rattata = true;
  const { productionSystem } = createSystems(() => 0.50);
  productionSystem.produceOneSecond(state);
  assert.equal(state.resources.energy.normal, 5);
});

test('소환은 후보군에서 균등 인덱스 선택 로직을 사용한다', () => {
  const state = createInitialState();
  state.resources.energy.normal = 100;
  state.portal.input.normal = 100;
  const { portalSystem } = createSystems(() => 0);
  const candidates = portalSystem.getCandidates(state);
  const result = portalSystem.summon(state, 1_000);
  assert.equal(result.pokemon.id, candidates[0].id);
  assert.equal(result.candidateCount, candidates.length);
});

test('신규 포켓몬 획득 시 최초 발견일과 역대 최대 수가 기록된다', () => {
  const state = createInitialState(100);
  const { pokemonSystem } = createSystems();
  const result = pokemonSystem.acquire(state, 'ditto', { now: 5_000 });
  assert.equal(result.isNew, true);
  assert.equal(state.pokemon.records.ditto.discoveredAt, 5_000);
  assert.equal(state.pokemon.records.ditto.maxCount, 1);
});

test('한국어 조사 이/가를 받침 유무에 맞게 선택한다', () => {
  assert.equal(hasBatchim('꼬렛'), true);
  assert.equal(hasBatchim('피카츄'), false);
  assert.equal(chooseJosa('꼬렛', '이/가'), '이');
  assert.equal(chooseJosa('피카츄', '이/가'), '가');
  assert.equal(attachJosa('꼬렛', '이/가'), '꼬렛이');
  assert.equal(attachJosa('피카츄', '이/가'), '피카츄가');
});

test('v4 저장은 최신 버전에서 기존 메타몽 재지급 방지 플래그를 설정한다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 4;
  legacy.pokemon.counts.ditto = 1;
  legacy.pokemon.discovered.ditto = true;
  delete legacy.story.dittoGranted;
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.equal(loaded.story.dittoGranted, true);
  assert.equal(loaded.meta.saveVersion, 11);
});


test('포탈 쿨타임은 0~49회 2.5초, 50~99회 5초, 100회 이상 10초다', () => {
  const state = createInitialState();
  const { portalSystem } = createSystems();
  state.portal.cooldownProgressSummons = 0;
  assert.equal(portalSystem.getCooldownSeconds(state), 2.5);
  state.portal.cooldownProgressSummons = 49;
  assert.equal(portalSystem.getCooldownSeconds(state), 2.5);
  state.portal.cooldownProgressSummons = 50;
  assert.equal(portalSystem.getCooldownSeconds(state), 5);
  state.portal.cooldownProgressSummons = 99;
  assert.equal(portalSystem.getCooldownSeconds(state), 5);
  state.portal.cooldownProgressSummons = 100;
  assert.equal(portalSystem.getCooldownSeconds(state), 10);
});

test('50번째와 100번째 소환에서 각각 쿨타임 단계 이벤트가 발생한다', () => {
  const state = createInitialState();
  const { portalSystem } = createSystems(() => 0);
  state.portal.totalSummons = 300;
  state.portal.cooldownProgressSummons = 49;
  state.resources.energy.normal = 20;
  state.portal.input.normal = 10;
  let result = portalSystem.summon(state, 1_000);
  assert.equal(result.cooldownTierTriggered.minSummons, 50);
  assert.equal(result.cooldownTierTriggered.seconds, 5);
  assert.equal(state.portal.cooldownUntil, 6_000);

  state.portal.cooldownUntil = 0;
  state.portal.cooldownProgressSummons = 99;
  result = portalSystem.summon(state, 10_000);
  assert.equal(result.cooldownTierTriggered.minSummons, 100);
  assert.equal(result.cooldownTierTriggered.seconds, 10);
  assert.equal(state.portal.cooldownUntil, 20_000);
});

test('v5 저장은 현재 개체 수에서 시작 메타몽 1마리를 빼 포탈 소환 수를 복원한다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 5;
  legacy.story.dittoGranted = true;
  legacy.story.introComplete = true;
  legacy.pokemon.counts.ditto = 4;
  legacy.pokemon.counts.rattata = 7;
  delete legacy.portal.totalSummons;
  delete legacy.portal.overloaded;
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.equal(loaded.portal.totalSummons, 10);
    assert.equal(loaded.meta.saveVersion, 11);
});


test('복합타입 포켓몬은 각 타입 에너지를 1씩 생산한다', () => {
  const state = createInitialState();
  state.pokemon.counts.bulbasaur = 2;
  state.pokemon.discovered.bulbasaur = true;
  const { productionSystem } = createSystems(() => 0.99);
  productionSystem.produceOneSecond(state);
  assert.equal(state.resources.energy.grass, 2);
  assert.equal(state.resources.energy.poison, 2);
});

test('이상해씨 발견 후 메타몽은 풀에너지를 추가 생산한다', () => {
  const state = createInitialState();
  state.pokemon.counts.ditto = 3;
  state.pokemon.discovered.ditto = true;
  state.pokemon.counts.bulbasaur = 1;
  state.pokemon.discovered.bulbasaur = true;
  const { productionSystem } = createSystems(() => 0.99);
  const production = productionSystem.getProduction(state);
  assert.equal(production.normal, 3);
  assert.equal(production.grass, 1.3); // 이상해씨 기본 1 + 메타몽 3×0.1
  assert.equal(production.poison, 1);
});

test('꼬렛 꼬리흔들기 발동 시 능력 이벤트가 생성된다', () => {
  const state = createInitialState();
  state.pokemon.counts.rattata = 4;
  state.pokemon.discovered.rattata = true;
  const { productionSystem } = createSystems(() => 0.005);
  const result = productionSystem.produceOneSecond(state);
  assert.equal(result.abilityEvents.length, 1);
  assert.equal(result.abilityEvents[0].abilityName, '꼬리흔들기');
  assert.equal(result.abilityEvents[0].amount, 40);
});

test('기존 저장은 포켓몬 능력 로그 표시가 기본 ON으로 마이그레이션된다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 6;
  delete legacy.settings;
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.equal(loaded.settings.pokemonAbilityLogs, true);
  assert.equal(loaded.meta.saveVersion, 11);
});


test('이상해씨/파이리/꼬부기는 노말 1000 또는 자기 타입 100으로 등장한다', () => {
  const { conditionSystem } = createSystems();
  const cases = [
    ['grass', 'bulbasaur'],
    ['fire', 'charmander'],
    ['water', 'squirtle'],
  ];
  for (const [energy, id] of cases) {
    const state = createInitialState();
    state.portal.input[energy] = 100;
    const ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
    assert.equal(ids.includes(id), true, `${id} should match ${energy} 100`);
  }
});

test('피카츄 조건은 AND가 아니라 OR: 노말 정확히 25 또는 전기 100 이상에서 각각 등장한다', () => {
  const { conditionSystem } = createSystems();
  const state1 = createInitialState();
  state1.portal.input.normal = 25;
  let ids = conditionSystem.getCandidates(state1, state1.portal.input).map(p => p.id);
  assert.equal(ids.includes('pikachu'), true);

  const state2 = createInitialState();
  state2.portal.input.normal = 26;
  ids = conditionSystem.getCandidates(state2, state2.portal.input).map(p => p.id);
  assert.equal(ids.includes('pikachu'), false);

  const state3 = createInitialState();
  state3.portal.input.electric = 100;
  ids = conditionSystem.getCandidates(state3, state3.portal.input).map(p => p.id);
  assert.equal(ids.includes('pikachu'), true);
});

test('스타팅 4종 메타몽 변신은 메타몽 1마리당 해당 타입 +0.1/s다', () => {
  const state = createInitialState();
  state.pokemon.counts.ditto = 10;
  state.pokemon.discovered.ditto = true;
  for (const id of ['bulbasaur','charmander','squirtle','pikachu']) {
    state.pokemon.counts[id] = 1;
    state.pokemon.discovered[id] = true;
  }
  const { productionSystem } = createSystems(() => 0.99);
  const production = productionSystem.getProduction(state);
  assert.equal(production.grass, 2); // 이상해씨 1 + 메타몽 10×0.1
  assert.equal(production.fire, 2);  // 파이리 1 + 메타몽 10×0.1
  assert.equal(production.water, 2); // 꼬부기 1 + 메타몽 10×0.1
  assert.equal(production.electric, 2); // 피카츄 1 + 메타몽 10×0.1
});

test('v7 저장의 폐기된 overloaded 플래그는 v8 마이그레이션에서 제거된다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 7;
  legacy.portal.overloaded = true;
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.equal('overloaded' in loaded.portal, false);
  assert.equal(loaded.meta.saveVersion, 11);
});


test('신규 게임은 평생 누적 소환 수와 무관하게 쿨타임 진행도 0에서 2.5초로 시작한다', () => {
  const state = createInitialState();
  state.portal.totalSummons = 999;
  state.portal.cooldownProgressSummons = 0;
  const { portalSystem } = createSystems();
  assert.equal(portalSystem.getCooldownSeconds(state), 2.5);
});

test('v8 기존 저장은 v9에서 쿨타임 단계 진행도를 0으로 초기화한다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 8;
  legacy.portal.totalSummons = 250;
  delete legacy.portal.cooldownProgressSummons;
  legacy.portal.cooldownUntil = Date.now() + 10_000;
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.equal(loaded.portal.totalSummons, 250);
  assert.equal(loaded.portal.cooldownProgressSummons, 0);
  assert.equal(loaded.portal.cooldownUntil, 0);
  assert.equal(loaded.meta.saveVersion, 11);
});


test('에너지 표시는 소수점 둘째 자리까지 표시하고 불필요한 0을 제거한다', () => {
  assert.equal(formatEnergyNumber(12), '12');
  assert.equal(formatEnergyNumber(12.5), '12.5');
  assert.equal(formatEnergyNumber(12.345), '12.35');
  assert.equal(formatEnergyNumber(999999.999), '1e6');
});

test('에너지 100만 이상은 과학적 표기법을 사용한다', () => {
  assert.equal(formatEnergyNumber(1_000_000), '1e6');
  assert.equal(formatEnergyNumber(1_230_000), '1.23e6');
  assert.equal(formatEnergyNumber(12_000_000), '1.2e7');
});

test('레트라는 꼬렛 10마리 이상 AND 노말에너지 200 이상일 때만 후보가 된다', () => {
  const { conditionSystem } = createSystems();
  const state = createInitialState();
  state.pokemon.counts.rattata = 10;
  state.portal.input.normal = 199;
  let ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('raticate'), false);

  state.portal.input.normal = 200;
  ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('raticate'), true);

  state.pokemon.counts.rattata = 9;
  ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('raticate'), false);
});

test('레트라 분노의 앞니는 1% 성공 시 해당 초 기본 노말 생산량의 50%를 추가한다', () => {
  const state = createInitialState();
  state.pokemon.counts.ditto = 4;
  state.pokemon.discovered.ditto = true;
  state.pokemon.counts.raticate = 1;
  state.pokemon.discovered.raticate = true;
  const { productionSystem } = createSystems(() => 0.005);
  const result = productionSystem.produceOneSecond(state);
  // 기본 노말 생산 5(메타몽4 + 레트라1), 추가 2.5
  assert.equal(state.resources.energy.normal, 7.5);
  assert.equal(result.abilityEvents.length, 1);
  assert.equal(result.abilityEvents[0].abilityName, '분노의 앞니');
  assert.equal(result.abilityEvents[0].amount, 2.5);
});

test('모든 진행 상황 초기화는 포탈 쿨타임 단계 진행도까지 0으로 되돌린다', () => {
  const state = createInitialState();
  state.portal.totalSummons = 123;
  state.portal.cooldownProgressSummons = 123;
  state.portal.cooldownUntil = Date.now() + 9999;
  const store = new GameStore(state);
  const { effectSystem, productionSystem, pokemonSystem, portalSystem } = createSystems(() => 0.99);
  const unlockSystem = new UnlockSystem(effectSystem);
  const storage = {
    value: null,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const saveSystem = new SaveSystem(storage);
  const game = new Game({
    store, productionSystem, portalSystem, pokemonSystem, unlockSystem, saveSystem,
    config: GAME_CONFIG, createInitialState,
  });
  game.reset();
  const fresh = store.getState();
  assert.equal(fresh.portal.totalSummons, 0);
  assert.equal(fresh.portal.cooldownProgressSummons, 0);
  assert.equal(fresh.portal.cooldownUntil, 0);
  assert.equal(fresh.resources.energy.normal, 0);
  assert.equal(fresh.pokemon.counts.rattata, 0);
  game.stop();
});

import { pokemonConditionsToText } from '../src/utils/conditionText.js';

test('꼬렛은 노말에너지 19 이상에서 후보가 된다', () => {
  const state = createInitialState();
  const { conditionSystem } = createSystems();
  state.portal.input.normal = 18;
  let ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('rattata'), false);
  state.portal.input.normal = 19;
  ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('rattata'), true);
});

test('레트라는 꼬렛 10마리 이상 + 노말에너지 200 이상을 모두 만족해야 후보가 된다', () => {
  const state = createInitialState();
  const { conditionSystem } = createSystems();
  state.pokemon.counts.rattata = 10;
  state.portal.input.normal = 199;
  let ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('raticate'), false);
  state.portal.input.normal = 200;
  ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.equal(ids.includes('raticate'), true);
});

test('도감 등장 조건 문구는 AND를 +, OR를 OR로 표시한다', () => {
  const raticate = POKEMON_DATA.find(p => p.id === 'raticate');
  const pikachu = POKEMON_DATA.find(p => p.id === 'pikachu');
  const bulbasaur = POKEMON_DATA.find(p => p.id === 'bulbasaur');
  assert.equal(pokemonConditionsToText(raticate, POKEMON_DATA), '꼬렛 10마리 이상 + 노말에너지 200 이상');
  assert.equal(pokemonConditionsToText(pikachu, POKEMON_DATA), '노말에너지 정확히 25 OR 전기에너지 100 이상');
  assert.equal(pokemonConditionsToText(bulbasaur, POKEMON_DATA), '노말에너지 1000 이상 OR 풀에너지 100 이상');
});


test('에너지 타입은 보유량이 처음 0을 초과하면 영구 해금된다', () => {
  const state = createInitialState();
  const { effectSystem } = createSystems();
  const unlockSystem = new UnlockSystem(effectSystem);
  state.resources.energy.normal = 1;
  unlockSystem.updateEnergyUnlocks(state);
  assert.equal(state.progression.unlockedEnergyTypes.normal, true);
  state.resources.energy.normal = 0;
  unlockSystem.updateEnergyUnlocks(state);
  assert.equal(state.progression.unlockedEnergyTypes.normal, true);
});

test('해금 에너지 6/12/18종에서 포탈 동시 투입 한도가 2/3/4종으로 강화된다', () => {
  const state = createInitialState();
  const { effectSystem } = createSystems();
  const unlockSystem = new UnlockSystem(effectSystem);

  ENERGY_TYPES.slice(0, 6).forEach(type => { state.resources.energy[type] = 1; });
  let events = unlockSystem.updateEnergyUnlocks(state);
  assert.equal(state.unlocks.maxEnergyTypes, 2);
  assert.deepEqual(events.map(e => e.maxEnergyTypes), [2]);

  ENERGY_TYPES.slice(6, 12).forEach(type => { state.resources.energy[type] = 1; });
  events = unlockSystem.updateEnergyUnlocks(state);
  assert.equal(state.unlocks.maxEnergyTypes, 3);
  assert.deepEqual(events.map(e => e.maxEnergyTypes), [3]);

  ENERGY_TYPES.slice(12, 18).forEach(type => { state.resources.energy[type] = 1; });
  events = unlockSystem.updateEnergyUnlocks(state);
  assert.equal(state.unlocks.maxEnergyTypes, 4);
  assert.deepEqual(events.map(e => e.maxEnergyTypes), [4]);
});

test('v10 저장은 현재 0초과 에너지를 해금 진행도로 마이그레이션한다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 10;
  delete legacy.progression;
  for (const type of ENERGY_TYPES.slice(0, 6)) legacy.resources.energy[type] = 1;
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.equal(Object.values(loaded.progression.unlockedEnergyTypes).filter(Boolean).length, 6);
  assert.equal(loaded.progression.portalEnergyTier, 1);
  assert.equal(loaded.meta.saveVersion, 11);
});
