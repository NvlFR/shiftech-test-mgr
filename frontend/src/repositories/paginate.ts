// PostgREST returns at most `db-max-rows` (Supabase default 1000) rows per request, silently —
// no error when a query matches more. Any repository that fetches a full row set to aggregate it
// client-side must page through with .range() instead of a single select, or its totals will be
// understated once the data grows past one page.
//
// Usage: pass a factory that builds a fresh query with .range(from, to) applied each call.
//   const rows = await fetchAllRows((from, to) =>
//     supabase.from('test_results').select('id, status').in('test_run_id', ids).range(from, to));

type RangeResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export async function fetchAllRows<T>(
  query: (from: number, to: number) => RangeResult<T>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    // A short page means the server had no more rows to give — we've read everything.
    if (page.length < pageSize) return rows;
  }
}
