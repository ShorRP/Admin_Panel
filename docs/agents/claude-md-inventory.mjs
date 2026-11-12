import { readFileSync, writeFileSync } from "node:fs"

const [, , source = "CLAUDE.md", target = "docs/agents/claude-md-inventory.md"] =
  process.argv

const STAYS = "aucun : reste"
const PLUGIN = "plugin agent-workflow : reste"
const HISTORY = "aucun : intro de section"
const OUTSIDE = "hors dépôt"

const PLACES = {
  3: [STAYS, "description du panel, nomme chaque route de `src/app/`"],
  7: [STAYS],
  9: [STAYS],
  11: [STAYS],
  12: [STAYS],
  13: [STAYS],
  14: [STAYS],
  15: [STAYS],
  17: [STAYS],
  19: [STAYS],
  20: [STAYS],
  21: [STAYS],
  22: [STAYS],
  23: [STAYS],
  24: [STAYS],
  28: [STAYS],
  32: [STAYS],
  34: [STAYS],
  36: ["`scripts/check-comments.mjs`, `.claude/hooks/`, `test/check-comments.test.mjs`"],
  38: ["`scripts/check-comments.mjs`"],
  40: ["`scripts/check-comments.mjs`"],
  42: ["`scripts/check-comments.mjs`"],
  44: ["`scripts/check-comments.mjs`"],
  48: [PLUGIN],
  49: [PLUGIN],
  50: [PLUGIN],
  51: [PLUGIN],
  52: [PLUGIN],
  53: [PLUGIN],
  54: [PLUGIN],
  55: [PLUGIN],
  59: [STAYS, "règle d'or, détail dans `docs/costs.md`"],
  61: [STAYS, "`docs/costs.md`"],
  62: [STAYS],
  63: [STAYS, "`docs/costs.md`"],
  64: [STAYS],
  65: [STAYS, "`docs/costs.md`"],
  69: [HISTORY],
  71: [STAYS, "plan de `src/`"],
  72: ["`src/discord/`", "dont `getGuild`/`listChannels` pour `src/staff/can-view-channel.ts`"],
  73: [STAYS, "`src/app/`, `src/proxy.ts`, `src/instrumentation.ts`"],
  74: ["`src/staff/`, `src/app/(staff)/`", "cite `/records`, `/game-log`, `/bot-log`"],
  75: ["`src/staff/can-view-channel.ts`"],
  76: [STAYS, "`src/*/actions.ts`"],
  77: [STAYS],
  78: [STAYS, "dont `StatefulThemeToggle` de `src/staff/`"],
  79: ["`src/app/`", "principe `use cache` général, détail des pages"],
  80: ["`src/proxy.ts`"],
  81: [STAYS, "`tsconfig.json`, `vitest.config.mts`"],
  85: [HISTORY],
  87: [STAYS],
  88: ["`src/discord/discord-error.ts`"],
  89: ["`src/discord/`"],
  90: ["`src/blocked-words/`, `src/sanctions/`", "voir le découpage fin"],
  91: ["`src/app/error.tsx`, plusieurs domaines", "voir le découpage fin"],
  92: ["`src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`, `error-notice.tsx`, `src/ui/report-channel-link.tsx`"],
  93: [STAYS],
  97: [HISTORY],
  99: [STAYS],
  100: ["`src/discord/fake-discord.ts`", "et les aides de test de `src/ticket-archives/`, `src/support-tickets/`, `src/game-log/`, `src/bot-log/` ; voir le découpage fin"],
  101: ["`src/discord/http-adapter.ts`"],
  102: [STAYS],
  103: ["`src/staff/`"],
  104: ["`src/discord/discord-api-contract.ts`, `vitest.contract.config.mts`"],
  105: ["`src/discord/`"],
  106: [STAYS, "cite `StaffHeader` de `src/staff/`"],
  107: ["`src/ui/globals.test.ts`, `src/ui/globals.css`"],
  108: ["`src/monitoring/`"],
  109: ["`src/proxy.ts`, `src/staff/redirect-without-session`"],
  110: ["`e2e/`, `playwright.config.ts`", "fixtures et flux de chaque page ; voir le découpage fin"],
  114: [HISTORY, "pointe vers `docs/design/hydromel/`"],
  116: [STAYS],
  117: [STAYS, "`src/ui/globals.css`"],
  118: ["`src/ui/`, `components.json`"],
  119: ["`src/ui/` (composants copiés)"],
  120: ["`src/ui/`", "voir le découpage fin"],
  121: ["`src/ui/globals.css`, `src/ui/theme.ts`, `src/staff/`, `src/app/icon.svg`", "et badges de `src/records/`, notices de `src/sanctions/` ; voir le découpage fin"],
  122: ["`src/ui/globals.css`"],
  123: [STAYS, "résumé par page des largeurs, recoupe **Responsive**"],
  124: ["`src/staff/staff-header.tsx`, `src/app/(staff)/layout.tsx`", "et pages du journal d'audit, des fiches, coût des lectures ; voir le découpage fin"],
  125: ["`src/staff/login-notice.tsx`, `src/staff/public-page-frame.tsx`, `src/app/login/`"],
  126: ["`src/privacy-policy/`, `src/app/privacy/`"],
  127: ["`src/ticket-archives/`, `src/support-tickets/`, `src/app/(staff)/support-tickets/`"],
  128: ["`src/ticket-archives/`"],
  129: ["`src/ticket-archives/`"],
  130: ["`src/ticket-archives/`"],
  131: ["`src/ticket-archives/`"],
  132: ["`src/ticket-archives/`, `src/records/resolve-accounts.ts`"],
  133: ["`src/ticket-archives/`"],
  134: ["`src/ticket-archives/`"],
  135: ["`src/ticket-archives/`"],
  136: ["`src/ticket-archives/`, `src/support-tickets/`"],
  137: [STAYS],
  138: [STAYS, "`src/ui/paris-time`, `src/ui/paris-day.tsx`"],
  139: [STAYS, "principe des variantes ; détail par domaine, voir le découpage fin"],
  140: ["`src/blocked-words/`, `src/sanctions/`, `src/ui/toast.tsx`", "voir le découpage fin"],
  141: [STAYS],
  142: [STAYS],
  143: [STAYS],
  144: ["squelettes de chaque domaine, `src/ui/suspense-with-skeleton`", "voir le découpage fin"],
  145: ["`src/ui/globals.css`, `src/ui/toast.tsx`, `src/ui/dialog-motion.ts`", "voir le découpage fin"],
  146: ["`src/ui/member-avatar`, `src/discord/member-avatar-url.ts`, `src/records/record-href.ts`", "voir le découpage fin"],
  147: [STAYS, "niveau AA ; la liste des ratios va avec `src/ui/globals.test.ts`"],
  148: ["`eslint.config.mjs`"],
  152: [STAYS, "pointe vers `docs/responsive.md`"],
  154: [STAYS],
  155: ["`src/staff/staff-header.tsx`"],
  156: [STAYS, "règle des 44 px ; détail de `src/ui/` et de `src/staff/`"],
  157: ["`src/ui/`"],
  158: ["`eslint-rules/responsive-classes.mjs`", "et principes de mise en page"],
  159: ["`src/ui/filter-*`, `src/audit-log/`, `src/records/`"],
  160: ["`src/ui/dialog.tsx`, `src/ui/sheet.tsx`"],
  161: ["`src/blocked-words/`, `e2e/blocked-words-touch.test.ts`"],
  162: ["`src/audit-log/`, `src/records/`"],
  163: ["`src/ticket-archives/`"],
  164: ["`src/staff/`, `src/ui/`, `src/app/layout.tsx`"],
  165: ["`e2e/responsive.test.ts`"],
  169: [PLUGIN],
  171: [HISTORY],
  173: ["`src/staff/` (session)"],
  174: ["`src/staff/` (session)"],
  175: ["`src/staff/`, `src/discord/` (OAuth), `src/app/login/`"],
  176: [STAYS],
  177: ["`next.config.ts`"],
  178: [OUTSIDE, "pare-feu Vercel"],
  179: [OUTSIDE, "rôles et intents Discord ; touche chaque domaine qui lit un salon"],
  180: [STAYS, "`server-only`, `vitest.config.mts`"],
  181: [STAYS, "pointe vers `docs/personal-data.md`"],
  182: ["`.github/workflows/contract.yml`"],
  183: ["`src/*/env.ts`, `next.config.ts`"],
  184: ["`src/*/env.ts`, `.env.example`"],
  188: [HISTORY],
  190: [STAYS],
  191: ["`src/monitoring/`, `src/proxy.ts`"],
  192: [STAYS, "ce qui ne se journalise jamais"],
  193: ["`src/monitoring/`"],
  194: ["`src/monitoring/`"],
  195: ["`src/monitoring/`"],
  196: ["`src/monitoring/`"],
  197: ["`src/monitoring/`, `src/instrumentation.ts`"],
  198: ["`src/monitoring/`"],
  199: ["`src/monitoring/`"],
  200: ["`src/monitoring/`"],
  204: [HISTORY],
  206: ["`prettier.config.mjs`, `.prettierignore`"],
  207: ["`prettier.config.mjs`"],
  208: ["`prettier.config.mjs`"],
  209: ["`prettier.config.mjs`"],
  210: ["`src/ui/` (composants copiés)"],
  211: ["`.claude/hooks/format-after-edit.mjs`, `.github/workflows/ci.yml`"],
  212: [STAYS],
  213: [STAYS],
  214: [STAYS],
  215: [STAYS],
  219: [HISTORY],
  221: ["`eslint.config.mjs`"],
  222: ["`eslint.config.mjs`"],
  223: ["`tsconfig.json`"],
  224: ["`.github/workflows/ci.yml`"],
  225: ["`.github/workflows/ci.yml`"],
  226: ["`vitest.config.mts`, `test/`"],
  227: ["`e2e/fixtures.ts`"],
  228: ["`.github/workflows/ci.yml`"],
  229: [STAYS],
  230: ["`scripts/check-comments.mjs`, `eslint.config.mjs`"],
  231: [STAYS],
  235: [HISTORY],
  237: ["`package.json`, `pnpm-workspace.yaml`"],
  238: ["`.claude/skills/update-dependencies/`"],
  239: ["`package.json`, `pnpm-workspace.yaml`"],
  240: ["`pnpm-workspace.yaml`"],
  241: ["`package.json`"],
  242: ["`package.json`"],
  243: ["`.claude/skills/update-dependencies/`", "et les citations de `CLAUDE.md` et des ADR"],
  244: ["`.claude/rules/dependencies.md`"],
  245: ["`package.json`"],
  246: ["`package.json`"],
  247: ["`.github/workflows/`"],
  248: ["`.github/workflows/ci.yml`, `pnpm-workspace.yaml`"],
  249: ["`.github/workflows/ci.yml`, `package.json`"],
  250: ["`pnpm-lock.yaml`"],
  251: ["`pnpm-lock.yaml`"],
  252: ["`src/ui/` (composants copiés)"],
  253: [STAYS, "avant tout `pnpm add`"],
  254: [STAYS, "`THIRD_PARTY_NOTICES.md`"],
  255: ["`.claude/skills/update-dependencies/`"],
  259: [HISTORY],
  261: [OUTSIDE, "réglages du dépôt GitHub, `SECURITY.md`, `THIRD_PARTY_NOTICES.md`"],
  262: [STAYS, "pointe vers `docs/agents/issue-tracker.md`"],
  263: ["`.github/workflows/ci.yml`"],
  264: ["`.github/workflows/ci.yml`"],
  265: ["`.github/workflows/contract.yml`"],
  266: [OUTSIDE, "ruleset GitHub"],
  267: [OUTSIDE, "Vercel, `.env.local`"],
  268: [OUTSIDE, "Vercel"],
  269: [OUTSIDE, "Vercel"],
  270: [OUTSIDE, "Vercel"],
  271: ["`.github/workflows/`"],
  272: [OUTSIDE, "historique du projet Vercel"],
  276: [STAYS],
  277: [STAYS, "`vitest.contract.config.mts`"],
  278: [STAYS],
  279: [STAYS],
  280: [STAYS, "`eslint.config.mjs`"],
  281: [STAYS],
  282: [STAYS],
  283: [STAYS],
  284: ["`src/ui/`, `components.json`"],
  285: [STAYS, "`.github/workflows/ci.yml`"],
  289: [STAYS],
  290: [STAYS],
  291: [STAYS],
  292: [STAYS],
  293: [STAYS],
  294: [STAYS],
  295: [STAYS],
  299: [STAYS, "index des règles de `.claude/rules/`"],
  301: [STAYS],
  302: [STAYS],
  303: [STAYS],
  304: [STAYS],
  305: [STAYS],
  311: [STAYS, "écrit par `setup-matt-pocock-skills`"],
  315: [STAYS, "écrit par `setup-matt-pocock-skills`"],
  319: [STAYS, "écrit par `setup-matt-pocock-skills`"],
}

