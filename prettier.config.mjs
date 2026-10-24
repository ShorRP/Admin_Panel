const config = {
  semi: false,
  trailingComma: "es5",
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  importOrder: [
    "<BUILTIN_MODULES>",
    "^react$|^react/",
    "^next$|^next/",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/",
    "^[.]",
  ],
  tailwindStylesheet: "./src/ui/globals.css",
  tailwindFunctions: ["cva", "cn"],
}

export default config
