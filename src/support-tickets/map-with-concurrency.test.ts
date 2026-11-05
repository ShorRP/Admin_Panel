import { setTimeout as sleep } from "node:timers/promises"
import { expect, test } from "vitest"

import { mapWithConcurrency } from "./map-with-concurrency"

test("the results come in the order of the items, whatever the order the runs end in", async () => {
  const results = await mapWithConcurrency([30, 10, 20], 2, async (delay) => {
    await sleep(delay)
    return delay * 2
  })

  expect(results).toEqual([60, 20, 40])
})

test("no more than the limit run at once, and the limit is reached", async () => {
  let running = 0
  let mostRunning = 0

  await mapWithConcurrency(
    Array.from({ length: 12 }, (_, index) => index),
    5,
    async () => {
      running++
      mostRunning = Math.max(mostRunning, running)
      await sleep(5)
      running--
    }
  )

  expect(mostRunning).toBe(5)
})

test("no item gives no run, and a run that fails rejects the whole", async () => {
  expect(await mapWithConcurrency([], 5, () => Promise.resolve(1))).toEqual([])
  await expect(
    mapWithConcurrency([1, 2, 3], 2, (item) =>
      item === 2 ? Promise.reject(new Error("boom")) : Promise.resolve(item)
    )
  ).rejects.toThrow("boom")
})
