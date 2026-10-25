import type { Instrumentation } from "next"

import { createRequestErrorReporter } from "@/monitoring/request-error"

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  createRequestErrorReporter()(error, request, context)
}
