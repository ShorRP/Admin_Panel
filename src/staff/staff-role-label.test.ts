import { expect, test } from "vitest"

import { staffRoleLabel } from "./staff-role-label"

test("a staff member who opens the moderation section is « Staff · Modération », any other « Staff »", () => {
  expect(staffRoleLabel(true)).toBe("Staff · Modération")
  expect(staffRoleLabel(false)).toBe("Staff")
})
