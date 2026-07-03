interface SelectionIndicatorProps {
  selected: boolean;
}

const CHECKMARK_SYMBOL = '✓';

export function SelectionIndicator({ selected }: SelectionIndicatorProps) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
        selected
          ? 'border-amber-300/60 bg-amber-300/20 text-amber-100'
          : 'border-zinc-700 bg-transparent text-transparent'
      }`}
    >
      {CHECKMARK_SYMBOL}
    </span>
  );
}
