export type HiddenField = { name: string; value: string }

export function HiddenFields({ fields }: { fields: HiddenField[] }) {
  return fields.map(({ name, value }) => (
    <input key={name} type="hidden" name={name} value={value} />
  ))
}
