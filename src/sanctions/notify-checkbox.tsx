import {
  CHOICE_CLASS,
  NATIVE_CONTROL_CLASS,
  SANCTION_ALERT_ID,
} from "./sanction-form"

export function NotifyCheckbox({
  defaultChecked,
}: {
  defaultChecked: boolean
}) {
  return (
    <label className={CHOICE_CLASS}>
      <input
        type="checkbox"
        name="notify"
        defaultChecked={defaultChecked}
        aria-describedby={SANCTION_ALERT_ID}
        className={NATIVE_CONTROL_CLASS}
      />
      Prévenir en message privé
    </label>
  )
}
