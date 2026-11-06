import { z } from "zod"

export type GamePlace = { cell: string; plugin: string }

const PLACE = /^\s*(?:0x)?([0-9a-f]+):(.+?)\s*(?:·.*)?$/i

const CELL = z
  .string()
  .trim()
  .regex(/^(?:0x)?[0-9a-f]{1,8}$/i)
  .nullable()
  .catch(null)

export function placeOf(place: string): GamePlace | null {
  const found = PLACE.exec(place)
  const cell = found?.[1]
  const plugin = found?.[2]
  return cell === undefined || plugin === undefined
    ? null
    : { cell: normalizedCell(cell), plugin }
}

export function cellParamOf(value: unknown): string | null {
  return CELL.parse(value)
}

export function cellMatches(place: string | null, cell: string) {
  const found = place === null ? null : placeOf(place)
  return found !== null && found.cell === normalizedCell(cell)
}

export function pluginMatches(place: string | null, text: string) {
  const found = place === null ? null : placeOf(place)
  return (
    found !== null &&
    found.plugin.toLocaleLowerCase().includes(text.trim().toLocaleLowerCase())
  )
}

function normalizedCell(cell: string) {
  return cell
    .replace(/^0x/i, "")
    .toLowerCase()
    .replace(/^0+(?=.)/, "")
}
