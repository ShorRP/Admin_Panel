export function noRuleRefusal(
  change: "ajoute" | "retire" | "change",
  what: "le domaine" | "le rôle" | "le salon" | "l’action" | "le salon d’alerte"
) {
  return `La règle des liens n’existe pas encore : active-la d’abord, puis ${change} ${what}.`
}
