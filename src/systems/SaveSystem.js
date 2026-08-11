import { GAME_CONFIG } from '../config/gameConfig.js';
import { createInitialState } from '../core/createState.js';

export class SaveSystem {
  constructor(storage = window.localStorage) { this.storage = storage; }

  save(state) {
    state.meta.updatedAt = Date.now();
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

    // v1부터 실제 migration step을 여기에 순차 추가한다.
    const baseline = createInitialState(saved?.meta?.createdAt ?? Date.now());
    return deepMerge(baseline, saved);
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
