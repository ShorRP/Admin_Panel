import type { Page } from "./fixtures"

export function startOfDialogOpening(page: Page) {
  return page.waitForFunction(
    () => {
      const animation = document
        .getAnimations()
        .find(
          ({ effect }) =>
            effect instanceof KeyframeEffect &&
            effect.target instanceof HTMLElement &&
            effect.target.dataset.slot === "dialog-content"
        )
      const dialog =
        animation?.effect instanceof KeyframeEffect
          ? animation.effect.target
          : null
      if (
        animation === undefined ||
        animation.effect === null ||
        !(dialog instanceof HTMLElement)
      ) {
        return false
      }
      animation.pause()
      animation.currentTime = 0
      const centerY = () => {
        const { top, height } = dialog.getBoundingClientRect()
        return top + height / 2
      }
      const startCenter = centerY()
      const start = {
        opacity: getComputedStyle(dialog).opacity,
        scale:
          Math.round(
            (dialog.getBoundingClientRect().width / dialog.offsetWidth) * 100
          ) / 100,
      }
      animation.currentTime = animation.effect.getComputedTiming().endTime ?? 0
      const lift = Math.round(startCenter - centerY())
      animation.currentTime = 0
      animation.play()
      return { ...start, lift }
    },
    undefined,
    { polling: "raf" }
  )
}

export function dialogTransitions(page: Page) {
  return page.waitForFunction(
    () => {
      const properties = document
        .getAnimations()
        .flatMap((animation) =>
          animation instanceof CSSTransition &&
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target?.getAttribute("role") === "dialog"
            ? [animation.transitionProperty]
            : []
        )
      return properties.length > 0 && [...new Set(properties)].sort()
    },
    undefined,
    { polling: "raf" }
  )
}
