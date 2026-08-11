export class GameStore {
  #state;
  #listeners = new Set();

  constructor(initialState) { this.#state = initialState; }
  getState() { return this.#state; }

  replace(nextState) {
    this.#state = nextState;
    this.notify();
  }

  mutate(mutator, { notify = true } = {}) {
    mutator(this.#state);
    if (notify) this.notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  notify() { for (const listener of this.#listeners) listener(this.#state); }
}
