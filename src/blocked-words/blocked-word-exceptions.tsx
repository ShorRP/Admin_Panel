import { Overline } from "@/ui/overline"

const LABEL_ID = "blocked-word-exceptions"

export function BlockedWordExceptions() {
  return (
    <section
      aria-labelledby={LABEL_ID}
      className="flex flex-col gap-2 rounded-xl bg-muted px-4.5 py-4"
    >
      <Overline id={LABEL_ID}>Exceptions</Overline>
      <p className="text-[0.84375rem] leading-5 text-pretty">
        Les mots interdits ne s’appliquent ni au propriétaire du serveur
        Discord, ni aux membres qui ont la permission « Administrateur » ou
        « Gérer le serveur ».
      </p>
    </section>
  )
}
