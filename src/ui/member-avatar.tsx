import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar"

const INITIALS_WORDS = 2

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, INITIALS_WORDS)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase()
}

export function MemberAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl: string | null
  className?: string
}) {
  return (
    <Avatar aria-hidden className={className}>
      {avatarUrl !== null && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  )
}
