type Page<T> = PromiseLike<{ data: T[] | null; error: { code: string; message: string } | null }>;

/**
 * Прочитать все строки постранично: API базы отдаёт не больше 1000 строк за запрос, сколько бы ни было в limit().
 * `page(from, to)` — запрос с .order(...) по уникальному столбцу и .range(from, to).
 */
export async function selectAll<T>(page: (from: number, to: number) => Page<T>, max = 50000): Promise<{ data: T[]; error: { code: string; message: string } | null }> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) return { data: out, error };
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return { data: out, error: null };
}
