import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

type Triple = readonly [number, number, number]

type Color = { srgb: Triple; alpha: number }

type Theme = ReadonlyMap<string, string>

const OKLAB_TO_LMS = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
] as const

const LMS_TO_LINEAR_SRGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
] as const

const LINEAR_SRGB_TO_LUMINANCE = [0.2126, 0.7152, 0.0722] as const

const TEXT_PAIRS = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["sidebar-foreground", "sidebar"],
  ["muted-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["success", "background"],
  ["destructive", "background"],
] as const

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")

const favicon = readFileSync(
  new URL("../app/icon.svg", import.meta.url),
  "utf8"
)

const light = customProperties(/^:root \{([^}]*)\}/m)

const themes = {
  light,
  dark: new Map([
    ...light,
    ...customProperties(
      /^@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/m
    ),
  ]),
}

function customProperties(block: RegExp): Theme {
  const declarations = block.exec(css)?.[1]
  if (declarations === undefined) {
    throw new Error(`globals.css holds no block that matches ${block}.`)
  }
  return new Map(
    declarations
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.startsWith("--"))
      .map((declaration) => {
        const colon = declaration.indexOf(":")
        return [
          declaration.slice(2, colon),
          declaration.slice(colon + 1).trim(),
        ] as const
      })
  )
}

function mapTriple([x, y, z]: Triple, f: (value: number) => number): Triple {
  return [f(x), f(y), f(z)]
}

function dot([x, y, z]: Triple, [p, q, r]: Triple) {
  return x * p + y * q + z * r
}

function multiply(
  [first, second, third]: readonly [Triple, Triple, Triple],
  vector: Triple
): Triple {
  return [dot(first, vector), dot(second, vector), dot(third, vector)]
}

function encode(linear: number) {
  const clipped = Math.min(1, Math.max(0, linear))
  return clipped <= 0.0031308
    ? 12.92 * clipped
    : 1.055 * clipped ** (1 / 2.4) - 0.055
}

function decode(channel: number) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function oklch(value: string): Color {
  const match = /^oklch\((\S+) (\S+) (\S+)(?: \/ (\S+)%)?\)$/.exec(value)
  if (match === null) {
    throw new Error(`${value} is not an oklch() color.`)
  }
  const [lightness, chroma, hue] = [
    Number(match[1]),
    Number(match[2]),
    (Number(match[3]) * Math.PI) / 180,
  ]
  const lms = multiply(OKLAB_TO_LMS, [
    lightness,
    chroma * Math.cos(hue),
    chroma * Math.sin(hue),
  ])
  return {
    srgb: mapTriple(
      multiply(
        LMS_TO_LINEAR_SRGB,
        mapTriple(lms, (value) => value ** 3)
      ),
      encode
    ),
    alpha: match[4] === undefined ? 1 : Number(match[4]) / 100,
  }
}

function themeColor(theme: Theme, layer: string): Color {
  const [variable = "", opacity = "100"] = layer.split("/")
  const value = theme.get(variable)
  if (value === undefined) {
    throw new Error(`globals.css sets no --${variable}.`)
  }
  const color = oklch(value)
  return { ...color, alpha: (color.alpha * Number(opacity)) / 100 }
}

function hex({ srgb }: Color) {
  return `#${srgb
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}

function faviconFill(element: string) {
  return new RegExp(`<${element}\\s[^>]*fill="([^"]*)"`).exec(favicon)?.[1]
}

function composite([bottom, ...above]: Color[]): Triple {
  if (bottom?.alpha !== 1) {
    throw new Error("The bottom layer must be opaque.")
  }
  return above.reduce<Triple>(
    (below, { srgb: [r, g, b], alpha }) => [
      alpha * r + (1 - alpha) * below[0],
      alpha * g + (1 - alpha) * below[1],
      alpha * b + (1 - alpha) * below[2],
    ],
    bottom.srgb
  )
}

function luminance(layers: Color[]) {
  return dot(LINEAR_SRGB_TO_LUMINANCE, mapTriple(composite(layers), decode))
}

function contrast(surface: Color[], top: Color) {
  const [behind, inFront] = [luminance(surface), luminance([...surface, top])]
  return (Math.max(behind, inFront) + 0.05) / (Math.min(behind, inFront) + 0.05)
}

function themeContrast(theme: Theme, layer: string, surface: string[]) {
  return contrast(
    surface.map((below) => themeColor(theme, below)),
    themeColor(theme, layer)
  )
}

test("the measure gives neutral-500 on white 4.74:1, the ratio of #737373", () => {
  expect(
    contrast([oklch("oklch(1 0 0)")], oklch("oklch(0.556 0 0)"))
  ).toBeCloseTo(4.74, 1)
})

test("the measure gives black at 50% on white 3.95:1, the ratio of #808080", () => {
  expect(
    contrast([oklch("oklch(1 0 0)")], oklch("oklch(0 0 0 / 50%)"))
  ).toBeCloseTo(3.95, 1)
})

test("the favicon draws the logo in dark's primary, on a tile of light's primary", () => {
  expect({ tile: faviconFill("rect"), logo: faviconFill("g") }).toEqual({
    tile: hex(themeColor(themes.light, "primary")),
    logo: hex(themeColor(themes.dark, "primary")),
  })
})

describe.each(["light", "dark"] as const)("in %s", (scheme) => {
  const theme = themes[scheme]

  test.each(TEXT_PAIRS)("text in %s on %s reaches 4.5:1", (text, surface) => {
    expect(themeContrast(theme, text, [surface])).toBeGreaterThanOrEqual(4.5)
  })

  test("text in primary-foreground reaches 4.5:1 on primary/90 on background, the default button's hover fill", () => {
    expect(
      themeContrast(theme, "primary-foreground", ["background", "primary/90"])
    ).toBeGreaterThanOrEqual(4.5)
  })

  test("the field's border, input, reaches 3:1 on background", () => {
    expect(
      themeContrast(theme, "input", ["background"])
    ).toBeGreaterThanOrEqual(3)
  })

  test("the focus ring, ring/50, reaches 3:1 on background", () => {
    expect(
      themeContrast(theme, "ring/50", ["background"])
    ).toBeGreaterThanOrEqual(3)
  })

  test("the current section's icon, in primary, reaches 3:1 on sidebar-accent", () => {
    expect(
      themeContrast(theme, "primary", ["sidebar-accent"])
    ).toBeGreaterThanOrEqual(3)
  })

  test("the sidebar's focus ring, sidebar-ring/50, reaches 3:1 on sidebar", () => {
    expect(
      themeContrast(theme, "sidebar-ring/50", ["sidebar"])
    ).toBeGreaterThanOrEqual(3)
  })
})

test("in dark, the field's border, input, reaches 3:1 on the field's fill, input/30 on background", () => {
  expect(
    themeContrast(themes.dark, "input", ["background", "input/30"])
  ).toBeGreaterThanOrEqual(3)
})

test.each(["input/30", "input/50"])(
  "in dark, text in foreground reaches 4.5:1 on %s on background, the fill of the field or of the outline button",
  (fill) => {
    expect(
      themeContrast(themes.dark, "foreground", ["background", fill])
    ).toBeGreaterThanOrEqual(4.5)
  }
)
