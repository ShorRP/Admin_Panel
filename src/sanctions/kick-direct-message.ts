export function kickDirectMessage(reason: string) {
  return [
    "Tu as reçu une expulsion du serveur Discord de Shor.",
    `Motif : ${reason}`,
    "Pour la contester, rejoins le serveur Discord par une invitation, puis ouvre un ticket de support « ❓ Autre demande ».",
    "Ne réponds pas à ce message : personne ne le lit.",
    "Le staff de Shor",
  ].join("\n\n")
}
