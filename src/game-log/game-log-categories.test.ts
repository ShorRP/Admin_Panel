import { expect, test } from "vitest"

import {
  categoryKeyOf,
  GAME_LOG_CATEGORIES,
  GAME_LOG_CATEGORY_KEYS,
} from "./game-log-categories"

test("the categories seen are Administration and Personnages, each under an English slug", () => {
  expect(GAME_LOG_CATEGORY_KEYS).toEqual(["administration", "characters"])
  expect(GAME_LOG_CATEGORIES.administration.label).toBe("Administration")
  expect(GAME_LOG_CATEGORIES.characters.label).toBe("Personnages")
})

test("a line's category is the pill whose label it carries, whatever the case", () => {
  expect(categoryKeyOf("Administration")).toBe("administration")
  expect(categoryKeyOf("personnages")).toBe("characters")
  expect(categoryKeyOf("  PERSONNAGES ")).toBe("characters")
})

test("a category that no pill names belongs to none", () => {
  expect(categoryKeyOf("Serveur")).toBeNull()
  expect(categoryKeyOf("")).toBeNull()
})
