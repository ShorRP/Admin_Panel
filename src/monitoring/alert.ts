import "server-only"

import { waitUntil } from "@vercel/functions"

import { alertMessage, type AlertContext } from "./alert-message"
import { parseMonitoringEnv, type MonitoringEnv } from "./env"

export type Fetch = typeof globalThis.fetch

export type Alerting = {
  env: MonitoringEnv
  fetch: Fetch
  waitUntil: (send: Promise<void>) => void
}

const TIMEOUT_MS = 2_000

export function createAlerting(): Alerting {
  return {
    env: parseMonitoringEnv(process.env),
    fetch: globalThis.fetch,
    waitUntil,
  }
}

export function sendAlert(
  alerting: Alerting,
  error: unknown,
  context?: AlertContext
) {
  const webhookUrl = alerting.env.alertWebhookUrl
  if (webhookUrl === undefined) {
    return
  }
  alerting.waitUntil(post(alerting, webhookUrl, error, context))
}

async function post(
  { env, fetch }: Alerting,
  webhookUrl: string,
  error: unknown,
  context: AlertContext | undefined
) {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertMessage(env, error, context)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error(`Alert not sent: Discord answered ${response.status}`)
    }
  } catch (failure) {
    console.error(
      `Alert not sent: ${failure instanceof Error ? failure.name : typeof failure}`
    )
  }
}
