import { inspect } from "node:util"
import { expect, test } from "vitest"

import { parseStaffEnv } from "./env"

function thrownBy(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return inspect(error)
  }
  throw new Error("Expected a throw")
}

const SESSION_SECRET = "a-session-secret-of-32-chars-xxx"

test("the staff's variables give the staff role and the session's secret", () => {
  expect(
    parseStaffEnv({
      STAFF_ROLE_ID: "1300000000000000000",
      SESSION_SECRET,
    })
  ).toEqual({
    staffRoleId: "1300000000000000000",
    sessionSecret: SESSION_SECRET,
  })
})

test("a staff role that is no snowflake is named in the error, without its value", () => {
  const error = thrownBy(() =>
    parseStaffEnv({ STAFF_ROLE_ID: "role-4f7c", SESSION_SECRET })
  )

  expect(error).toContain("STAFF_ROLE_ID")
  expect(error).not.toContain("role-4f7c")
})

test("a session secret under 32 characters is named in the error, without its value", () => {
  const error = thrownBy(() =>
    parseStaffEnv({
      STAFF_ROLE_ID: "1300000000000000000",
      SESSION_SECRET: "secret-4f7c-of-31-characters-xx",
    })
  )

  expect(error).toContain("SESSION_SECRET")
  expect(error).not.toContain("secret-4f7c")
})
