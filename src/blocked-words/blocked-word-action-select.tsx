import { cn } from "cn"

import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import {
  blockedWordAction,
  type BlockedWordActionId,
} from "./blocked-word-action"

export function BlockedWordActionSelect({
  id,
  actions,
  selected,
  describedBy,
  className,
}: {
  id: string
  actions: BlockedWordActionId[]
  selected: string
  describedBy?: string
  className?: string
}) {
  return (
    <NativeSelect
      key={selected}
      id={id}
      name="action"
      defaultValue={selected}
      aria-describedby={describedBy}
      className={cn("[&>select]:h-9.5", className)}
    >
      {actions.map((actionId) => (
        <NativeSelectOption key={actionId} value={actionId}>
          {blockedWordAction(actionId).label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
