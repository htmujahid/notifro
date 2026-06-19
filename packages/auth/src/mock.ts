export const mockD1 = {
  prepare: (_sql: string) => ({
    bind: () => ({
      run: async () => ({ success: true, results: [], meta: {} }),
      first: async () => null,
      all: async () => ({ success: true, results: [], meta: {} }),
      raw: async () => [],
    }),
    run: async () => ({ success: true, results: [], meta: {} }),
    first: async () => null,
    all: async () => ({ success: true, results: [], meta: {} }),
    raw: async () => [],
  }),
  dump: async () => new ArrayBuffer(0),
  batch: async () => [],
  exec: async () => ({ count: 0, duration: 0 }),
} as unknown as D1Database
