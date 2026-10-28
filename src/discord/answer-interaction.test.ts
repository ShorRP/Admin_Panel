import { generateKeyPairSync, sign, type KeyObject } from "node:crypto"
import { expect, test } from "vitest"

import { answerInteraction } from "./answer-interaction"

const discordKeys = generateKeyPairSync("ed25519")

const env = { publicKey: hexOf(discordKeys.publicKey) }

const TIMESTAMP = "1793196000"

const PING = JSON.stringify({
  id: "1500000000000000001",
  application_id: "1563184114687803403",
  type: 1,
  token: "an-interaction-token",
  version: 1,
})

function hexOf(publicKey: KeyObject) {
  return Buffer.from(
    publicKey.export({ format: "jwk" }).x ?? "",
    "base64url"
  ).toString("hex")
}

function interactionRequest(body: string, headers: Record<string, string>) {
  return new Request("http://localhost:3000/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  })
}

function signedBy(privateKey: KeyObject, body: string, timestamp = TIMESTAMP) {
  return {
    "X-Signature-Ed25519": sign(
      null,
      Buffer.from(timestamp + body),
      privateKey
    ).toString("hex"),
    "X-Signature-Timestamp": timestamp,
  }
}

test("Discord's PING, signed with the application's key, gets its PONG", async () => {
  const response = await answerInteraction(
    interactionRequest(PING, signedBy(discordKeys.privateKey, PING)),
    env
  )

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ type: 1 })
})

test("a request that Discord did not sign gets a 401", async () => {
  const otherKeys = generateKeyPairSync("ed25519")
  const signature = signedBy(discordKeys.privateKey, PING)
  const tampered = PING.replace("an-interaction-token", "another-token")

  for (const [name, request] of [
    ["unsigned", interactionRequest(PING, {})],
    [
      "signed with another key",
      interactionRequest(PING, signedBy(otherKeys.privateKey, PING)),
    ],
    [
      "with a body changed after signing",
      interactionRequest(tampered, signature),
    ],
    [
      "with a timestamp changed after signing",
      interactionRequest(PING, {
        ...signature,
        "X-Signature-Timestamp": "1793196001",
      }),
    ],
    [
      "with a signature that is no hex",
      interactionRequest(PING, {
        ...signature,
        "X-Signature-Ed25519": "not-a-signature",
      }),
    ],
  ] as const) {
    const response = await answerInteraction(request, env)

    expect(response.status, name).toBe(401)
  }
})

test("a signed interaction the panel does not handle gets a 400, not a PONG", async () => {
  const click = JSON.stringify({
    id: "1500000000000000002",
    application_id: "1563184114687803403",
    type: 3,
    token: "an-interaction-token",
    version: 1,
    data: { custom_id: "a-button", component_type: 2 },
  })

  const response = await answerInteraction(
    interactionRequest(click, signedBy(discordKeys.privateKey, click)),
    env
  )

  expect(response.status).toBe(400)
})
