import "server-only"

import { createPublicKey, verify } from "node:crypto"
import {
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
  type APIInteractionResponsePong,
} from "discord-api-types/v10"

import { parseDiscordInteractionsEnv, type DiscordInteractionsEnv } from "./env"
import { readJson } from "./read-json"

const SIGNATURE = /^[0-9a-f]{128}$/i

export function readInteractionsEnv(): DiscordInteractionsEnv {
  return parseDiscordInteractionsEnv(process.env)
}

export async function answerInteraction(
  request: Request,
  env: DiscordInteractionsEnv
) {
  const body = Buffer.from(await request.clone().arrayBuffer())
  if (!isSignedByDiscord(request.headers, body, env.publicKey)) {
    return new Response(null, { status: 401 })
  }
  const interaction = await readJson<APIInteraction>(request)
  if (interaction.type !== InteractionType.Ping) {
    return new Response(null, { status: 400 })
  }
  return Response.json({
    type: InteractionResponseType.Pong,
  } satisfies APIInteractionResponsePong)
}

function isSignedByDiscord(headers: Headers, body: Buffer, publicKey: string) {
  const signature = headers.get("X-Signature-Ed25519")
  const timestamp = headers.get("X-Signature-Timestamp")
  if (signature === null || timestamp === null || !SIGNATURE.test(signature)) {
    return false
  }
  return verify(
    null,
    Buffer.concat([Buffer.from(timestamp), body]),
    ed25519PublicKey(publicKey),
    Buffer.from(signature, "hex")
  )
}

function ed25519PublicKey(hex: string) {
  return createPublicKey({
    key: {
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(hex, "hex").toString("base64url"),
    },
    format: "jwk",
  })
}
