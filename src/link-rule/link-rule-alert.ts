import {
  AutoModerationActionType,
  type APIAutoModerationAction,
  type APIAutoModerationRule,
  type Snowflake,
} from "discord-api-types/v10"

export const NO_ALERT_CHOICE = "none"

export type AlertReading =
  | { kind: "none" }
  | { kind: "channel"; id: Snowflake }
  | { kind: "set-in-discord" }

export function isAlert({ type }: APIAutoModerationAction) {
  return type === AutoModerationActionType.SendAlertMessage
}

export function alertOf(rule: APIAutoModerationRule): AlertReading {
  const alerts = rule.actions.filter(isAlert)
  const [alert, ...more] = alerts
  if (alert === undefined) {
    return { kind: "none" }
  }
  const channelId = alert.metadata?.channel_id
  if (
    more.length > 0 ||
    channelId === undefined ||
    alerts.length === rule.actions.length
  ) {
    return { kind: "set-in-discord" }
  }
  return { kind: "channel", id: channelId }
}
