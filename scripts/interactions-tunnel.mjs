import { spawn } from "node:child_process"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import { z } from "zod"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const DEV_ORIGIN = "http://localhost:3000"

const APPLICATION_URL = "https://discord.com/api/v10/applications/@me"

const USER_AGENT = "DiscordBot (https://github.com/ShorRP/Admin_Panel, 0.0.0)"

const DEV_APPLICATION_ID = "1563184114687803403"

const TUNNEL_URL = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/

const LOCAL_ENV = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_PUBLIC_KEY: z.string().regex(/^[0-9a-f]{64}$/i),
})

const REACHABLE_WITHIN_MS = 120_000

const TIMEOUT_MS = 15_000

export function tunnelUrlIn(output) {
  return TUNNEL_URL.exec(output)?.[0] ?? null
}

function localEnv() {
  try {
    process.loadEnvFile(path.join(ROOT, ".env.local"))
  } catch {
    throw new Error("No .env.local at the repository's root.")
  }
  const result = LOCAL_ENV.safeParse(process.env)
  if (!result.success) {
    throw new Error(
      `.env.local needs the variables of "Shor Panel Dev":\n${z.prettifyError(result.error)}`
    )
  }
  return {
    botToken: result.data.DISCORD_BOT_TOKEN,
    publicKey: result.data.DISCORD_PUBLIC_KEY.toLowerCase(),
  }
}

async function requestCurrentApplication(botToken, method, body) {
  const response = await fetch(APPLICATION_URL, {
    method,
    headers: {
      Authorization: `Bot ${botToken}`,
      "User-Agent": USER_AGENT,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? null : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const answer = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      `Discord answered ${method} /applications/@me with ${response.status}: ${JSON.stringify(answer)}`
    )
  }
  return answer
}

async function interactionsStatus(origin) {
  try {
    const response = await fetch(`${origin}/interactions`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.status
  } catch {
    return null
  }
}

function startTunnel() {
  const tunnel = spawn(
    "cloudflared",
    ["tunnel", "--no-autoupdate", "--url", DEV_ORIGIN],
    { stdio: ["ignore", "inherit", "pipe"] }
  )
  const url = new Promise((resolve, reject) => {
    let output = ""
    tunnel.stderr.on("data", (chunk) => {
      process.stderr.write(chunk)
      if (output === null) {
        return
      }
      output += chunk
      const found = tunnelUrlIn(output)
      if (found !== null) {
        output = null
        resolve(found)
      }
    })
    tunnel.on("error", (error) => {
      reject(
        error.code === "ENOENT"
          ? new Error(
              "cloudflared is not installed, or this terminal predates its install: see the README."
            )
          : error
      )
    })
    tunnel.on("exit", (code) => {
      const stopped = new Error(`cloudflared stopped with code ${code}.`)
      if (output === null) {
        console.error(stopped.message)
        process.exitCode = code === 0 ? 0 : 1
      }
      reject(stopped)
    })
  })
  return { tunnel, url }
}

async function waitUntilReachable(origin) {
  const deadline = Date.now() + REACHABLE_WITHIN_MS
  while (Date.now() < deadline) {
    if ((await interactionsStatus(origin)) === 401) {
      return
    }
    await sleep(1000)
  }
  throw new Error(`${origin}/interactions did not answer through the tunnel.`)
}

async function checkDevServer() {
  const status = await interactionsStatus(DEV_ORIGIN)
  if (status === null) {
    throw new Error(`Nothing answers on ${DEV_ORIGIN}: start pnpm dev first.`)
  }
  if (status !== 401) {
    throw new Error(
      `${DEV_ORIGIN}/interactions answered an unsigned request with ${status} instead of 401: see pnpm dev's output.`
    )
  }
}

async function main() {
  const { botToken, publicKey } = localEnv()
  const current = await requestCurrentApplication(botToken, "GET")
  if (current.id !== DEV_APPLICATION_ID) {
    throw new Error(
      `DISCORD_BOT_TOKEN belongs to "${current.name}" (${current.id}), not to "Shor Panel Dev" (${DEV_APPLICATION_ID}).`
    )
  }
  if (current.verify_key !== publicKey) {
    throw new Error(
      `DISCORD_PUBLIC_KEY is not the public key of "Shor Panel Dev": copy it from its General Information page.`
    )
  }
  await checkDevServer()
  const { tunnel, url } = startTunnel()
  process.on("SIGINT", () => tunnel.kill())
  try {
    const origin = await url
    await waitUntilReachable(origin)
    const endpoint = `${origin}/interactions`
    await requestCurrentApplication(botToken, "PATCH", {
      interactions_endpoint_url: endpoint,
    })
    console.log(
      `\n"Shor Panel Dev" now sends its interactions to ${endpoint}. Ctrl+C stops the tunnel.\n`
    )
  } catch (error) {
    tunnel.kill()
    throw error
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
