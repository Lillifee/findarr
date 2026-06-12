export function StickyHeader({ children }: React.PropsWithChildren) {
  return (
    <div className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">{children}</div>
    </div>
  );
}
