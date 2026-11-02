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
      if (animation === undefined || !(dialog instanceof HTMLElement)) {
        return false
      }
      animation.pause()
      animation.currentTime = 0
      const start = {
        opacity: getComputedStyle(dialog).opacity,
        scale:
          Math.round(
            (dialog.getBoundingClientRect().width / dialog.offsetWidth) * 100
          ) / 100,
      }
      animation.play()
      return start
    },
    undefined,
    { polling: "raf" }
  )
}
