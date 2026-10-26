import "server-only"

import type {
  APIUser,
  RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10"

import { parseDiscordOAuthEnv, type DiscordOAuthEnv } from "./env"
import { codeChallengeOf } from "./pkce"
import { API_BASE, requestDiscordJson, type Fetch } from "./rest"
import { ROUTES } from "./routes"

export type DiscordOAuth = {
  authorizationUrl(state: string, codeVerifier: string): string
  exchangeCode(
    code: string,
    codeVerifier: string
  ): Promise<RESTPostOAuth2AccessTokenResult>
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
    authorizationUrl(state, codeVerifier) {
      const url = new URL(AUTHORIZATION_URL)
      url.search = new URLSearchParams({
        client_id: env.clientId,
        redirect_uri: env.redirectUri,
        response_type: "code",
        scope: "identify",
        state,
        prompt: "consent",
        code_challenge: codeChallengeOf(codeVerifier),
        code_challenge_method: "S256",
      }).toString()
      return url.href
    },

    async exchangeCode(code, codeVerifier) {
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
          code_verifier: codeVerifier,
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
