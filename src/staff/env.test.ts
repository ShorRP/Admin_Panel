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

const ROLES = {
  STAFF_ROLE_ID: "1300000000000000000",
  MODERATION_ROLE_IDS: "1300000000000000002,1300000000000000003",
  BAN_ROLE_IDS: "1300000000000000003",
}

test("the staff's variables give the staff role, the moderation and ban roles, and the session's secret", () => {
  expect(parseStaffEnv({ ...ROLES, SESSION_SECRET })).toEqual({
    staffRoleId: "1300000000000000000",
    moderationRoleIds: ["1300000000000000002", "1300000000000000003"],
    banRoleIds: ["1300000000000000003"],
    sessionSecret: SESSION_SECRET,
  })
})

test("a list of roles may put spaces around its commas", () => {
  expect(
    parseStaffEnv({
      ...ROLES,
      MODERATION_ROLE_IDS: "1300000000000000002 , 1300000000000000003",
      SESSION_SECRET,
    })
  ).toMatchObject({
    moderationRoleIds: ["1300000000000000002", "1300000000000000003"],
  })
})

test("a staff role that is no snowflake is named in the error, without its value", () => {
  const error = thrownBy(() =>
    parseStaffEnv({ ...ROLES, STAFF_ROLE_ID: "role-4f7c", SESSION_SECRET })
  )

  expect(error).toContain("STAFF_ROLE_ID")
  expect(error).not.toContain("role-4f7c")
})

test("a list of roles holding something other than a snowflake is named in the error, without its value", () => {
  const error = thrownBy(() =>
    parseStaffEnv({
      ...ROLES,
      BAN_ROLE_IDS: "1300000000000000003,role-4f7c",
      SESSION_SECRET,
    })
  )

  expect(error).toContain("BAN_ROLE_IDS")
  expect(error).not.toContain("role-4f7c")
})

test("a missing or empty list of roles is named in the error", () => {
  expect(
    thrownBy(() =>
      parseStaffEnv({
        ...ROLES,
        MODERATION_ROLE_IDS: undefined,
        SESSION_SECRET,
      })
    )
  ).toContain("MODERATION_ROLE_IDS")
  expect(
    thrownBy(() =>
      parseStaffEnv({ ...ROLES, BAN_ROLE_IDS: "", SESSION_SECRET })
    )
  ).toContain("BAN_ROLE_IDS")
})

test("a session secret under 32 characters is named in the error, without its value", () => {
  const error = thrownBy(() =>
    parseStaffEnv({
      ...ROLES,
      SESSION_SECRET: "secret-4f7c-of-31-characters-xx",
    })
  )

  expect(error).toContain("SESSION_SECRET")
  expect(error).not.toContain("secret-4f7c")
})
