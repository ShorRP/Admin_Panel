import {
  OverwriteType,
  PermissionFlagsBits,
  type APIOverwrite,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { openerIdOf } from "./ticket-opener"

const OPENER_ID = "1400000000000000001"

const ROLE_ID = "1300000000000000001"

function allowing(
  id: string,
  type: OverwriteType,
  permission = PermissionFlagsBits.ViewChannel
): APIOverwrite {
  return { id, type, allow: permission.toString(), deny: "0" }
}

test("the opener is the one member with an overwrite of their own that allows them to view the channel, whatever the roles beside them", () => {
  expect(
    openerIdOf([
      allowing(ROLE_ID, OverwriteType.Role),
      allowing(OPENER_ID, OverwriteType.Member),
      allowing("1300000000000000002", OverwriteType.Role),
    ])
  ).toBe(OPENER_ID)
})

test("an overwrite of a member that allows other permissions than viewing the channel makes nobody the opener", () => {
  expect(
    openerIdOf([
      allowing(
        OPENER_ID,
        OverwriteType.Member,
        PermissionFlagsBits.SendMessages
      ),
    ])
  ).toBeNull()
  expect(
    openerIdOf([
      {
        id: OPENER_ID,
        type: OverwriteType.Member,
        allow: "0",
        deny: PermissionFlagsBits.ViewChannel.toString(),
      },
    ])
  ).toBeNull()
})

test("a channel with no member of its own, or with two, has no opener, as ShorBot reads it", () => {
  expect(openerIdOf([])).toBeNull()
  expect(openerIdOf([allowing(ROLE_ID, OverwriteType.Role)])).toBeNull()
  expect(
    openerIdOf([
      allowing(OPENER_ID, OverwriteType.Member),
      allowing("1400000000000000002", OverwriteType.Member),
    ])
  ).toBeNull()
})

test("the allowed permissions of an overwrite are read among others, as a mask", () => {
  expect(
    openerIdOf([
      allowing(
        OPENER_ID,
        OverwriteType.Member,
        PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages
      ),
    ])
  ).toBe(OPENER_ID)
})
