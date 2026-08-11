import { INTRO_LOG_LINES } from '../data/story.js';

export class Game {
  constructor({ store, productionSystem, portalSystem, unlockSystem, saveSystem, config, createInitialState }) {
    Object.assign(this, { store, productionSystem, portalSystem, unlockSystem, saveSystem, config, createInitialState });
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
    const elapsed = Math.min(this.config.maxTickSeconds, Math.max(0, (now - state.runtime.lastTickAt) / 1000));
    state.runtime.lastTickAt = now;
    const production = this.productionSystem.getProduction(state);
    for (const [type, rate] of Object.entries(production)) state.resources.energy[type] += rate * elapsed;
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
      this.addLog('general', `포탈에서 ${result.pokemon.name}이(가) 나타났다.`);

      if (result.isNew) {
        this.addLog('important', `새로운 포켓몬 발견: ${result.pokemon.name}`);
        for (const effect of result.pokemon.effects ?? []) {
          this.addLog('important', `새로운 능력 해금: ${effect.label ?? effect.type}`);
        }
      }
    }, { notify: false });
    this.store.notify();
    return result;
  }

  addLog(kind, message, at = Date.now()) {
    const state = this.store.getState();
    const bucket = kind === 'important' ? 'important' : 'general';
    if (!state.records) state.records = { general: [], important: [] };
    if (!Array.isArray(state.records[bucket])) state.records[bucket] = [];
    state.records[bucket].unshift({ message, at });
    state.records[bucket] = state.records[bucket].slice(0, 500);
  }

  save() {
    this.saveSystem.save(this.store.getState());
    this.store.notify();
  }

  load() {
    const loaded = this.saveSystem.load();
    if (!loaded) return false;
    loaded.runtime.lastTickAt = Date.now();
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
      if (current.story.introNextIndex >= INTRO_LOG_LINES.length) current.story.introComplete = true;
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
