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

const AVATAR_COLORS = [
  'bg-amber-500/15 text-amber-300',
  'bg-rose-500/15 text-rose-300',
  'bg-sky-500/15 text-sky-300',
  'bg-emerald-500/15 text-emerald-300',
  'bg-violet-500/15 text-violet-300',
  'bg-pink-500/15 text-pink-300',
  'bg-cyan-500/15 text-cyan-300',
  'bg-lime-500/15 text-lime-300',
  'bg-orange-500/15 text-orange-300',
  'bg-fuchsia-500/15 text-fuchsia-300',
  'bg-teal-500/15 text-teal-300',
  'bg-indigo-500/15 text-indigo-300',
  'bg-red-500/15 text-red-300',
  'bg-purple-500/15 text-purple-300',
  'bg-blue-500/15 text-blue-300',
  'bg-green-500/15 text-green-300',
];

export function getAvatarColorClass(seed: string) {
  let hash = 5381;
  for (const char of seed) {
    hash = Math.trunc(hash * 33 + (char.codePointAt(0) ?? 0));
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
