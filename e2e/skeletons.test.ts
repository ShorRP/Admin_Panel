import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = { id: "1400000000000000003", username: "lyra_gates" }

const PAGES = [
  {
    path: "/blocked-words",
    loading: "Chargement des mots interdits…",
    content: "Aucun mot interdit pour l’instant.",
  },
  {
    path: "/audit-log",
    loading: "Chargement du journal d’audit…",
    content:
      "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours.",
  },
  {
    path: `/records/${LYRA.id}`,
    loading: "Chargement de la fiche…",
    content: "Aucune sanction ni levée dans l’historique.",
  },
] as const

const FADES = [
  "::view-transition-new opacity 0 at 0%",
  "::view-transition-new opacity 1 at 100%",
  "::view-transition-old opacity 0 at 100%",
  "::view-transition-old opacity 1 at 0%",
]

const RISE = [
  "::view-transition-new translate 0px 8px at 0%",
  "::view-transition-new translate none at 100%",
]

test.use({
  discordState: {
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: LYRA },
    ],
  },
})

for (const { title, prefersReducedMotion } of [
  {
    title: "under reduced motion, every test's default",
    prefersReducedMotion: true,
  },
  {
    title: "with motion, which a test can ask for",
    prefersReducedMotion: false,
  },
]) {
  test.describe(title, () => {
    if (!prefersReducedMotion) {
      test.use({ reducedMotion: "no-preference" })
    }

    for (const { path, loading, content } of PAGES) {
      test(`while Discord answers late, ${path} shows its skeletons, pulsing unless motion is reduced, then its content fades in in place of its skeleton, rising only with motion`, async ({
        page,
        logIn,
        holdDiscord,
        checkAccessibility,
      }) => {
        await logIn(ALDIS)
        await page.waitForLoadState()

        const release = holdDiscord()
        await page.goto(path, { waitUntil: "commit" })
        const skeletons = page
          .getByRole("status")
          .filter({ hasText: /^Chargement/ })
        await expect(skeletons.filter({ hasText: loading })).toBeVisible()
        await expect(
          page
            .getByRole("complementary")
            .getByRole("status")
            .filter({ hasText: "Chargement de ton nom…" })
        ).toBeVisible()
        await page.waitForFunction(() => {
          const stylesheets = [
            ...document.querySelectorAll<HTMLLinkElement>(
              'link[rel="stylesheet"]'
            ),
          ]
          return (
            stylesheets.length > 0 &&
            stylesheets.every(({ sheet }) => sheet !== null)
          )
        })
        expect(
          await page.evaluate(
            () =>
              document
                .getAnimations()
                .filter(
                  (animation) =>
                    animation instanceof CSSAnimation &&
                    animation.animationName === "pulse"
                ).length > 0
          )
        ).toBe(!prefersReducedMotion)
        if (prefersReducedMotion) {
          await checkAccessibility({ waitForLoad: false })
        }

        const transition = page.waitForFunction(
          () => {
            const effects = [
              ...new Set(
                document.getAnimations().flatMap(({ effect }) =>
                  effect instanceof KeyframeEffect &&
                  effect.pseudoElement?.startsWith("::view-transition") &&
                  !effect.pseudoElement.endsWith("(root)") &&
                  effect.getComputedTiming().duration !== 0
                    ? effect.getKeyframes().flatMap((keyframe) =>
                        Object.entries(keyframe)
                          .filter(
                            ([key]) =>
                              ![
                                "offset",
                                "computedOffset",
                                "easing",
                                "composite",
                              ].includes(key)
                          )
                          .map(
                            ([property, value]) =>
                              `${effect.pseudoElement?.replace(/\(.*\)$/, "")} ${property} ${String(value)} at ${keyframe.computedOffset * 100}%`
                          )
                      )
                    : []
                )
              ),
            ].sort()
            return effects.length > 0 && effects
          },
          undefined,
          { polling: "raf" }
        )
        release()

        expect(await (await transition).jsonValue()).toEqual(
          [...FADES, ...(prefersReducedMotion ? [] : RISE)].sort()
        )
        await expect(page.getByText(content)).toBeVisible()
        await expect(skeletons).toHaveCount(0)
        await expect(page.getByRole("complementary")).toContainText("aldis")
      })
    }
  })
}
