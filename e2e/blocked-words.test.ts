import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

function recordViewTransitionNames() {
  new MutationObserver((records) => {
    for (const { target, oldValue } of records) {
      if (target instanceof HTMLLIElement) {
        for (const style of [oldValue, target.getAttribute("style")]) {
          const [, name] =
            /view-transition-name:\s*([^;\s]+)/.exec(style ?? "") ?? []
          if (name !== undefined && name !== "none") {
            target.dataset.viewTransitionName = name
          }
        }
      }
    }
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
    attributeOldValue: true,
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(recordViewTransitionNames)
})

function animationsByWord() {
  const wordsByName = new Map(
    Array.from(document.querySelectorAll("li"), (item) => [
      item.dataset.viewTransitionName,
      item.querySelector("span")?.textContent ?? "",
    ])
  )
  const changes = document.getAnimations().flatMap(({ effect }) => {
    const [, pseudoElement, name] =
      /^(::view-transition-[a-z-]+)\((.+)\)$/.exec(
        (effect instanceof KeyframeEffect && effect.pseudoElement) || ""
      ) ?? []
    if (
      !(effect instanceof KeyframeEffect) ||
      pseudoElement === undefined ||
      name === undefined ||
      name === "root" ||
      effect.getComputedTiming().duration === 0
    ) {
      return []
    }
    const keyframes = effect.getKeyframes()
    const [first] = keyframes
    const timing = `${String(effect.getComputedTiming().duration)} ms ${first?.easing ?? ""}`
    return Object.keys(first ?? {})
      .filter(
        (property) =>
          !["offset", "computedOffset", "easing", "composite"].includes(
            property
          ) &&
          keyframes.some((keyframe) => keyframe[property] !== first?.[property])
      )
      .map((property) => ({
        word: wordsByName.get(name) ?? "the word removed",
        change: `${pseudoElement} ${property} ${timing}`,
      }))
  })
  return (
    changes.length > 0 &&
    Object.fromEntries(
      Object.entries(Object.groupBy(changes, ({ word }) => word)).map(
        ([word, changesOfWord = []]) => [
          word,
          changesOfWord.map(({ change }) => change).sort(),
        ]
      )
    )
  )
}

function toastTransitions() {
  const properties = Array.from(
    document.querySelectorAll('[data-slot="toast"]'),
    (toast) => toast.getAnimations()
  )
    .flat()
    .flatMap((animation) =>
      animation instanceof CSSTransition && animation.playState === "running"
        ? [animation.transitionProperty]
        : []
    )
  return properties.length > 0 && properties.sort()
}

test.describe("with motion, which this flow keeps", () => {
  test.use({ reducedMotion: "no-preference" })

  test("a staff member adds a blocked word, which fades into the list lighting up, then removes it, which fades out of it, each write saying so in a toast", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
    readToast,
  }) => {
    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await expect(page).toHaveTitle("Mots interdits – Panel de Shor")
    await expect(
      page.getByRole("heading", { level: 1, name: "Mots interdits" })
    ).toBeVisible()
    await expect(
      page.getByText("Aucun mot interdit pour l’instant.")
    ).toBeVisible()
    await checkAccessibility()
    await page.waitForFunction(() => document.activeViewTransition === null)

    const field = page.getByLabel("Mot ou expression")
    await field.fill("foo")
    const entering = page.waitForFunction(animationsByWord, undefined, {
      polling: "raf",
    })
    await page.getByRole("button", { name: "Ajouter" }).click()

    expect(await (await entering).jsonValue()).toEqual({
      foo: [
        "::view-transition-new backgroundColor 250 ms ease-out",
        "::view-transition-new opacity 250 ms ease-out",
      ],
    })

    await readToast("« foo » est maintenant un mot interdit.")
    await expect(field).toHaveValue("")
    await expect(
      page.getByText("1 mot interdit sur 1 000 possibles.")
    ).toBeVisible()
    expect(await discord.listAutoModerationRules()).toMatchObject([
      { trigger_metadata: { keyword_filter: ["foo"] } },
    ])
    await checkAccessibility()

    const leaving = page.waitForFunction(animationsByWord, undefined, {
      polling: "raf",
    })
    await page
      .getByRole("listitem")
      .filter({ hasText: "foo" })
      .getByRole("button", { name: "Retirer" })
      .click()

    expect(await (await leaving).jsonValue()).toEqual({
      "the word removed": ["::view-transition-old opacity 150 ms ease-out"],
    })

    await readToast("« foo » n’est plus un mot interdit.")
    await expect(
      page.getByText("Aucun mot interdit pour l’instant.")
    ).toBeVisible()
    expect(await discord.listAutoModerationRules()).toMatchObject([
      { trigger_metadata: { keyword_filter: [] } },
    ])
    await checkAccessibility()
  })
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

    test("a write's toast slides in and out unless motion is reduced, when it only fades", async ({
      page,
      logIn,
      checkAccessibility,
      toast,
      readToast,
    }) => {
      const message = "« banane » est maintenant un mot interdit."
      const moves = prefersReducedMotion ? ["opacity"] : ["transform"]

      await logIn(ALDIS)
      await page.goto("/blocked-words")
      await page.waitForLoadState()
      await page.getByLabel("Mot ou expression").fill("banane")
      const entering = page.waitForFunction(toastTransitions, undefined, {
        polling: "raf",
      })
      await page.getByRole("button", { name: "Ajouter" }).click()

      expect(await (await entering).jsonValue()).toEqual(moves)
      await readToast(message)
      await checkAccessibility()
      await toast(message).evaluate((element) =>
        Promise.all(element.getAnimations().map(({ finished }) => finished))
      )

      const leaving = page.waitForFunction(toastTransitions, undefined, {
        polling: "raf",
      })
      await toast(message).getByRole("button", { name: "Fermer" }).click()

      expect(await (await leaving).jsonValue()).toEqual(moves)
      await expect(toast(message)).toHaveCount(0)
    })

    test.describe("with two blocked words already", () => {
      test.use({
        discordState: {
          members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
          autoModerationRules: [
            {
              id: "1500000000000000001",
              guild_id: "1100000000000000000",
              name: "Mots interdits du panel",
              creator_id: ALDIS.id,
              event_type: AutoModerationRuleEventType.MessageSend,
              trigger_type: AutoModerationRuleTriggerType.Keyword,
              trigger_metadata: { keyword_filter: ["cerise", "abricot"] },
              actions: [{ type: AutoModerationActionType.BlockMessage }],
              enabled: true,
              exempt_roles: [],
              exempt_channels: [],
            },
          ],
        },
      })

      test("a blocked word added between the two pushes the next one down while the one before stays still, then removed lets it back up, each word that moves sliding unless motion is reduced", async ({
        page,
        logIn,
        checkAccessibility,
        readToast,
      }) => {
        const words = page.getByRole("main").getByRole("listitem")
        const slides = ["::view-transition-group transform 250 ms ease-out"]

        await logIn(ALDIS)
        await page.goto("/blocked-words")
        await expect(
          page.getByText("2 mots interdits sur 1 000 possibles.")
        ).toBeVisible()
        await page.waitForLoadState()
        await page.waitForFunction(() => document.activeViewTransition === null)
        expect(
          await page.evaluate(
            () => matchMedia("(prefers-reduced-motion: reduce)").matches
          )
        ).toBe(prefersReducedMotion)

        await page.getByLabel("Mot ou expression").fill("banane")
        const entering = page.waitForFunction(animationsByWord, undefined, {
          polling: "raf",
        })
        await page.getByRole("button", { name: "Ajouter" }).click()

        expect(await (await entering).jsonValue()).toEqual({
          banane: [
            "::view-transition-new backgroundColor 250 ms ease-out",
            "::view-transition-new opacity 250 ms ease-out",
          ],
          ...(!prefersReducedMotion && { cerise: slides }),
        })
        await readToast("« banane » est maintenant un mot interdit.")
        await expect(words).toHaveText([/^abricot/, /^banane/, /^cerise/])
        await checkAccessibility()

        const leaving = page.waitForFunction(animationsByWord, undefined, {
          polling: "raf",
        })
        await words
          .filter({ hasText: "banane" })
          .getByRole("button", { name: "Retirer" })
          .click()

        expect(await (await leaving).jsonValue()).toEqual({
          "the word removed": ["::view-transition-old opacity 150 ms ease-out"],
          ...(!prefersReducedMotion && { cerise: slides }),
        })
        await readToast("« banane » n’est plus un mot interdit.")
        await expect(words).toHaveText([/^abricot/, /^cerise/])
        await checkAccessibility()
      })
    })
  })
}

