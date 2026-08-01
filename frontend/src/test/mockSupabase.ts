import { vi, type Mock } from 'vitest';

export interface SupabaseMockResult<T = unknown> {
  data: T | null;
  error: unknown | null;
  count?: number | null;
}

export type SupabaseQueryBuilderMock = Record<string, Mock> &
  PromiseLike<SupabaseMockResult>;

const CHAIN_METHODS = [
  'select', 'insert', 'upsert', 'update', 'delete', 'eq', 'neq', 'in', 'is',
  'not', 'or', 'filter', 'match', 'contains', 'containedBy', 'overlaps', 'like',
  'ilike', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'range', 'abortSignal',
];

function success(data: unknown = null): SupabaseMockResult {
  return { data, error: null };
}

export function createSupabaseQueryMock(
  initialResult: SupabaseMockResult = success(),
): SupabaseQueryBuilderMock & { setResult: (result: SupabaseMockResult) => void } {
  let result = initialResult;
  const query = {} as SupabaseQueryBuilderMock & { setResult: (value: SupabaseMockResult) => void };

  for (const method of CHAIN_METHODS) {
    query[method] = vi.fn(() => query);
  }

  for (const method of ['single', 'maybeSingle', 'csv', 'explain']) {
    query[method] = vi.fn(() => Promise.resolve(result));
  }

  query.then = (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected);
  query.setResult = (value) => {
    result = value;
  };
  return query;
}

export function createMockSupabaseClient(defaultResult: SupabaseMockResult = success()) {
  const tableQueries = new Map<string, ReturnType<typeof createSupabaseQueryMock>>();
  const queryFor = (table: string) => {
    let query = tableQueries.get(table);
    if (!query) {
      query = createSupabaseQueryMock(defaultResult);
      tableQueries.set(table, query);
    }
    return query;
  };

  const client = {
    from: vi.fn((table: string) => queryFor(table)),
    rpc: vi.fn(async () => defaultResult),
    functions: { invoke: vi.fn(async () => defaultResult) },
    auth: {
      getSession: vi.fn(async () => success({ session: null })),
      getUser: vi.fn(async () => success({ user: null })),
      signInWithPassword: vi.fn(async () => defaultResult),
      signInWithOAuth: vi.fn(async () => defaultResult),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => defaultResult),
        remove: vi.fn(async () => defaultResult),
        createSignedUrl: vi.fn(async () => defaultResult),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
    setTableResult(table: string, result: SupabaseMockResult) {
      queryFor(table).setResult(result);
    },
    getTableQuery(table: string) {
      return queryFor(table);
    },
  };

  return client;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
