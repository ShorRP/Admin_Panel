import { cn } from "cn"
import { ExternalLink } from "lucide-react"

import { LOG_TRAILING_LINK_CLASSES } from "@/ui/log-layout"
import { TEXT_LINK_CLASSES } from "@/ui/text-link"

export function DiscordMessageLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(TEXT_LINK_CLASSES, LOG_TRAILING_LINK_CLASSES)}
    >
      Voir dans Discord
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
    </a>
  )
}
