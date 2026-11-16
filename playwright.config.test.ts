import { expect, test } from "vitest"

import config from "./playwright.config"

test("Playwright hands the end-to-end tests to its workers one by one, so that a file's tests can spread over several", () => {
  expect(config.fullyParallel).toBe(true)
})
