import { expect, test } from "vitest"

import { deName } from "./de-name"

test("a name that starts with a vowel takes « d’ », whatever its case", () => {
  for (const name of [
    "Aldis",
    "Eskil",
    "Ingrid",
    "Olaf",
    "Ulfric",
    "aldis",
    "eskil",
    "ingrid",
    "olaf",
    "ulfric",
  ]) {
    expect(deName(name)).toBe(`d’${name}`)
  }
})

test("a name that starts with an accented vowel takes « d’ », whatever its case", () => {
  for (const name of [
    "Émilie",
    "élodie",
    "Èdre",
    "Ève",
    "Àsa",
    "âge",
    "Ïo",
    "ôkami",
    "Ünal",
    "ùrsula",
    "Åsa",
    "Ångström",
  ]) {
    expect(deName(name)).toBe(`d’${name}`)
  }
})

test("a name that starts with a consonant keeps « de »", () => {
  for (const name of ["Lyra", "Brynja", "lyra", "Ñandú", "Çelik"]) {
    expect(deName(name)).toBe(`de ${name}`)
  }
})

test("a name that starts with « h » or « y » keeps « de »", () => {
  for (const name of ["Haldor", "haldor", "Yrsa", "yrsa"]) {
    expect(deName(name)).toBe(`de ${name}`)
  }
})

test("a name that starts with « æ » or « œ » keeps « de »", () => {
  for (const name of ["Œdipe", "œdipe", "Æsir", "æsir"]) {
    expect(deName(name)).toBe(`de ${name}`)
  }
})

test("a name that starts with something other than a letter keeps « de »", () => {
  for (const name of ["42", "_aldis", "[Staff] Aldis", "~eskil", "🛡️ Aldis"]) {
    expect(deName(name)).toBe(`de ${name}`)
  }
})

test("only the first character decides, and the name stays whole", () => {
  expect(deName("Lyra des Brumes")).toBe("de Lyra des Brumes")
  expect(deName("Aldis le Roux")).toBe("d’Aldis le Roux")
})
