const RESPONSIVE_VARIANT = /^(sm|md|lg|xl|2xl|min-\[[^\]]+\]|@.+)$/

const MAX_FIXED_WIDTH_REM = 20

const MAX_PLAIN_GRID_COLUMNS = 2

const CLASS_FUNCTIONS = new Set(["cn", "cva", "clsx"])

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
  const scale = /^(?:w|min-w)-(\d+(?:\.\d+)?)$/.exec(utility)
  if (scale !== null) {
    return Number(scale[1]) * 0.25
  }
  const arbitrary = /^(?:w|min-w)-\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(utility)
  if (arbitrary !== null) {
    return arbitrary[2] === "px"
      ? Number(arbitrary[1]) / 16
      : Number(arbitrary[1])
  }
  return null
}

export function problemsOf(classes) {
  const problems = []
  for (const token of classes.split(/\s+/).filter(Boolean)) {
    const parts = splitTopLevel(token.replace(/^!|!$/g, ""))
    const utility = parts.at(-1) ?? ""
    const responsive = parts
      .slice(0, -1)
      .some((variant) => RESPONSIVE_VARIANT.test(variant))
    if (
      /^(?:min-|max-)?h-screen$/.test(utility) ||
      /^(?:min-|max-)?h-\[[^\]]*\d+vh[^\]]*\]$/.test(utility)
    ) {
      problems.push({ messageId: "viewportHeight", data: { token } })
    }
    const rem = widthInRem(utility)
    if (!responsive && rem !== null && rem > MAX_FIXED_WIDTH_REM) {
      problems.push({ messageId: "fixedWidth", data: { token } })
    }
    const columns = /^grid-cols-(\d+)$/.exec(utility)
    if (
      !responsive &&
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
        "Refuses Tailwind classes that break the panel's layout below 1024 px: viewport heights in vh, fixed widths above 20rem and grids of more than two columns without a breakpoint or container variant.",
    },
    schema: [],
    messages: {
      viewportHeight:
        "`{{token}}` sizes by vh, which mobile browsers measure past their toolbars: use svh or dvh (h-svh, min-h-dvh).",
      fixedWidth:
        "`{{token}}` fixes a width above 20rem at every size: use max-w-*, a basis that wraps, or put it behind sm:, md:, lg:, xl: or a container variant (@min-[…]:).",
      fixedGrid:
        "`{{token}}` lays out more than two columns at every size: start from one or two columns and add the rest behind a breakpoint or a container variant, or use repeat(auto-fill,minmax(…,1fr)).",
    },
  },
  create(context) {
    const seen = new WeakSet()
    function check(node, text) {
      if (seen.has(node) || typeof text !== "string") {
        return
      }
      seen.add(node)
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
