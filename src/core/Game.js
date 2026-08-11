export class Game {
  constructor({ store, productionSystem, portalSystem, unlockSystem, saveSystem, config }) {
    Object.assign(this, { store, productionSystem, portalSystem, unlockSystem, saveSystem, config });
    this.timer = null;
    this.autosaveTimer = null;
  }

  start() {
    this.stop();
    this.timer = setInterval(() => this.tick(), this.config.tickMs);
    this.autosaveTimer = setInterval(() => this.save(), this.config.autosaveMs);
    this.store.notify();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
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
      if (result.ok) {
        this.unlockSystem.recalculate(state);
        this.log(`${result.isNew ? '★ 신규 발견' : '소환'}: ${result.pokemon.name} · 후보 ${result.candidateCount}종`);
        if (result.isNew) {
          for (const effect of result.pokemon.effects ?? []) this.log(`효과 해금: ${effect.label ?? effect.type}`);
        }
      }
    }, { notify: false });
    this.store.notify();
    return result;
  }

  log(message) {
    const state = this.store.getState();
    state.logs.unshift({ message, at: Date.now() });
    state.logs = state.logs.slice(0, 100);
  }

  save() { this.saveSystem.save(this.store.getState()); }

  load() {
    const loaded = this.saveSystem.load();
    if (!loaded) return false;
    loaded.runtime.lastTickAt = Date.now();
    this.store.replace(loaded);
    this.productionSystem.invalidate();
    this.unlockSystem.recalculate(loaded);
    return true;
  }
}
