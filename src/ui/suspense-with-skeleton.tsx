import { Suspense, ViewTransition, type ReactNode } from "react"

export function SuspenseWithSkeleton({
  skeleton,
  children,
}: {
  skeleton: ReactNode
  children: ReactNode
}) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="fade-exit" default="none">
          {skeleton}
        </ViewTransition>
      }
    >
      <ViewTransition enter="content-enter" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  )
}
