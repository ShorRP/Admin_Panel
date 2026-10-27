import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type APIAutoModerationRule,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
} from "discord-api-types/v10"

const PANEL_RULE_NAME = "Mots interdits du panel"

export function isKeywordRule(rule: APIAutoModerationRule) {
  return rule.trigger_type === AutoModerationRuleTriggerType.Keyword
}

export function isPanelRule(rule: APIAutoModerationRule) {
  return isKeywordRule(rule) && rule.name === PANEL_RULE_NAME
}

export function keywordsOf(rule: APIAutoModerationRule) {
  return rule.trigger_metadata.keyword_filter ?? []
}

export function newPanelRule(
  keywords: string[]
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: PANEL_RULE_NAME,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: keywords },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: true,
  }
}

export function withKeywords(
  rule: APIAutoModerationRule,
  keywords: string[]
): RESTPatchAPIAutoModerationRuleJSONBody {
  return {
    trigger_metadata: { ...rule.trigger_metadata, keyword_filter: keywords },
  }
}
