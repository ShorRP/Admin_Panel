import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type APIAutoModerationAction,
  type APIAutoModerationRule,
  type RESTPatchAPIAutoModerationRuleJSONBody,
  type RESTPostAPIAutoModerationRuleJSONBody,
  type Snowflake,
} from "discord-api-types/v10"

import {
  BLOCKED_WORD_ACTIONS,
  type BlockedWordAction,
} from "./blocked-word-action"

export type PanelRule = {
  rule: APIAutoModerationRule
  action: BlockedWordAction
}

export function isKeywordRule(rule: APIAutoModerationRule) {
  return rule.trigger_type === AutoModerationRuleTriggerType.Keyword
}

export function panelRulesOf(rules: APIAutoModerationRule[]): PanelRule[] {
  return rules.flatMap((rule) => {
    const action = isKeywordRule(rule)
      ? BLOCKED_WORD_ACTIONS.find(({ ruleName }) => ruleName === rule.name)
      : undefined
    return action === undefined ? [] : [{ rule, action }]
  })
}

export function keywordsOf(rule: APIAutoModerationRule) {
  return rule.trigger_metadata.keyword_filter ?? []
}

function actionsOf(action: BlockedWordAction): APIAutoModerationAction[] {
  if (action.customMessage === null) {
    return [{ type: AutoModerationActionType.BlockMessage }]
  }
  return [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: action.customMessage },
    },
    ...(action.timeoutSeconds === null
      ? []
      : [
          {
            type: AutoModerationActionType.Timeout,
            metadata: { duration_seconds: action.timeoutSeconds },
          },
        ]),
  ]
}

export function newPanelRule(
  action: BlockedWordAction,
  staffRoleId: Snowflake,
  keywords: string[]
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: action.ruleName,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: keywords },
    actions: actionsOf(action),
    ...(action.sanctions && { exempt_roles: [staffRoleId] }),
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
