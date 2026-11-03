import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { RuleTester } from "eslint"

import {
  problemsOf,
  responsiveClasses,
} from "../eslint-rules/responsive-classes.mjs"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

ruleTester.run("responsive-classes", responsiveClasses, {
  valid: [
    'const a = <div className="h-svh w-63 max-w-270 min-w-52.5" />',
    'const a = <div className="w-full sm:w-82 md:w-96" />',
    'const a = <div className="@min-[48.75rem]:grid-cols-[minmax(28.75rem,1fr)_minmax(17.5rem,22.5rem)]" />',
    'const a = cn("grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2")',
    'const a = cn("grid grid-cols-2 lg:grid-cols-4")',
    'const a = clsx("w-full 2xl:w-96")',
    'const a = cva("", { variants: { size: { "w-96": "h-8" } } })',
    'const a = cn({ "w-96": open })',
    'const a = "w-96 h-screen"',
  ],
  invalid: [
    {
      code: 'const a = <div className="min-h-screen" />',
      errors: [{ messageId: "viewportHeight" }],
    },
    {
      code: 'const a = <div className="h-[100vh]" />',
      errors: [{ messageId: "viewportHeight" }],
    },
    {
      code: 'const a = cn("top-[50vh] py-[10vh]")',
      errors: [
        { messageId: "viewportHeight" },
        { messageId: "viewportHeight" },
      ],
    },
    {
      code: 'const a = cn("hover:!h-screen")',
      errors: [{ messageId: "viewportHeight" }],
    },
    {
      code: 'const a = cn("w-96")',
      errors: [{ messageId: "fixedWidth" }],
    },
    {
      code: 'const a = clsx("w-96")',
      errors: [{ messageId: "fixedWidth" }],
    },
    {
      code: 'const a = cn("dark:w-96 hover:w-96")',
      errors: [{ messageId: "fixedWidth" }, { messageId: "fixedWidth" }],
    },
    {
      code: "const a = <div className={`w-[480px] ${b}`} />",
      errors: [{ messageId: "fixedWidth" }],
    },
    {
      code: 'const a = cn("max-sm:min-w-[22rem]")',
      errors: [{ messageId: "fixedWidth" }],
    },
    {
      code: 'const a = cn("max-sm:!w-96")',
      errors: [{ messageId: "fixedWidth" }],
    },
    {
      code: 'const a = cn("@max-sm:w-96")',
      errors: [{ messageId: "fixedWidth" }],
    },
    {
      code: 'const a = cn("w-xl min-w-2xl size-96")',
      errors: [
        { messageId: "fixedWidth" },
        { messageId: "fixedWidth" },
        { messageId: "fixedWidth" },
      ],
    },
    {
      code: 'const a = cva("grid grid-cols-3")',
      errors: [{ messageId: "fixedGrid" }],
    },
    {
      code: 'const a = cn("dark:!grid-cols-3 @max-md:grid-cols-3")',
      errors: [{ messageId: "fixedGrid" }, { messageId: "fixedGrid" }],
    },
  ],
})

describe("problemsOf", () => {
  it("reads a variant inside brackets as one variant", () => {
    assert.deepEqual(problemsOf("min-[40rem]:w-[30rem]"), [])
  })

  it("leaves 20rem itself alone, as the 360 px screen holds it", () => {
    assert.deepEqual(
      problemsOf("w-80 min-w-[320px] w-xs min-w-xs size-80 size-[20rem]"),
      []
    )
  })

  it("reads a breakpoint prefix, 2xl included, and a container size or minimum as a guard", () => {
    assert.deepEqual(
      problemsOf(
        "sm:w-96 2xl:w-96 @sm:w-96 @min-md:w-96 @3xl:grid-cols-3 @min-[40rem]:grid-cols-3 hover:md:w-96"
      ),
      []
    )
  })

  it("refuses a container maximum, which narrows as max-sm does", () => {
    assert.equal(problemsOf("@max-md:grid-cols-3 @max-sm:w-96").length, 2)
  })

  it("strips the important modifier from the utility, whichever side it is on", () => {
    assert.equal(problemsOf("w-96! !w-96 max-sm:w-96! max-sm:!w-96").length, 4)
    assert.deepEqual(problemsOf("sm:!w-96 md:w-96!"), [])
  })

  it("reads Tailwind's named widths, which w and min-w take and max-w never refuses", () => {
    assert.equal(problemsOf("w-sm w-7xl min-w-md min-w-3xs").length, 3)
    assert.deepEqual(problemsOf("w-2xs w-3xs max-w-xl max-w-7xl"), [])
  })

  it("refuses a vh length in any arbitrary value and allows svh, dvh and lvh", () => {
    assert.equal(
      problemsOf("top-[50vh] py-[10vh] h-[calc(100vh-4rem)] [height:100vh]")
        .length,
      4
    )
    assert.deepEqual(
      problemsOf("h-svh h-[100svh] min-h-[calc(100dvh-4rem)] top-[50lvh]"),
      []
    )
  })
})