test("a write's toast stays while the staff member moves to another section, and coming back to the form adds no second toast", async ({
  page,
  logIn,
  checkAccessibility,
  toast,
  readToast,
}) => {
  const added = "« foo » est maintenant un mot interdit."
  const sections = page
    .getByRole("complementary")
    .getByRole("navigation", { name: "Sections du panel" })

  await logIn(ALDIS)
  await page.goto("/blocked-words")
  await page.waitForLoadState()
  await page.getByLabel("Mot ou expression").fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast(added)
  await checkAccessibility()

  await sections.getByRole("link", { name: "Journal d’audit" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal d’audit" })
  ).toBeVisible()
  await readToast(added)
  await checkAccessibility()
  await toast(added).getByRole("button", { name: "Fermer" }).click()
  await expect(toast(added)).toHaveCount(0)

  await sections.getByRole("link", { name: "Mots interdits" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Mots interdits" })
  ).toBeVisible()
  await page.getByLabel("Mot ou expression").fill("bar")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast("« bar » est maintenant un mot interdit.")
  await expect(toast()).toHaveCount(1)
})

test("a refused blocked word stays in the field, which its message describes, and makes no toast", async ({
  page,
  logIn,
  checkAccessibility,
  toast,
  readToast,
}) => {
  const tooLong = "é".repeat(61)
  await logIn(ALDIS)
  await page.goto("/blocked-words")

  const field = page.getByLabel("Mot ou expression")
  await field.fill(tooLong)
  await page.getByRole("button", { name: "Ajouter" }).click()

  await expect(field).toHaveAccessibleDescription(
    "Raccourcis ce mot : AutoMod n’accepte pas plus de 60 caractères."
  )
  await expect(field).toHaveValue(tooLong)
  await checkAccessibility()

  await field.fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast("« foo » est maintenant un mot interdit.")
  await expect(toast()).toHaveCount(1)
  await checkAccessibility()
})

test("the page says whom the blocked words spare", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-words")

  await expect(
    page.getByText(
      "Les mots interdits ne s’appliquent ni au propriétaire du serveur Discord, ni aux membres qui ont la permission « Administrateur » ou « Gérer le serveur »."
    )
  ).toBeVisible()
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
  await checkAccessibility()
})
