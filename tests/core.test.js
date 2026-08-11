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

test('메타몽은 노말만 10 이상 투입할 때 후보가 된다', () => {
  const state = createInitialState();
  const { conditionSystem } = createSystems();
  state.portal.input.normal = 10;
  let ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.deepEqual(ids, ['ditto']);
  state.portal.input.fire = 1;
  ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
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

test('꼬렛 의욕은 매초 10% 판정 성공 시 꼬렛 수만큼 노말에너지를 추가한다', () => {
  const state = createInitialState();
  state.pokemon.counts.rattata = 5;
  state.pokemon.discovered.rattata = true;
  const { productionSystem } = createSystems(() => 0.05);
  productionSystem.produceOneSecond(state);
  // 기본 꼬렛 5 + 의욕 추가 5
  assert.equal(state.resources.energy.normal, 10);
});

test('꼬렛 의욕은 판정 실패 시 기본 생산만 적용한다', () => {
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
  assert.equal(loaded.meta.saveVersion, 7);
});


test('기본 포탈 쿨타임은 10초다', () => {
  const state = createInitialState();
  const { portalSystem } = createSystems();
  assert.equal(portalSystem.getCooldownSeconds(state), 10);
});

test('100번째 포탈 소환에서 과부하가 발생하고 쿨타임이 30초가 된다', () => {
  const state = createInitialState();
  const { portalSystem } = createSystems(() => 0);
  state.portal.totalSummons = 99;
  state.resources.energy.normal = 10;
  state.portal.input.normal = 10;
  const now = 1_000;
  const result = portalSystem.summon(state, now);
  assert.equal(result.ok, true);
  assert.equal(result.totalSummons, 100);
  assert.equal(result.overloadTriggered, true);
  assert.equal(state.portal.overloaded, true);
  assert.equal(state.portal.cooldownUntil, now + 30_000);
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
  assert.equal(loaded.portal.overloaded, false);
  assert.equal(loaded.meta.saveVersion, 7);
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
  assert.equal(production.grass, 4); // 이상해씨 기본 1 + 메타몽 3
  assert.equal(production.poison, 1);
});

test('꼬렛 의욕 발동 시 능력 이벤트가 생성된다', () => {
  const state = createInitialState();
  state.pokemon.counts.rattata = 4;
  state.pokemon.discovered.rattata = true;
  const { productionSystem } = createSystems(() => 0.01);
  const result = productionSystem.produceOneSecond(state);
  assert.equal(result.abilityEvents.length, 1);
  assert.equal(result.abilityEvents[0].abilityName, '의욕');
  assert.equal(result.abilityEvents[0].amount, 4);
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
  assert.equal(loaded.meta.saveVersion, 7);
});
