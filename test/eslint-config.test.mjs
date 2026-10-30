import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { ESLint } from "eslint"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const eslint = new ESLint({ cwd: ROOT })

const banTsCommentMessages = async (directive) => {
  const [result] = await eslint.lintText(
    `${directive}\nexport const n: number = "x"\n`,
    { filePath: path.join(ROOT, "src", "probe.ts") }
  )
  return result.messages
    .filter((message) => message.ruleId === "@typescript-eslint/ban-ts-comment")
    .map((message) => message.message)
}

test("a lone @ts-expect-error passes the lint", async () => {
  assert.deepEqual(await banTsCommentMessages("// @ts-expect-error"), [])
})

test("@ts-ignore is refused by the lint", async () => {
  assert.equal((await banTsCommentMessages("// @ts-ignore")).length, 1)
})

test("@ts-nocheck is refused by the lint", async () => {
  assert.equal((await banTsCommentMessages("// @ts-nocheck")).length, 1)
})
