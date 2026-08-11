/**
 * 포켓몬 데이터는 "사실 데이터"와 "게임 규칙 참조"만 가진다.
 * 실제 로직은 condition/effect registry에 존재한다.
 */
export const POKEMON_DATA = [
  { id: 'ditto', dex: 132, name: '메타몽', types: ['normal'], conditions: [
    { type: 'energy_type_count', mode: 'exact', value: 1 },
    { type: 'energy_min', energy: 'normal', value: 10 },
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
  { id: 'piplup', dex: 393, name: '팽도리', types: ['water'], conditions: [
    { type: 'energy_min', energy: 'water', value: 10 },
  ]},
  { id: 'charmeleon', dex: 5, name: '리자드', types: ['fire'], conditions: [
    { type: 'pokemon_count_min', pokemon: 'charmander', value: 2 },
    { type: 'energy_min', energy: 'fire', value: 100 },
  ], effects: [
    { type: 'type_multiplier', energy: 'fire', value: 0.10, label: '[불꽃세례] 모든 불꽃에너지 생산량 +10%' },
  ]},
  { id: 'monferno', dex: 391, name: '파이숭이', types: ['fire', 'fighting'], conditions: [
    { type: 'energy_min', energy: 'fire', value: 100 },
  ]},
  { id: 'prinplup', dex: 394, name: '팽태자', types: ['water'], conditions: [
    { type: 'energy_min', energy: 'water', value: 100 },
  ]},
  { id: 'charizard', dex: 6, name: '리자몽', types: ['fire', 'flying'], conditions: [
    { type: 'pokemon_count_min', pokemon: 'charmeleon', value: 2 },
    { type: 'energy_min', energy: 'fire', value: 1000 },
  ], effects: [
    { type: 'count_bonus', energy: 'fire', pokemon: ['charmander', 'charmeleon'], value: 10, label: '파이리와 리자드 보유 수 ×10만큼 불꽃에너지를 추가 생산한다.' },
  ]},
  { id: 'infernape', dex: 392, name: '초염몽', types: ['fire', 'fighting'], conditions: [
    { type: 'energy_min', energy: 'fire', value: 1000 },
  ]},
  { id: 'empoleon', dex: 395, name: '엠페르트', types: ['water', 'steel'], conditions: [
    { type: 'energy_min', energy: 'water', value: 1000 },
  ]},
  { id: 'spiritomb', dex: 442, name: '화강돌', types: ['ghost', 'dark'], conditions: [
    { type: 'energy_min', energy: 'ghost', value: 500 },
    { type: 'total_energy_min', value: 1000 },
  ], effects: [
    { type: 'cooldown_flat', value: 5, label: '[틈새포착] 포탈 재활성화 대기시간 -5초' },
  ]},
  { id: 'volcanion', dex: 721, name: '볼케니온', types: ['fire', 'water'], conditions: [
    { type: 'energy_min', energy: 'fire', value: 50 },
    { type: 'energy_min', energy: 'water', value: 50 },
  ]},
  { id: 'dialga', dex: 483, name: '디아루가', types: ['steel', 'dragon'], conditions: [
    { type: 'energy_min', energy: 'steel', value: 10_000 },
    { type: 'energy_min', energy: 'dragon', value: 10_000 },
    { type: 'total_energy_min', value: 50_000 },
  ]},
  { id: 'palkia', dex: 484, name: '펄기아', types: ['water', 'dragon'], conditions: [
    { type: 'energy_min', energy: 'water', value: 10_000 },
    { type: 'total_energy_min', value: 50_000 },
  ]},
  { id: 'giratina', dex: 487, name: '기라티나', types: ['ghost', 'dragon'], conditions: [
    { type: 'energy_min', energy: 'ghost', value: 10_000 },
    { type: 'energy_min', energy: 'dragon', value: 10_000 },
    { type: 'total_energy_min', value: 50_000 },
  ]},
  { id: 'arceus', dex: 493, name: '아르세우스', types: ['normal'], conditions: [
    { type: 'pokemon_count_min', pokemon: 'dialga', value: 1 },
    { type: 'pokemon_count_min', pokemon: 'palkia', value: 1 },
    { type: 'pokemon_count_min', pokemon: 'giratina', value: 1 },
    { type: 'total_energy_min', value: 100_000 },
  ], effects: [
    { type: 'creation_trio_bonus', pokemon: ['dialga', 'palkia', 'giratina'], value: 10_000, label: '[신오신화] 디아루가·펄기아·기라티나의 총 보유 수 ×10,000만큼 모든 타입 에너지를 추가 생산한다.' },
  ]},
];
