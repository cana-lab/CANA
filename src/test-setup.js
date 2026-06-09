// Vitest setup — runs once per test file before the tests.
// jsdom under Vitest 4 doesn't provide localStorage unless explicitly given a
// backing file, so we install a small in-memory shim. Pure ESM, no DOM coupling.

class MemoryStorage {
  constructor() { this._m = new Map(); }
  get length() { return this._m.size; }
  key(i) { return [...this._m.keys()][i] ?? null; }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(String(k), String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
}

if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== "function") {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
}
if (!globalThis.sessionStorage || typeof globalThis.sessionStorage.clear !== "function") {
  Object.defineProperty(globalThis, "sessionStorage", { value: new MemoryStorage(), configurable: true });
}
