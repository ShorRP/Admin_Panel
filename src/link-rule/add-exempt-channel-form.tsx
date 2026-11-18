import { NativeSelectOptGroup, NativeSelectOption } from "@/ui/native-select"
import { ExemptChoiceForm } from "./exempt-choice-form"
import { channelLabel, type ChannelChoiceGroup } from "./exemptable-channel"
import type { ChannelFields, WriteResult } from "./write-result"

export function AddExemptChannelForm({
  groups,
  state,
  pending,
  action,
}: {
  groups: ChannelChoiceGroup[]
  state: WriteResult<ChannelFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <ExemptChoiceForm
      label="Ajouter un salon"
      fieldId="exempt-channel"
      name="channel"
      prompt="Choisir un salon"
      nothingLeft="Aucun autre salon"
      chosen={state?.ok === false ? state.channel : ""}
      empty={groups.length === 0}
      message={state?.ok === false ? state.message : null}
      pending={pending}
      action={action}
    >
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
    </ExemptChoiceForm>
  )
}
