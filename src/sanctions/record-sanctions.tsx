import { StatefulTimeoutForms } from "./stateful-timeout-forms"
import type { TimeoutOptions } from "./timeout-options"

const HEADING_ID = "sanctions"

export function RecordSanctions({ options }: { options: TimeoutOptions }) {
  if (options.kind === "none") {
    return null
  }
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <h2 id={HEADING_ID} className="font-heading text-lg font-medium">
        Sanctions
      </h2>
      {options.kind === "refused" ? (
        <p>{options.reason}</p>
      ) : (
        <StatefulTimeoutForms
          userId={options.userId}
          timedOutUntil={options.timedOutUntil}
        />
      )}
    </section>
  )
}
