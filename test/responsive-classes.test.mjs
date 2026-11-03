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
    'const a = cva("", { variants: { size: { "w-96": "h-8" } } })',
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
      code: 'const a = cn("w-96")',
      errors: [{ messageId: "fixedWidth" }],
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
      code: 'const a = cva("grid grid-cols-3")',
      errors: [{ messageId: "fixedGrid" }],
    },
  ],
})

describe("problemsOf", () => {
  it("reads a variant inside brackets as one variant", () => {
    assert.deepEqual(problemsOf("min-[40rem]:w-[30rem]"), [])
  })

  it("leaves 20rem itself alone, as the 360 px screen holds it", () => {
    assert.deepEqual(problemsOf("w-80 min-w-[320px]"), [])
  })
})
