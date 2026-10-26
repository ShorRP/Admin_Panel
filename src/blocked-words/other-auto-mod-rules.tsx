import { counted } from "./french-text"
import type { OtherAutoModRule } from "./read-blocked-words"

export function OtherAutoModRules({ rules }: { rules: OtherAutoModRule[] }) {
  if (rules.length === 0) {
    return null
  }
  return (
    <section
      aria-labelledby="other-auto-mod-rules"
      className="flex flex-col gap-2"
    >
      <h2 id="other-auto-mod-rules" className="text-lg font-medium">
        Autres règles AutoMod du serveur
      </h2>
      <p>Elles se modifient dans Discord.</p>
      <ul className="flex flex-col gap-1">
        {rules.map(({ id, name, keywords }) => (
          <li key={id}>
            <span className="wrap-anywhere">{name}</span>
            {keywords !== null && keywords.length > 0 && (
              <details>
                <summary>
                  {counted(keywords.length, "mot-clé", "mots-clés")}
                </summary>
                <ul className="ps-4">
                  {keywords.map((keyword) => (
                    <li key={keyword} className="wrap-anywhere">
                      {keyword}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
