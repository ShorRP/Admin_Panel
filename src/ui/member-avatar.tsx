import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar"

const INITIALS_WORDS = 2

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/)
  const named = words.filter((word) => /^[\p{L}\p{N}]/u.test(word))
  return (named.length > 0 ? named : words)
    .slice(0, INITIALS_WORDS)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase()
}

export function MemberAvatar({
  name,
  avatarUrl,
  size = "default",
  className,
}: {
  name: string
  avatarUrl: string | null
  size?: "default" | "sm"
  className?: string
}) {
  return (
    <Avatar aria-hidden size={size} className={className}>
      {avatarUrl !== null && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  )
}
