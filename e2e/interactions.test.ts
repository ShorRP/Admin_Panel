import { createPrivateKey, sign } from "node:crypto"

import { DISCORD_PUBLIC_KEY } from "../playwright.config"
import { expect, test } from "./fixtures"

const DISCORD_PRIVATE_KEY = createPrivateKey({
  key: {
    kty: "OKP",
    crv: "Ed25519",
    x: Buffer.from(DISCORD_PUBLIC_KEY, "hex").toString("base64url"),
    d: "TBTxbS8TFE228fTAT3Ot1TskdBEkEPBU72kMVFcal7g",
  },
  format: "jwk",
})

const PING = JSON.stringify({
  id: "1500000000000000001",
  application_id: "1563184114687803403",
  type: 1,
  token: "an-interaction-token",
  version: 1,
})

test("Discord's PING to /interactions gets its PONG, and a request Discord did not sign a 401", async ({
  page,
}) => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = sign(
    null,
    Buffer.from(timestamp + PING),
    DISCORD_PRIVATE_KEY
  ).toString("hex")

  const pong = await page.request.post("/interactions", {
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": signature,
      "X-Signature-Timestamp": timestamp,
    },
    data: PING,
    maxRedirects: 0,
  })
  const refused = await page.request.post("/interactions", {
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": "0".repeat(128),
      "X-Signature-Timestamp": timestamp,
    },
    data: PING,
    maxRedirects: 0,
  })

  expect(pong.status()).toBe(200)
  expect(await pong.json()).toEqual({ type: 1 })
  expect(refused.status()).toBe(401)
})
