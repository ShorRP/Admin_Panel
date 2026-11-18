export function noRuleRefusal(
  change: "ajoute" | "retire",
  what: "le domaine" | "le rôle" | "le salon"
) {
  return `La règle des liens n’existe pas encore : active-la d’abord, puis ${change} ${what}.`
}
