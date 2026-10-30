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
      className="whitespace-nowrap text-foreground underline decoration-input underline-offset-3 hover:decoration-primary"
    >
      #{REPORT_CHANNEL.name}
    </a>
  )
}
