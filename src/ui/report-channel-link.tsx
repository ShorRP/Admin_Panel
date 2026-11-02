import { cn } from "cn"

import { TEXT_LINK_CLASSES } from "@/ui/text-link"

const REPORT_CHANNEL = {
  name: "créer-ticket",
  url: "https://discord.com/channels/1545540661774913626/1550835033311412224",
}

export function ReportChannelLink() {
  return (
    <a
      href={REPORT_CHANNEL.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(TEXT_LINK_CLASSES, "whitespace-nowrap")}
    >
      #{REPORT_CHANNEL.name}
    </a>
  )
}
