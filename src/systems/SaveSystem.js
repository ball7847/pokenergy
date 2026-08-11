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
      migrated.story = { introNextIndex: 0, introComplete: false };
    }

    // v2까지는 일반/중요 기록이 하나의 logs 배열에 섞여 있었다.
    if (version < 3) {
      const legacyLogs = Array.isArray(saved?.logs) ? saved.logs : [];
      migrated.records = {
        general: legacyLogs.filter(log => (log.kind ?? 'general') !== 'important').map(({ message, at }) => ({ message, at })),
        important: legacyLogs.filter(log => log.kind === 'important').map(({ message, at }) => ({ message, at })),
      };
      delete migrated.logs;
    }

    if (!migrated.records) migrated.records = { general: [], important: [] };
    migrated.records.general ??= [];
    migrated.records.important ??= [];

    // v3까지는 최신 기록을 배열 앞쪽에 저장했다.
    // v4부터는 화면/데이터 모두 오래된 기록 -> 새로운 기록 순서로 통일한다.
    if (version < 4) {
      migrated.records.general = [...migrated.records.general].reverse();
      migrated.records.important = [...migrated.records.important].reverse();
    }

    // v5부터 새 게임은 메타몽 없이 시작하고, 마지막 도입 기록 직후 메타몽을 지급한다.
    // 기존 저장은 이미 보유한 메타몽을 다시 지급하지 않도록 표시한다.
    if (version < 5) {
      migrated.story ??= { introNextIndex: 0, introComplete: false };
      migrated.story.dittoGranted = (migrated.pokemon.counts.ditto ?? 0) > 0;
      migrated.runtime.lastProductionAt = Date.now();
    }

    // v6부터 포탈 소환 횟수와 과부하 상태를 저장한다.
    // 기존 버전에는 포켓몬을 소모/방출하는 기능이 없으므로 현재 총 개체 수에서
    // 시작 연출로 지급된 메타몽 1마리를 빼면 기존 포탈 소환 횟수를 복원할 수 있다.
    if (version < 6) {
      const totalIndividuals = Object.values(migrated.pokemon.counts ?? {})
        .reduce((sum, count) => sum + (Number(count) || 0), 0);
      const introDitto = migrated.story?.dittoGranted && (migrated.pokemon.counts?.ditto ?? 0) > 0 ? 1 : 0;
      migrated.portal.totalSummons = Math.max(0, totalIndividuals - introDitto);
      migrated.portal.overloaded = migrated.portal.totalSummons >= GAME_CONFIG.portal.overloadAtSummons;
    }
    migrated.portal.totalSummons ??= 0;
    migrated.portal.overloaded ??= false;

    // v7부터 포켓몬 능력 발동 로그 표시 여부를 저장한다. 기존 플레이어는 기본 ON.
    if (version < 7) {
      migrated.settings ??= {};
      migrated.settings.pokemonAbilityLogs = true;
    }
    migrated.settings ??= { pokemonAbilityLogs: true };
    migrated.settings.pokemonAbilityLogs ??= true;
    migrated.runtime.lastProductionAt ??= Date.now();

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
