const GUARD_VARIANT = /^(sm|md|lg|xl|2xl|min-\[[^\]]+\]|@(?!max-).+)$/

const MAX_FIXED_WIDTH_REM = 20

const MAX_PLAIN_GRID_COLUMNS = 2

const CLASS_FUNCTIONS = new Set(["cn", "cva", "clsx"])

const NAMED_WIDTHS_REM = {
  "3xs": 16,
  "2xs": 18,
  xs: 20,
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
  "2xl": 42,
  "3xl": 48,
  "4xl": 56,
  "5xl": 64,
  "6xl": 72,
  "7xl": 80,
}

function splitTopLevel(token) {
  const parts = []
  let depth = 0
  let current = ""
  for (const character of token) {
    if (character === "[" || character === "(") {
      depth += 1
    } else if (character === "]" || character === ")") {
      depth -= 1
    }
    if (character === ":" && depth === 0) {
      parts.push(current)
      current = ""
    } else {
      current += character
    }
  }
  parts.push(current)
  return parts
}

function widthInRem(utility) {
  const scale = /^(?:w|min-w|size)-(\d+(?:\.\d+)?)$/.exec(utility)
  if (scale !== null) {
    return Number(scale[1]) * 0.25
  }
  const arbitrary = /^(?:w|min-w|size)-\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(
    utility
  )
  if (arbitrary !== null) {
    return arbitrary[2] === "px"
      ? Number(arbitrary[1]) / 16
      : Number(arbitrary[1])
  }
  const [, name] = /^(?:w|min-w)-([0-9a-z]+)$/.exec(utility) ?? []
  return NAMED_WIDTHS_REM[name ?? ""] ?? null
}

function sizesByVh(utility) {
  return (
    /^(?:min-|max-)?h-screen$/.test(utility) || /\[[^\]]*\dvh/.test(utility)
  )
}

export function problemsOf(classes) {
  const problems = []
  for (const token of classes.split(/\s+/).filter(Boolean)) {
    const parts = splitTopLevel(token)
    const utility = (parts.at(-1) ?? "").replace(/^!|!$/g, "")
    const guarded = parts
      .slice(0, -1)
      .some((variant) => GUARD_VARIANT.test(variant))
    if (sizesByVh(utility)) {
      problems.push({ messageId: "viewportHeight", data: { token } })
    }
    const rem = widthInRem(utility)
    if (!guarded && rem !== null && rem > MAX_FIXED_WIDTH_REM) {
      problems.push({ messageId: "fixedWidth", data: { token } })
    }
    const columns = /^grid-cols-(\d+)$/.exec(utility)
    if (
      !guarded &&
      columns !== null &&
      Number(columns[1]) > MAX_PLAIN_GRID_COLUMNS
    ) {
      problems.push({ messageId: "fixedGrid", data: { token } })
    }
  }
  return problems
}

export const responsiveClasses = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Refuses Tailwind classes that break the panel's layout below 1024 px: lengths in vh, fixed widths above 20rem and grids of more than two columns without a breakpoint or container variant.",
    },
    schema: [],
    messages: {
      viewportHeight:
        "`{{token}}` sizes by vh, which mobile browsers measure past their toolbars: use svh, dvh or lvh (h-svh, min-h-dvh).",
      fixedWidth:
        "`{{token}}` fixes a width above 20rem at every size: use max-w-*, a basis that wraps, or put it behind sm:, md:, lg:, xl: or a container variant (@min-[…]:).",
      fixedGrid:
        "`{{token}}` lays out more than two columns at every size: start from one or two columns and add the rest behind a breakpoint or a container variant, or use repeat(auto-fill,minmax(…,1fr)).",
    },
  },
  create(context) {
    function check(node, text) {
      if (typeof text !== "string") {
        return
      }
      for (const problem of problemsOf(text)) {
        context.report({ node, ...problem })
      }
    }
    function insideClassContext(node) {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (
          parent.type === "JSXAttribute" &&
          parent.name?.name === "className"
        ) {
          return true
        }
        if (
          parent.type === "CallExpression" &&
          parent.callee.type === "Identifier" &&
          CLASS_FUNCTIONS.has(parent.callee.name)
        ) {
          return true
        }
        if (parent.type === "Property" && parent.key === node) {
          return false
        }
      }
      return false
    }
    return {
      Literal(node) {
        if (typeof node.value === "string" && insideClassContext(node)) {
          check(node, node.value)
        }
      },
      TemplateElement(node) {
        if (insideClassContext(node)) {
          check(node, node.value.cooked)
        }
      },
    }
  },
}
