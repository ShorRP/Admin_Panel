import { frenchNumber } from "@/ui/french-number"

export function cutNoteSentence(readMessages: number) {
  return `Les ${frenchNumber(readMessages)} messages suivants du salon ont été lus, ce qui ne remplit pas la page : « Plus anciens » continue la lecture.`
}

export function cutEmptySentence(readMessages: number) {
  return `Aucune ligne ne correspond aux filtres parmi les ${frenchNumber(readMessages)} messages suivants du salon : « Plus anciens » continue la lecture.`
}

export function LogCutNote({ readMessages }: { readMessages: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      {cutNoteSentence(readMessages)}
    </p>
  )
}
