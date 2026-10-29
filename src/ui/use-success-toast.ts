import { useEffect, useRef } from "react"

import { toast } from "@/ui/toast"

type WriteResult = { ok: boolean; message: string }

export function useSuccessToast(state: WriteResult | null) {
  const seen = useRef(state)
  useEffect(() => {
    if (state !== seen.current && state?.ok === true) {
      toast.add({ title: state.message, type: "success" })
    }
    seen.current = state
  }, [state])
}
