/**
 * Vitest environment setup for extension storage mocking
 */

const mockStorage: Record<string, string> = {};

(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
  key: (idx: number) => Object.keys(mockStorage)[idx] ?? null,
  get length() {
    return Object.keys(mockStorage).length;
  },
};
