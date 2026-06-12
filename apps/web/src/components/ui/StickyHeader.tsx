export function StickyHeader({ children }: React.PropsWithChildren) {
  return (
    <div className="sticky top-0 z-30 border-b border-gray-700/50 bg-gray-800/90 shadow-2xl backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">{children}</div>
    </div>
  );
}
