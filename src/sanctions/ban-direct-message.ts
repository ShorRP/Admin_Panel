export function banDirectMessage(reason: string) {
  return [
    "Tu as reçu un bannissement du serveur Discord de Shor.",
    `Motif : ${reason}`,
    "La marche à suivre pour le contester n’est pas encore fixée.",
    "Ne réponds pas à ce message : personne ne le lit.",
    "Le staff de Shor",
  ].join("\n\n")
}
