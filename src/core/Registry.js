export class Registry {
  #handlers = new Map();

  register(type, handler) {
    if (!type || typeof handler !== 'function') throw new TypeError('Registry 등록값이 올바르지 않습니다.');
    if (this.#handlers.has(type)) throw new Error(`이미 등록된 타입입니다: ${type}`);
    this.#handlers.set(type, handler);
    return this;
  }

  has(type) { return this.#handlers.has(type); }

  run(type, ...args) {
    const handler = this.#handlers.get(type);
    if (!handler) throw new Error(`등록되지 않은 타입입니다: ${type}`);
    return handler(...args);
  }

  keys() { return [...this.#handlers.keys()]; }
}
