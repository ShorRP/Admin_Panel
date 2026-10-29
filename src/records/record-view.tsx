import type { SanctionHistoryEntry } from "@/sanctions/read-sanction-history"
import { SanctionHistory } from "@/sanctions/sanction-history"
import type { SanctionOptions } from "@/sanctions/sanction-options"
import { StatefulRecordSanctions } from "@/sanctions/stateful-record-sanctions"
import type { AccountRecord } from "./read-record"
import { RecordColumns } from "./record-columns"
import { RecordDetails } from "./record-details"
import { RecordHeader } from "./record-header"

export function RecordView({
  record,
  options,
  history,
}: {
  record: AccountRecord | null
  options: SanctionOptions
  history: SanctionHistoryEntry[] | null
}) {
  return (
    <>
      <RecordHeader record={record} />
      {record !== null && (
        <RecordColumns
          twoColumns={options.kind !== "none"}
          details={<RecordDetails record={record} />}
          sanctions={<StatefulRecordSanctions options={options} />}
          history={<SanctionHistory history={history} />}
        />
      )}
    </>
  )
}
