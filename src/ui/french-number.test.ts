import { expect, test } from "vitest"

import { frenchNumber } from "@/ui/french-number"

test("a number reads as French writes it, thousands set apart by a narrow no-break space", () => {
  expect(frenchNumber(312)).toBe("312")
  expect(frenchNumber(1234)).toBe("1 234")
  expect(frenchNumber(1234567)).toBe("1 234 567")
})
