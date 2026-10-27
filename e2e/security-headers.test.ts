import { expect, test } from "./fixtures"

test("a page carries the security headers, and no X-Powered-By", async ({
  page,
  checkAccessibility,
}) => {
  const response = await page.goto("/login/logged-out")

  expect(response?.status()).toBe(200)
  const headers = response?.headers() ?? {}
  expect(headers["content-security-policy"]).toBe(
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.discordapp.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
  )
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  expect(headers).not.toHaveProperty("x-powered-by")
  await checkAccessibility()
})
