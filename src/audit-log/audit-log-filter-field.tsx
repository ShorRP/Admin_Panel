import { Input } from "@/ui/input"
import { Label } from "@/ui/label"

export function AuditLogFilterField({
  id,
  name,
  label,
  value,
  className,
}: {
  id: string
  name: string
  label: string
  value: string | null
  className: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        defaultValue={value ?? ""}
        placeholder="Nom, ID ou mention"
        autoComplete="off"
      />
    </div>
  )
}
