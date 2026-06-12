interface CenteredStateProps {
  className?: string;
}

export function CenteredState({
  children,
  className = '',
}: React.PropsWithChildren<CenteredStateProps>) {
  return (
    <div className={`relative z-10 mx-auto max-w-6xl px-4 py-32 text-center md:px-8 ${className}`}>
      <div className="flex flex-col items-center gap-4">{children}</div>
    </div>
  );
}
