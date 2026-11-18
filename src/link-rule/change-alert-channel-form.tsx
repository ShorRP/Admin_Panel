import { cn } from "cn"
import { Check, LoaderCircle } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/ui/native-select"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { channelLabel, type ChannelChoiceGroup } from "./exemptable-channel"
import { NO_ALERT_CHOICE } from "./link-rule-alert"
import { CHOICE_FIELD_ROW_CLASSES, CONTROL_CLASSES } from "./link-rule-layout"
import type { LinkRuleAlert } from "./read-link-rule"
import type { ChannelFields, WriteResult } from "./write-result"

const FIELD_ID = "link-rule-alert-channel"

const ALERT_ID = `${FIELD_ID}-error`

export function ChangeAlertChannelForm({
  groups,
  alert,
  state,
  pending,
  action,
}: {
  groups: ChannelChoiceGroup[]
  alert: LinkRuleAlert
  state: WriteResult<ChannelFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  const current = alert.kind === "channel" ? alert : null
  const offered = groups.flatMap(({ choices }) => choices)
  const own =
    current !== null && !offered.some(({ id }) => id === current.id)
      ? current
      : null
  const available = [
    NO_ALERT_CHOICE,
    ...(own === null ? [] : [own.id]),
    ...offered.map(({ id }) => id),
  ]
  const typed =
    state?.ok === false && available.includes(state.channel)
      ? state.channel
      : undefined
  const chosen = typed ?? current?.id ?? NO_ALERT_CHOICE
  return (
    <form action={action} className="@container flex flex-col">
      <Label htmlFor={FIELD_ID} className="text-[0.8125rem] leading-4.5">
        Changer le salon d’alerte
      </Label>
      <div className={CHOICE_FIELD_ROW_CLASSES}>
        <NativeSelect
          key={chosen}
          id={FIELD_ID}
          name="channel"
          defaultValue={chosen}
          aria-describedby={ALERT_ID}
          className="w-full @md:min-w-0 @md:flex-1 [&>select]:h-9.5 [&>select]:touch:h-11"
        >
          <NativeSelectOption value={NO_ALERT_CHOICE}>
            Aucun salon d’alerte
          </NativeSelectOption>
          {own !== null && (
            <NativeSelectOption value={own.id}>
              {own.name === null
                ? `Salon introuvable (${own.id})`
                : channelLabel({ name: own.name, category: own.category })}
            </NativeSelectOption>
          )}
          {groups.map(({ id, label, choices }) => {
            const options = choices.map((choice) => (
              <NativeSelectOption key={choice.id} value={choice.id}>
                {channelLabel(choice)}
              </NativeSelectOption>
            ))
            return label === null ? (
              options
            ) : (
              <NativeSelectOptGroup key={id} label={label}>
                {options}
              </NativeSelectOptGroup>
            )
          })}
        </NativeSelect>
        <Button
          type="submit"
          disabled={pending}
          className={cn(
            "w-full px-3.5 has-data-[icon=inline-start]:pl-3 @md:w-auto",
            CONTROL_CLASSES
          )}
        >
          {pending ? (
            <>
              <LoaderCircle
                aria-hidden
                data-icon="inline-start"
                className="motion-safe:animate-spin"
              />
              Changement…
            </>
          ) : (
            <>
              <Check aria-hidden data-icon="inline-start" />
              Changer
            </>
          )}
        </Button>
      </div>
      <p role="alert" id={ALERT_ID} className="text-sm not-empty:mt-2.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </form>
  )
}
