import { useEffect, useRef } from "react"

import { toast } from "@/ui/toast"

type WriteResult = { ok: boolean; message: string }

export function useSuccessToast(state: WriteResult | null) {
  const toasted = useRef(state)
  useEffect(() => {
    if (state !== toasted.current && state?.ok === true) {
      toast.add({ description: state.message, type: "success" })
    }
    toasted.current = state
  }, [state])
}
