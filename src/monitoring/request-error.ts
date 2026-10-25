import "server-only"

import type { Instrumentation } from "next"

import { createAlerting, sendAlert, type Alerting } from "./alert"
import { isPanelError } from "./panel-error"

export type RequestErrorReporter = (
  ...report: Parameters<Instrumentation.onRequestError>
) => void

export function createRequestErrorReporter() {
  return requestErrorReporterWith(createAlerting())
}

export function requestErrorReporterWith(
  alerting: Alerting
): RequestErrorReporter {
  return (error, _request, context) => {
    if (isPanelError(error)) {
      sendAlert(alerting, error, context)
    }
  }
}
