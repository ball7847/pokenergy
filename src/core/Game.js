import { INTRO_LOG_LINES } from '../data/story.js';
import { attachJosa } from '../utils/korean.js';

export class Game {
  constructor({ store, productionSystem, portalSystem, pokemonSystem, unlockSystem, saveSystem, config, createInitialState }) {
    Object.assign(this, { store, productionSystem, portalSystem, pokemonSystem, unlockSystem, saveSystem, config, createInitialState });
    this.timer = null;
    this.autosaveTimer = null;
    this.introTimer = null;
  }

  start() {
    this.stopRuntimeTimers();
    this.timer = setInterval(() => this.tick(), this.config.tickMs);
    this.autosaveTimer = setInterval(() => this.save(), this.config.autosaveMs);
    this.resumeIntro();
    this.store.notify();
  }

  stop() {
    this.stopRuntimeTimers();
    if (this.introTimer) clearTimeout(this.introTimer);
    this.introTimer = null;
  }

  stopRuntimeTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    this.timer = null;
    this.autosaveTimer = null;
  }

  tick(now = Date.now()) {
    const state = this.store.getState();
    state.runtime.lastTickAt = now;
    state.runtime.lastProductionAt ??= now;

    // 화면/쿨타임은 빠르게 갱신하되, 에너지 생산은 정확히 1초 단위로만 처리한다.
    const elapsedWholeSeconds = Math.min(
      Math.floor(this.config.maxTickSeconds),
      Math.floor(Math.max(0, now - state.runtime.lastProductionAt) / 1000),
    );
    for (let i = 0; i < elapsedWholeSeconds; i += 1) {
      this.productionSystem.produceOneSecond(state);
      state.runtime.lastProductionAt += 1000;
    }
    this.store.notify();
  }

  setPortalInput(type, amount) {
    this.store.mutate(state => { state.portal.input[type] = Math.max(0, Number(amount) || 0); });
  }

  summon() {
    let result;
    this.store.mutate(state => {
      result = this.portalSystem.summon(state);
      if (!result.ok) return;
      this.unlockSystem.recalculate(state);
      this.addLog('general', `포탈에서 ${attachJosa(result.pokemon.name, '이/가')} 나타났다.`);
      if (result.isNew) this.logNewPokemonEffects(result.pokemon);
    }, { notify: false });
    this.store.notify();
    return result;
  }

  logNewPokemonEffects(pokemon) {
    this.addLog('important', `새로운 포켓몬 발견: ${pokemon.name}`);
    for (const effect of pokemon.effects ?? []) {
      this.addLog('important', `새로운 능력 해금: ${effect.label ?? effect.type}`);
    }
  }

  addLog(kind, message, at = Date.now()) {
    const state = this.store.getState();
    const bucket = kind === 'important' ? 'important' : 'general';
    if (!state.records) state.records = { general: [], important: [] };
    if (!Array.isArray(state.records[bucket])) state.records[bucket] = [];
    state.records[bucket].push({ message, at });
    state.records[bucket] = state.records[bucket].slice(-500);
  }

  save() { this.saveSystem.save(this.store.getState()); this.store.notify(); }

  load() {
    const loaded = this.saveSystem.load();
    if (!loaded) return false;
    loaded.runtime.lastTickAt = Date.now();
    loaded.runtime.lastProductionAt = Date.now();
    this.store.replace(loaded);
    this.productionSystem.invalidate();
    this.unlockSystem.recalculate(loaded);
    this.resumeIntro();
    return true;
  }

  reset() {
    this.saveSystem.clear();
    if (this.introTimer) clearTimeout(this.introTimer);
    this.introTimer = null;
    const fresh = this.createInitialState();
    this.productionSystem.invalidate();
    this.unlockSystem.recalculate(fresh);
    this.store.replace(fresh);
    this.resumeIntro();
  }

  resumeIntro() {
    if (this.introTimer) clearTimeout(this.introTimer);
    this.introTimer = null;
    const state = this.store.getState();
    if (state.story?.introComplete) return;

    const emitNext = () => {
      const current = this.store.getState();
      const index = current.story.introNextIndex ?? 0;
      if (index >= INTRO_LOG_LINES.length) {
        current.story.introComplete = true;
        this.store.notify();
        this.introTimer = null;
        return;
      }

      this.addLog('important', INTRO_LOG_LINES[index]);
      current.story.introNextIndex = index + 1;

      // 마지막 세계관 문장이 표시된 직후, 최초 메타몽을 실제 게임 상태에 지급한다.
      if (current.story.introNextIndex >= INTRO_LOG_LINES.length) {
        current.story.introComplete = true;
        if (!current.story.dittoGranted) {
          const acquisition = this.pokemonSystem.acquire(current, 'ditto', { now: Date.now() });
          current.story.dittoGranted = true;
          this.unlockSystem.recalculate(current);
          if (acquisition.isNew) this.logNewPokemonEffects(acquisition.pokemon);
        }
      }

      this.store.notify();
      if (!current.story.introComplete) {
        this.introTimer = setTimeout(emitNext, this.config.story.introLineDelayMs);
      } else {
        this.introTimer = null;
      }
    };

    emitNext();
  }
}
