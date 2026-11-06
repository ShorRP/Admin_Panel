import { expect, test } from "vitest"

import { resolveChannel } from "./resolve-channel"

const CHANNELS = [
  { id: "1400000000000000020", name: "🎫・ticket-0042" },
  { id: "1400000000000000021", name: "🎫・ticket-0043" },
  { id: "1400000000000000022", name: "🔊・salon de Lyra" },
  { id: "1400000000000000023", name: "ticket" },
]

test("an ID, with or without its mention, is the channel, whether or not the Discord server lists it", () => {
  expect(resolveChannel("1400000000000000099", CHANNELS)).toEqual({
    kind: "channel",
    id: "1400000000000000099",
  })
  expect(resolveChannel(" <#1400000000000000099> ", CHANNELS)).toEqual({
    kind: "channel",
    id: "1400000000000000099",
  })
})

test("a name that is part of one channel's name is that channel, whatever its case and a leading #", () => {
  expect(resolveChannel("#SALON de lyra", CHANNELS)).toEqual({
    kind: "channel",
    id: "1400000000000000022",
  })
  expect(resolveChannel("0042", CHANNELS)).toEqual({
    kind: "channel",
    id: "1400000000000000020",
  })
})

test("a name that is the whole name of one channel is that channel, though others contain it", () => {
  expect(resolveChannel("ticket", CHANNELS)).toEqual({
    kind: "channel",
    id: "1400000000000000023",
  })
})

test("a name that no channel holds is none, and one that several hold is several", () => {
  expect(resolveChannel("zzz", CHANNELS)).toEqual({ kind: "none" })
  expect(resolveChannel("ticket-004", CHANNELS)).toEqual({ kind: "several" })
})

test("a mention is no name: an ID that is too short falls back to the names", () => {
  expect(resolveChannel("<#123>", CHANNELS)).toEqual({ kind: "none" })
})
