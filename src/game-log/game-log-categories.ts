export const GAME_LOG_CATEGORY_KEYS = ["administration", "characters"] as const

export type GameLogCategoryKey = (typeof GAME_LOG_CATEGORY_KEYS)[number]

export const GAME_LOG_CATEGORIES: Record<
  GameLogCategoryKey,
  { label: string }
> = {
  administration: { label: "Administration" },
  characters: { label: "Personnages" },
}

export function categoryKeyOf(category: string): GameLogCategoryKey | null {
  const wanted = category.trim().toLocaleLowerCase("fr")
  return (
    GAME_LOG_CATEGORY_KEYS.find(
      (key) => GAME_LOG_CATEGORIES[key].label.toLocaleLowerCase("fr") === wanted
    ) ?? null
  )
}
