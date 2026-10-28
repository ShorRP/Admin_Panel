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
}: {
  name: string
  avatarUrl: string | null
}) {
  return (
    <Avatar aria-hidden>
      {avatarUrl !== null && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  )
}
