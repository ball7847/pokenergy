/**
 * 포켓몬 데이터는 "사실 데이터"와 "게임 규칙 참조"만 가진다.
 * 실제 로직은 condition/effect registry에 존재한다.
 */
export const POKEMON_DATA = [
  { id: 'ditto', dex: 132, name: '메타몽', types: ['normal'], conditions: [
    { type: 'energy_type_count', mode: 'exact', value: 1 },
    { type: 'total_energy_min', value: 10 },
  ]},
  { id: 'rattata', dex: 19, name: '꼬렛', types: ['normal'], conditions: [
    { type: 'energy_min', energy: 'normal', value: 19 },
  ], effects: [
    { type: 'second_tick_chance_count_energy', chance: 0.01, pokemon: 'rattata', energy: 'normal', value: 10, abilityName: '꼬리흔들기', label: '[꼬리흔들기] 1% 확률로 꼬렛 수의 10배만큼 노말에너지를 추가 획득한다.' },
  ]},
  { id: 'raticate', dex: 20, name: '레트라', types: ['normal'], conditions: [
    { type: 'pokemon_count_min', pokemon: 'rattata', value: 10 },
    { type: 'energy_min', energy: 'normal', value: 200 },
  ], effects: [
    { type: 'second_tick_chance_production_percent', chance: 0.01, energy: 'normal', value: 0.5, pokemon: 'raticate', abilityName: '분노의 앞니', label: '[분노의 앞니] 1% 확률로 초당 노말에너지 획득량의 50%를 추가 획득한다.' },
  ]},
  { id: 'bulbasaur', dex: 1, name: '이상해씨', types: ['grass', 'poison'], conditionGroups: [
    [{ type: 'energy_min', energy: 'normal', value: 1000 }],
    [{ type: 'energy_min', energy: 'grass', value: 100 }],
  ], effects: [
    { type: 'ditto_add_type', energy: 'grass', value: 0.1, label: '[메타몽 변신] 메타몽이 풀에너지를 +0.1/s 추가 생산한다.' },
  ]},
  { id: 'charmander', dex: 4, name: '파이리', types: ['fire'], conditionGroups: [
    [{ type: 'energy_min', energy: 'normal', value: 1000 }],
    [{ type: 'energy_min', energy: 'fire', value: 100 }],
  ], effects: [
    { type: 'ditto_add_type', energy: 'fire', value: 0.1, label: '[메타몽 변신] 메타몽이 불꽃에너지를 +0.1/s 추가 생산한다.' },
  ]},
  { id: 'squirtle', dex: 7, name: '꼬부기', types: ['water'], conditionGroups: [
    [{ type: 'energy_min', energy: 'normal', value: 1000 }],
    [{ type: 'energy_min', energy: 'water', value: 100 }],
  ], effects: [
    { type: 'ditto_add_type', energy: 'water', value: 0.1, label: '[메타몽 변신] 메타몽이 물에너지를 +0.1/s 추가 생산한다.' },
  ]},
  { id: 'pikachu', dex: 25, name: '피카츄', types: ['electric'], conditionMode: 'any', conditions: [
    { type: 'energy_exact', energy: 'normal', value: 25 },
    { type: 'energy_min', energy: 'electric', value: 100 },
  ], effects: [
    { type: 'ditto_add_type', energy: 'electric', value: 0.1, label: '[메타몽 변신] 메타몽이 전기에너지를 +0.1/s 추가 생산한다.' },
  ]},
];
