import { expect, test } from "vitest"

import { requestKindOf } from "./request-kind"

test("a channel name that starts with a request kind's emoji and the separator ShorBot writes gives that kind, labelled as an archive writes it", () => {
  expect(requestKindOf("🔧・lyra")).toBe("🔧 Problème technique")
  expect(requestKindOf("🚨・lyra")).toBe("🚨 Signaler un joueur")
  expect(requestKindOf("🎭・lyra")).toBe("🎭 Demande RP")
  expect(requestKindOf("❓・lyra")).toBe("❓ Autre demande")
})

test("whatever follows the separator is the member's name and changes nothing", () => {
  expect(requestKindOf("🔧・brynja-la-rousse")).toBe("🔧 Problème technique")
  expect(requestKindOf("🔧・")).toBe("🔧 Problème technique")
  expect(requestKindOf("🔧・🚨・x")).toBe("🔧 Problème technique")
})

test("a name that does not follow ShorBot's is no kind: no emoji, another emoji, no separator, a hyphen for the separator, or the emoji not first", () => {
  expect(requestKindOf("général")).toBeNull()
  expect(requestKindOf("📃・transcriptions")).toBeNull()
  expect(requestKindOf("🔧lyra")).toBeNull()
  expect(requestKindOf("🔧-lyra")).toBeNull()
  expect(requestKindOf("🔧 ・lyra")).toBeNull()
  expect(requestKindOf("ticket-🔧・lyra")).toBeNull()
  expect(requestKindOf("")).toBeNull()
})
