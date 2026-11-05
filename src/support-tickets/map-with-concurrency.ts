export async function mapWithConcurrency<Item, Result>(
  items: readonly Item[],
  limit: number,
  run: (item: Item) => Promise<Result>
): Promise<Result[]> {
  const results: Result[] = new Array<Result>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await run(items[index] as Item)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
}
