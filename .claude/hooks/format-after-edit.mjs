import fs from "node:fs"
import path from "node:path"
import * as prettier from "prettier"

function isInside(root, file) {
  const relative = path.relative(root, file)
  return !path.isAbsolute(relative) && relative.split(path.sep)[0] !== ".."
}

async function formatProjectFile(root, file) {
  if (!isInside(root, file)) return
  process.chdir(root)
  const info = await prettier.getFileInfo(file, {
    ignorePath: [
      path.join(root, ".gitignore"),
      path.join(root, ".prettierignore"),
    ],
    resolveConfig: true,
  })
  if (info.ignored || !info.inferredParser) return
  const options = await prettier.resolveConfig(file)
  const text = fs.readFileSync(file, "utf8")
  const formatted = await prettier.format(text, { ...options, filepath: file })
  if (formatted !== text) fs.writeFileSync(file, formatted)
}

let input = ""
for await (const chunk of process.stdin) input += chunk
const file = JSON.parse(input).tool_input.file_path
try {
  await formatProjectFile(process.env.CLAUDE_PROJECT_DIR, file)
} catch (error) {
  process.stderr.write(
    `Prettier could not format ${file}: ${error.message.split("\n")[0]}\n`
  )
  process.exitCode = 2
}
