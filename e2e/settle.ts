import type { Page } from "./fixtures"

const PENDING_SUSPENSE = '[id^="S:"], template[id^="B:"]'

export async function settle(page: Page) {
  await page.waitForLoadState()
  await page.waitForFunction(
    (pending) =>
      document.querySelector(pending) === null &&
      document.activeViewTransition === null,
    PENDING_SUSPENSE
  )
}

export async function resize(
  page: Page,
  size: { width: number; height: number }
) {
  await settle(page)
  await page.setViewportSize(size)
}