const DOMAINS = [
  ["`src/game-log/`", /game.log|journal du jeu|GAME_LOG|gameLog/i],
  ["`src/bot-log/`", /bot.log|journal du Bot|BOT_LOG|log-admin|botLog/i],
  ["`src/support-tickets/`", /support-tickets\/|tickets? in progress|readOpenSupportTickets|TICKET_CATEGORY|supportTicketChannel|OpenSupportTickets|tickets category/i],
  ["`src/ticket-archives/`", /ticket.archive|archives channel|TicketArchive|archiveMessage|request kind|support tickets' page|\/support-tickets|opener|closer/i],
  ["`src/audit-log/`", /audit.log's|\/audit-log|AuditLog|readAuditLog|joinActionChanges|« Plus anciens »|« Exclusions »|journal d’audit|ChangeType/i],
  ["`src/blocked-words/`", /blocked.words?|BlockedWord|mots? interdits?|capacity gauge|keyword rule|panel's rules?/i],
  ["`src/sanctions/`", /sanction|time(s|d)? (them )?out|timeouts?|kick|\bban|banned|« Expulser »|« Bannir »|direct message/i],
  ["`src/records/`", /\/records|records?\b|list of accounts|AccountSearch|AccountList|StandingBadge|RoleBadge|listAccounts|accounts listed/i],
  ["`src/privacy-policy/`", /privacy|PrivacyPolicy/i],
  ["`src/staff/`", /staff check|requireStaffMember|StaffMember|StaffHeader|sidebar|navigation|\/login|login|session|ThemeToggle|theme toggle|data-theme|\brail\b|the bar\b|canViewChannel|viewsChannel|OAuth/i],
  ["`src/monitoring/`", /monitor|alert|webhook|onRequestError|instrumentation/i],
  ["`src/discord/`", /src\/discord|DiscordApi|DiscordError|the fake|fake's|contract suite|HTTP adapter|adapter|searchMessages|listChannels|listMessages|getMember/i],
  ["`src/app/` (pages d'erreur)", /error\.tsx|not-found|global-error|error page|ErrorNotice|« Réessayer »/i],
  ["`src/ui/`", /src\/ui|globals\.css|shadcn|Base UI|copied|Tailwind|contrast|oklch|palette|Skeleton|ViewTransition|view transition|Toast|toast|Dialog|Sheet|EB Garamond|lucide|FilterSheet|FilterChips|TextLink|Pagination/i],
  ["`e2e/` (infrastructure)", /Playwright|fixture|checkAccessibility|\baxe\b|holdDiscord|prefetchedPaths|console|webServer|Chromium/i],
  ["`.github/` et Vercel", /\bCI\b|ci\.yml|workflow|Vercel|runner/i],
  ["`next.config.ts`, `src/proxy.ts`", /proxy\.ts|next\.config|Content Security|testProxy/i],
]

const FINE_LINES = new Set([
  90, 91, 100, 110, 120, 121, 124, 139, 140, 144, 145, 146, 184,
])

function folderOf(place) {
  const path = place.match(/`([^`]+)`/)?.[1]
  if (!path) return null
  if (path.startsWith("src/*/")) return path
  const [top, second] = path.split("/")
  if (top === "src") return second?.includes(".") ? path : `src/${second}/`
  if (path.includes("/")) return `${top}/`
  return path
}

const bytes = (text) => Buffer.byteLength(text, "utf8")

function domainOf(sentence) {
  let best = null
  let bestHits = 0
  for (const [name, pattern] of DOMAINS) {
    const hits = (
      sentence.match(new RegExp(pattern.source, pattern.flags + "g")) ?? []
    ).length
    if (hits > bestHits) {
      best = name
      bestHits = hits
    }
  }
  return best ?? "aucun domaine reconnu"
}

function sentencesOf(text) {
  return text.split(/(?<=\.)\s+(?=[A-Z«`*(_])|;\s+(?=[a-z«`])/)
}

function labelOf(line) {
  const bold = line.match(/^\s*- \*\*(.+?)\*\*/)
  if (bold) return bold[1].replace(/\.$/, "")
  const plain = line.replace(/^\s*-\s*/, "")
  return plain.length > 60 ? `${plain.slice(0, 57)}…` : plain
}

const escapeCell = (text) => text.replaceAll("|", "\\|")

const lines = readFileSync(source, "utf8").split("\n")
if (lines.at(-1) === "") lines.pop()

const sections = []
let current = { title: "(en-tête)", line: 1, rows: [], bytes: 0, lines: 0 }
sections.push(current)
lines.forEach((text, index) => {
  const number = index + 1
  const size = bytes(text) + 1
  if (/^#{2,3} /.test(text)) {
    current = {
      title: text.replace(/^#+ /, ""),
      line: number,
      rows: [],
      bytes: 0,
      lines: 0,
    }
    sections.push(current)
  }
  current.bytes += size
  current.lines += 1
  if (text.trim() === "" || /^#/.test(text)) return
  const place = PLACES[number]
  if (!place) throw new Error(`line ${number} has no place`)
  current.rows.push({ number, size, text, place })
})

const total = { bytes: bytes(lines.join("\n")) + 1, lines: lines.length }
const byKind = new Map()
for (const section of sections) {
  for (const row of section.rows) {
    const [where] = row.place
    const kind = where.startsWith("plugin")
      ? "plugin agent-workflow"
      : where === STAYS
        ? "aucun dossier (candidat à rester)"
        : where === HISTORY
          ? "intro de section (historique)"
          : where === OUTSIDE
            ? "hors dépôt (Vercel, GitHub, Discord)"
            : "un dossier ou un chemin"
    byKind.set(kind, (byKind.get(kind) ?? 0) + row.size)
  }
}

const out = []
out.push("# Inventaire des passages de CLAUDE.md par dossier")
out.push("")
out.push(
  `Mesuré sur \`CLAUDE.md\` de \`${process.env.SOURCE_COMMIT ?? "?"}\` par \`node docs/agents/claude-md-inventory.mjs CLAUDE.md docs/agents/claude-md-inventory.md\` (ticket #422, carte #421). Les tailles sont des octets UTF-8, saut de ligne compris ; une ligne est une ligne physique du fichier.`
)
out.push("")
out.push("## Faits mesurés")
out.push("")
out.push(
  `- \`CLAUDE.md\` : ${total.bytes} octets, ${total.lines} lignes. Chaque paragraphe et chaque puce tient sur une seule ligne physique : le plafond de 200 lignes n'est donc pas la contrainte, les octets le sont.`
)
out.push(
  "- Toutes les règles de `.claude/rules/` portent un `paths:` (`head -5 .claude/rules/*.md`) : `CLAUDE.md` est seul à être toujours chargé."
)
out.push("")
out.push("### Par section")
out.push("")
out.push("| Section | Ligne | Octets | Lignes |")
out.push("| --- | ---: | ---: | ---: |")
for (const section of sections) {
  out.push(
    `| ${escapeCell(section.title)} | ${section.line} | ${section.bytes} | ${section.lines} |`
  )
}
out.push("")
out.push("### Par sorte de passage")
out.push("")
out.push(
  "Somme des passages (titres et lignes vides exclus) selon la colonne « Dossiers ou chemins » des tableaux ci-dessous, qui est une attribution, pas une mesure."
)
out.push("")
out.push("| Sorte | Octets |")
out.push("| --- | ---: |")
for (const [kind, size] of [...byKind].sort((a, b) => b[1] - a[1])) {
  out.push(`| ${kind} | ${size} |`)
}
const byFolder = new Map()
const add = (folder, size) =>
  byFolder.set(folder, (byFolder.get(folder) ?? 0) + size)
const sharesOf = (text) => {
  const shares = new Map()
  for (const sentence of sentencesOf(text)) {
    const domain = domainOf(sentence)
    shares.set(domain, (shares.get(domain) ?? 0) + bytes(sentence))
  }
  return shares
}
for (const section of sections) {
  for (const row of section.rows) {
    const [where] = row.place
    if (FINE_LINES.has(row.number)) {
      for (const [domain, size] of sharesOf(row.text)) {
        add(folderOf(domain) ?? "aucun domaine reconnu (estimé)", size)
      }
    } else {
      add(folderOf(where) ?? where, row.size)
    }
  }
}
out.push("### Par dossier")
out.push("")
out.push(
  "Ce qui partirait vers chaque dossier si chaque passage suivait le premier chemin de sa colonne « Dossiers ou chemins », et, pour les passages du découpage fin, les domaines estimés de leurs phrases. Ce sont des ordres de grandeur pour la liste des règles scopées, pas des tailles de règles : une règle scopée ne garde que ce qu'il faut pour écrire du code juste, la référence part dans `docs/` (carte #421, **Notes**)."
)
out.push("")
out.push("| Dossier ou sorte | Octets |")
out.push("| --- | ---: |")
for (const [folder, size] of [...byFolder].sort((a, b) => b[1] - a[1])) {
  out.push(`| ${folder} | ${size} |`)
}
out.push("")
out.push("## Passage par passage")
out.push("")
out.push(
  "« aucun : reste » marque un passage qui ne relève d'aucun dossier, candidat à rester toujours chargé ; « plugin agent-workflow : reste », un passage du plugin, qui reste (carte #421, **Notes**) ; « aucun : intro de section », l'introduction d'une section, qui dit qui l'a décidée et quand ; « hors dépôt », un passage qui décrit un réglage de Vercel, de GitHub ou de Discord. L'attribution est celle de l'agent, à la lecture du passage."
)
for (const section of sections) {
  if (section.rows.length === 0) continue
  out.push("")
  out.push(`### ${section.title}`)
  out.push("")
  out.push("| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |")
  out.push("| ---: | --- | ---: | --- | --- |")
  for (const row of section.rows) {
    const [where, remark = ""] = row.place
    const label = /^\s*-/.test(row.text) ? labelOf(row.text) : "(paragraphe)"
    out.push(
      `| ${row.number} | ${escapeCell(label)} | ${row.size} | ${escapeCell(where)} | ${escapeCell(remark)} |`
    )
  }
}
out.push("")
out.push("## Découpage fin des passages transverses")
out.push("")
out.push(
  "Estimation, pas mesure du sens, pour les passages qui parlent de plusieurs domaines (`FINE_LINES`, dans le script) : chaque passage est coupé en phrases (au point suivi d'une majuscule, et au point-virgule suivi d'une minuscule), et chaque phrase va au domaine dont les mots-clés (`DOMAINS`) y reviennent le plus souvent. Le domaine est la fonctionnalité dont la phrase parle, pas le fichier qui la porte : une phrase de **The fake** sur les bannissements compte pour `src/sanctions/`, bien que le code soit dans `src/discord/fake-discord.ts`. Une phrase qui parle de deux domaines va à un seul, et les phrases de plusieurs centaines d'octets pèsent lourd : les tickets « Ce qui reste dans CLAUDE.md » et « La liste des règles scopées et leurs `paths:` » relisent ces passages au lieu de se fier aux chiffres."
)
for (const section of sections) {
  for (const row of section.rows) {
    if (!FINE_LINES.has(row.number)) continue
    const shares = sharesOf(row.text)
    out.push("")
    out.push(
      `### Ligne ${row.number}, ${escapeCell(section.title)} : ${escapeCell(/^\s*-/.test(row.text) ? labelOf(row.text) : "(paragraphe)")} (${row.size} octets)`
    )
    out.push("")
    out.push("| Domaine estimé | Octets |")
    out.push("| --- | ---: |")
    for (const [domain, size] of [...shares].sort((a, b) => b[1] - a[1])) {
      out.push(`| ${domain} | ${size} |`)
    }
  }
}
out.push("")

writeFileSync(target, out.join("\n"))
