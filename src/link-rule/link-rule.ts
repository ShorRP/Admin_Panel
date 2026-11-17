import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type APIAutoModerationRule,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type Snowflake,
} from "discord-api-types/v10"

import { isKeywordRule } from "@/blocked-words/panel-rule"
import { allowListEntriesOf } from "./allowed-domains"

export const LINK_RULE_NAME = "Liens bloqués du panel"

export const DEFAULT_ALLOWED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "klipy.com",
  "tenor.com",
  "giphy.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
]

const LINK_PATTERNS = [
  "https?://[^\\s/?#]+",
  "(?:discord\\.gg|discord(?:app)?\\.com/invite)/\\S+",
]

const BLOCKED_LINK_MESSAGE =
  "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor."

export function linkRuleOf(rules: APIAutoModerationRule[]) {
  return rules.find(
    (rule) => isKeywordRule(rule) && rule.name === LINK_RULE_NAME
  )
}

export function allowListOf(rule: APIAutoModerationRule) {
  return rule.trigger_metadata.allow_list ?? []
}

export function withAllowList(
  rule: APIAutoModerationRule,
  allowList: string[]
): RESTPatchAPIAutoModerationRuleJSONBody {
  return {
    trigger_metadata: { ...rule.trigger_metadata, allow_list: allowList },
  }
}

export function newLinkRule(
  staffRoleId: Snowflake
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: LINK_RULE_NAME,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: {
      regex_patterns: LINK_PATTERNS,
      allow_list: DEFAULT_ALLOWED_DOMAINS.flatMap(allowListEntriesOf),
    },
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: { custom_message: BLOCKED_LINK_MESSAGE },
      },
    ],
    exempt_roles: [staffRoleId],
    enabled: true,
  }
}
