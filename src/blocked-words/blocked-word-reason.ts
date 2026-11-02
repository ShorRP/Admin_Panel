import {
  BLOCKED_WORD_ACTIONS,
  type BlockedWordAction,
} from "./blocked-word-action"
import { quoted, unquoted } from "./french-text"

export type ActionChange = {
  word: string
  from: BlockedWordAction
  to: BlockedWordAction
}

export function additionReason(word: string, action: BlockedWordAction) {
  return `ajout de ${quoted(word)}, action ${quoted(action.label)}`
}

export function removalReason(word: string, action: BlockedWordAction) {
  return `retrait de ${quoted(word)}, action ${quoted(action.label)}`
}

function actionsOfChange(from: BlockedWordAction, to: BlockedWordAction) {
  return ` passe de ${quoted(from.label)} à ${quoted(to.label)}`
}

export function actionChangeReason(
  word: string,
  from: BlockedWordAction,
  to: BlockedWordAction
) {
  return `${quoted(word)}${actionsOfChange(from, to)}`
}

export function actionChangeOf(reason: string): ActionChange | null {
  for (const from of BLOCKED_WORD_ACTIONS) {
    for (const to of BLOCKED_WORD_ACTIONS) {
      const ending = actionsOfChange(from, to)
      if (reason.endsWith(ending)) {
        const word = unquoted(reason.slice(0, -ending.length))
        if (word !== null) {
          return { word, from, to }
        }
      }
    }
  }
  return null
}
