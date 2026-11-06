import type { ReactNode } from "react"

import { LOG_DETAIL_CLASSES, LOG_TITLE_CLASSES } from "@/ui/log-layout"

export type LogRawField = { name: string | null; value: string }

export function LogTitle({ children }: { children: ReactNode }) {
  return <p className={LOG_TITLE_CLASSES}>{children}</p>
}

export function LogDetail({ children }: { children: ReactNode }) {
  return children === "" ||
    children === null ||
    children === undefined ||
    children === false ? null : (
    <p className={LOG_DETAIL_CLASSES}>{children}</p>
  )
}

export function LogRawFields({ fields }: { fields: readonly LogRawField[] }) {
  return fields.map(({ name, value }, index) => (
    <LogDetail key={index}>
      {name === null ? value : `${name} : ${value}`}
    </LogDetail>
  ))
}
