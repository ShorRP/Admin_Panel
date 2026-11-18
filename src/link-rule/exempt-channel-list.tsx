import { quoted } from "@/blocked-words/french-text"
import { ExemptChipList } from "./exempt-chip-list"
import { channelLabel } from "./exemptable-channel"
import type { ExemptChannel } from "./read-link-rule"
import type { ChannelFields, WriteResult } from "./write-result"

export function ExemptChannelList({
  channels,
  state,
  pending,
  action,
}: {
  channels: ExemptChannel[]
  state: WriteResult<ChannelFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <ExemptChipList
      chips={channels.map(({ id, name, category }) => {
        const label =
          name === null ? "Salon introuvable" : channelLabel({ name, category })
        return {
          id,
          label,
          crossName:
            name === null
              ? `Retirer ${quoted(label)} (${id})`
              : `Retirer ${quoted(label)}`,
          removable: true,
        }
      })}
      field="channel"
      message={state?.ok === false ? state.message : null}
      pending={pending}
      action={action}
    />
  )
}
