import "server-only"

import type {
  APIUser,
  RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10"

import { parseDiscordOAuthEnv, type DiscordOAuthEnv } from "./env"
import { API_BASE, requestDiscordJson, type Fetch } from "./rest"
import { ROUTES } from "./routes"

export type DiscordOAuth = {
  authorizationUrl(state: string): string
  exchangeCode(code: string): Promise<RESTPostOAuth2AccessTokenResult>
  getCurrentUser(accessToken: string): Promise<APIUser>
}

const AUTHORIZATION_URL = "https://discord.com/oauth2/authorize"

const OAUTH2_BASE = "https://discord.com/api"

export function createDiscordOAuth(): DiscordOAuth {
  return restDiscordOAuth(parseDiscordOAuthEnv(process.env), globalThis.fetch)
}

export function restDiscordOAuth(
  env: DiscordOAuthEnv,
  fetch: Fetch
): DiscordOAuth {
  return {
    authorizationUrl(state) {
      const url = new URL(AUTHORIZATION_URL)
      url.search = new URLSearchParams({
        client_id: env.clientId,
        redirect_uri: env.redirectUri,
        response_type: "code",
        scope: "identify",
        state,
        prompt: "consent",
      }).toString()
      return url.href
    },

    async exchangeCode(code) {
      const credentials = Buffer.from(
        `${env.clientId}:${env.clientSecret}`
      ).toString("base64")
      return await requestDiscordJson<RESTPostOAuth2AccessTokenResult>(fetch, {
        method: "POST",
        route: ROUTES.oauth2Token,
        url: OAUTH2_BASE + ROUTES.oauth2Token,
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: env.redirectUri,
        }).toString(),
      })
    },

    async getCurrentUser(accessToken) {
      return await requestDiscordJson<APIUser>(fetch, {
        method: "GET",
        route: ROUTES.currentUser,
        url: API_BASE + ROUTES.currentUser,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    },
  }
}
