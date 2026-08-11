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
import { PortalSystem } from '../src/systems/PortalSystem.js';

function createSystems(random = () => 0) {
  const conditionSystem = new ConditionSystem(createConditionRegistry(), POKEMON_DATA);
  const effectSystem = new EffectSystem(createEffectRegistry(), POKEMON_DATA);
  const productionSystem = new ProductionSystem({ pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES, effectSystem });
  const portalSystem = new PortalSystem({ conditionSystem, effectSystem, productionSystem, pokemonData: POKEMON_DATA, energyTypes: ENERGY_TYPES, random });
  return { conditionSystem, effectSystem, productionSystem, portalSystem };
}

test('노말 1 투입 시 꼬렛이 후보가 된다', () => {
  const state = createInitialState();
  state.portal.input.normal = 1;
  const { conditionSystem } = createSystems();
  const ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.ok(ids.includes('rattata'));
});

test('노말 100 투입 시 꼬렛/파이리/꼬부기가 함께 후보가 된다', () => {
  const state = createInitialState();
  state.portal.input.normal = 100;
  const { conditionSystem } = createSystems();
  const ids = conditionSystem.getCandidates(state, state.portal.input).map(p => p.id);
  assert.deepEqual(ids.sort(), ['charmander','rattata','squirtle'].sort());
});

test('단일타입 포켓몬 1마리는 기본 +1/s를 생산한다', () => {
  const state = createInitialState();
  const { productionSystem } = createSystems();
  assert.equal(productionSystem.getProduction(state).normal, 1);
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
  state.resources.energy.normal = 100;
  state.portal.input.normal = 100;
  const { portalSystem } = createSystems(() => 0);
  const result = portalSystem.summon(state, 5_000);
  const record = state.pokemon.records[result.pokemon.id];
  assert.equal(record.discoveredAt, 5_000);
  assert.equal(record.maxCount, 1);
});

test('보유 에너지가 충분하고 유효한 후보가 있으면 포탈 활성화가 허용된다', () => {
  const state = createInitialState();
  state.resources.energy.normal = 1;
  state.portal.input.normal = 1;
  const { portalSystem } = createSystems(() => 0);
  const validation = portalSystem.validate(state, 1_000);
  assert.equal(validation.ok, true);
  const result = portalSystem.summon(state, 1_000);
  assert.equal(result.ok, true);
  assert.equal(result.pokemon.id, 'rattata');
});

import { attachJosa, chooseJosa, hasBatchim } from '../src/utils/korean.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';

test('한국어 조사 이/가를 받침 유무에 맞게 선택한다', () => {
  assert.equal(hasBatchim('꼬렛'), true);
  assert.equal(hasBatchim('피카츄'), false);
  assert.equal(chooseJosa('꼬렛', '이/가'), '이');
  assert.equal(chooseJosa('피카츄', '이/가'), '가');
  assert.equal(attachJosa('꼬렛', '이/가'), '꼬렛이');
  assert.equal(attachJosa('피카츄', '이/가'), '피카츄가');
});

test('v3 저장의 최신순 기록은 v4에서 오래된순으로 마이그레이션된다', () => {
  const legacy = createInitialState(100);
  legacy.meta.saveVersion = 3;
  legacy.records.general = [
    { message: '새 기록', at: 300 },
    { message: '옛 기록', at: 100 },
  ];
  legacy.records.important = [
    { message: '새 중요', at: 400 },
    { message: '옛 중요', at: 200 },
  ];
  const storage = {
    value: JSON.stringify(legacy),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; },
  };
  const loaded = new SaveSystem(storage).load();
  assert.deepEqual(loaded.records.general.map(x => x.message), ['옛 기록', '새 기록']);
  assert.deepEqual(loaded.records.important.map(x => x.message), ['옛 중요', '새 중요']);
});
