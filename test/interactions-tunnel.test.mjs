import assert from "node:assert/strict"
import test from "node:test"

import { tunnelUrlIn } from "../scripts/interactions-tunnel.mjs"

const REQUESTING = [
  "2026-10-28T16:20:00Z INF Thank you for trying Cloudflare Tunnel. Doing so, without a Cloudflare account, is a quick way to experiment and try it out. However, be aware that these account-less Tunnels have no uptime guarantee, are subject to the Cloudflare Online Services Terms of Use (https://www.cloudflare.com/website-terms/), and Cloudflare reserves the right to investigate your use of Tunnels for violations of such terms.",
  "2026-10-28T16:20:00Z INF Requesting new quick Tunnel on trycloudflare.com...",
].join("\n")

const CREATED = [
  "2026-10-28T16:20:02Z INF +--------------------------------------------------------------------------------------------+",
  "2026-10-28T16:20:02Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |",
  "2026-10-28T16:20:02Z INF |  https://shield-amber-oak-rides.trycloudflare.com                                          |",
  "2026-10-28T16:20:02Z INF +--------------------------------------------------------------------------------------------+",
].join("\n")

test("the tunnel's URL is the trycloudflare.com address cloudflared prints once the tunnel exists", () => {
  assert.equal(tunnelUrlIn(REQUESTING), null)
  assert.equal(
    tunnelUrlIn(`${REQUESTING}\n${CREATED}`),
    "https://shield-amber-oak-rides.trycloudflare.com"
  )
})

test("the API cloudflared asks for a tunnel is no tunnel's URL", () => {
  assert.equal(
    tunnelUrlIn(
      `${REQUESTING}\n2026-10-28T16:20:01Z ERR failed to request quick Tunnel: Post "https://api.trycloudflare.com/tunnel": dial tcp: lookup api.trycloudflare.com: no such host`
    ),
    null
  )
})
