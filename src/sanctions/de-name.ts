const STARTS_WITH_VOWEL = /^[aeiou]/i

export function deName(name: string) {
  return STARTS_WITH_VOWEL.test(name.normalize("NFD"))
    ? `d’${name}`
    : `de ${name}`
}
