import { expect, test } from "vitest"

import {
  cellMatches,
  cellParamOf,
  placeOf,
  pluginMatches,
} from "./game-log-place"

test("a place is a form ID in hex, a plugin and the coordinates, as the game server writes it", () => {
  expect(placeOf("3c:Skyrim.esm · -82079, 4766, -4803")).toEqual({
    cell: "3c",
    plugin: "Skyrim.esm",
  })
})

test("a place without coordinates, or with a form ID in capitals, a prefix or leading zeros, still gives its cell and plugin", () => {
  expect(placeOf("3C:Shor-City.esp")).toEqual({
    cell: "3c",
    plugin: "Shor-City.esp",
  })
  expect(placeOf("0x0000003c:Skyrim.esm · 1, 2, 3")).toEqual({
    cell: "3c",
    plugin: "Skyrim.esm",
  })
  expect(placeOf("000:Skyrim.esm")).toEqual({ cell: "0", plugin: "Skyrim.esm" })
})

test("a place that does not follow the format gives neither", () => {
  expect(placeOf("quelque part")).toBeNull()
  expect(placeOf("zz:Skyrim.esm · 1, 2, 3")).toBeNull()
  expect(placeOf("")).toBeNull()
})

test("a cell typed is a form ID in hex, with or without its prefix, or else absent", () => {
  expect(cellParamOf("3c")).toBe("3c")
  expect(cellParamOf("  0x3C ")).toBe("0x3C")
  expect(cellParamOf("3c:Skyrim.esm")).toBeNull()
  expect(cellParamOf("tamriel")).toBeNull()
  expect(cellParamOf("123456789")).toBeNull()
  expect(cellParamOf("")).toBeNull()
  expect(cellParamOf(undefined)).toBeNull()
  expect(cellParamOf(["3c", "3d"])).toBeNull()
})

test("a cell matches the form ID of the place, whatever the case, the prefix and the leading zeros", () => {
  const place = "3c:Skyrim.esm · -82079, 4766, -4803"
  expect(cellMatches(place, "3c")).toBe(true)
  expect(cellMatches(place, "3C")).toBe(true)
  expect(cellMatches(place, "0x003c")).toBe(true)
  expect(cellMatches(place, "3d")).toBe(false)
  expect(cellMatches(place, "c")).toBe(false)
})

test("a cell matches no place that is out of format or absent", () => {
  expect(cellMatches("quelque part", "3c")).toBe(false)
  expect(cellMatches(null, "3c")).toBe(false)
})

test("a plugin matches the name of the place's plugin when it holds the text, whatever the case", () => {
  const place = "3c:Skyrim.esm · -82079, 4766, -4803"
  expect(pluginMatches(place, "Skyrim.esm")).toBe(true)
  expect(pluginMatches(place, "skyrim")).toBe(true)
  expect(pluginMatches(place, ".ESM")).toBe(true)
  expect(pluginMatches(place, "Shor-City")).toBe(false)
})

test("a plugin looks at the plugin alone, not at the cell or the coordinates", () => {
  const place = "3c:Skyrim.esm · -82079, 4766, -4803"
  expect(pluginMatches(place, "3c")).toBe(false)
  expect(pluginMatches(place, "4766")).toBe(false)
  expect(pluginMatches("quelque part", "part")).toBe(false)
  expect(pluginMatches(null, "Skyrim")).toBe(false)
})
