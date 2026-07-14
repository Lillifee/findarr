export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  const first = parts.at(0);

  if (first === undefined) {
    return '?';
  }
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }

  const last = parts.at(-1) ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
