import { GAME_CONFIG } from '../config/gameConfig.js';
import { createInitialState } from '../core/createState.js';

export class SaveSystem {
  constructor(storage = window.localStorage) { this.storage = storage; }

  save(state) {
    state.meta.updatedAt = Date.now();
    state.meta.saveVersion = GAME_CONFIG.saveVersion;
    this.storage.setItem(GAME_CONFIG.saveKey, JSON.stringify(state));
  }

  load() {
    const raw = this.storage.getItem(GAME_CONFIG.saveKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return this.migrate(parsed);
  }

  clear() { this.storage.removeItem(GAME_CONFIG.saveKey); }

  migrate(saved) {
    const version = saved?.meta?.saveVersion ?? 0;
    if (version > GAME_CONFIG.saveVersion) throw new Error('현재 게임보다 새로운 버전의 저장 데이터입니다.');

    const baseline = createInitialState(saved?.meta?.createdAt ?? Date.now());
    const migrated = deepMerge(baseline, saved);

    // v1에는 최초 발견일/역대 최대 보유 수가 없었다.
    if (version < 2) {
      for (const [id, count] of Object.entries(migrated.pokemon.counts ?? {})) {
        if (!migrated.pokemon.records[id]) migrated.pokemon.records[id] = { discoveredAt: null, maxCount: 0 };
        if (migrated.pokemon.discovered[id] && id !== 'ditto') {
          // 과거 저장에서 정확한 발견 시각은 복원할 수 없으므로 null로 둔다.
          migrated.pokemon.records[id].discoveredAt = null;
        }
        migrated.pokemon.records[id].maxCount = Math.max(migrated.pokemon.records[id].maxCount ?? 0, count ?? 0);
      }
      migrated.logs = (migrated.logs ?? []).map(log => ({ kind: log.kind ?? 'general', ...log }));
      migrated.story = { introNextIndex: 0, introComplete: false };
    }

    migrated.meta.saveVersion = GAME_CONFIG.saveVersion;
    return migrated;
  }
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (typeof base !== 'object' || base === null) return override ?? base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    out[key] = key in base ? deepMerge(base[key], value) : value;
  }
  return out;
}
