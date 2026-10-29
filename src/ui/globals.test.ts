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
  ["foreground", "muted"],
  ["muted-foreground", "card"],
  ["muted-foreground", "popover"],
  ["muted-foreground", "accent"],
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
  ["success", "card"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["warning", "background"],
  ["warning", "card"],
] as const

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")

const favicon = readFileSync(
  new URL("../app/icon.svg", import.meta.url),
  "utf8"
)

const LIGHT_BLOCK = /^:root \{([^}]*)\}/m

const DARK_BLOCK =
  /^@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/m

const light = customProperties(LIGHT_BLOCK)

const themes = {
  light,
  dark: new Map([...light, ...customProperties(DARK_BLOCK)]),
}

function declarations(block: RegExp): Theme {
  const body = block.exec(css)?.[1]
  if (body === undefined) {
    throw new Error(`globals.css holds no block that matches ${block}.`)
  }
  return new Map(
    body
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration !== "")
      .map((declaration) => {
        const colon = declaration.indexOf(":")
        return [
          declaration.slice(0, colon),
          declaration.slice(colon + 1).trim(),
        ] as const
      })
  )
}

function customProperties(block: RegExp): Theme {
  return new Map(
    Array.from(declarations(block))
      .filter(([property]) => property.startsWith("--"))
      .map(([property, value]) => [property.slice(2), value])
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

test.each([
  ["light", /^:root\[data-theme="light"\] \{([^}]*)\}/m, LIGHT_BLOCK],
  ["dark", /^:root\[data-theme="dark"\] \{([^}]*)\}/m, DARK_BLOCK],
])(
  "the theme chosen as %s sets the same custom properties as the block the contrast tests measure, under its own color-scheme",
  (scheme, chosen, measured) => {
    expect(declarations(chosen)).toEqual(
      new Map([
        ["color-scheme", scheme],
        ...Array.from(
          customProperties(measured),
          ([name, value]) => [`--${name}`, value] as const
        ),
      ])
    )
  }
)

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

  test.each(["background", "card"])(
    "text in primary-foreground reaches 4.5:1 on primary/90 on %s, the default button's hover fill",
    (surface) => {
      expect(
        themeContrast(theme, "primary-foreground", [surface, "primary/90"])
      ).toBeGreaterThanOrEqual(4.5)
    }
  )

  test.each(["background", "card"])(
    "the field's border, input, reaches 3:1 on %s",
    (surface) => {
      expect(themeContrast(theme, "input", [surface])).toBeGreaterThanOrEqual(3)
    }
  )

  test.each(["background", "card", "popover", "muted"])(
    "the focus ring, ring/50, reaches 3:1 on %s",
    (surface) => {
      expect(themeContrast(theme, "ring/50", [surface])).toBeGreaterThanOrEqual(
        3
      )
    }
  )

  test.each(["muted", "card"])(
    "the border of the theme chosen in the toggle, primary, reaches 3:1 on %s",
    (surface) => {
      expect(themeContrast(theme, "primary", [surface])).toBeGreaterThanOrEqual(
        3
      )
    }
  )

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

test.each(["background", "card"])(
  "in dark, the field's border, input, reaches 3:1 on the field's fill, input/30 on %s",
  (surface) => {
    expect(
      themeContrast(themes.dark, "input", [surface, "input/30"])
    ).toBeGreaterThanOrEqual(3)
  }
)

test.each([
  ["foreground", "input/30", "background"],
  ["foreground", "input/50", "background"],
  ["muted-foreground", "input/30", "background"],
  ["foreground", "input/30", "card"],
  ["muted-foreground", "input/30", "card"],
])(
  "in dark, text in %s reaches 4.5:1 on %s on %s, the fill of the field or of the outline button",
  (text, fill, surface) => {
    expect(
      themeContrast(themes.dark, text, [surface, fill])
    ).toBeGreaterThanOrEqual(4.5)
  }
)
