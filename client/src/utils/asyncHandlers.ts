export function asVoid<Args extends unknown[]>(
  handler: (...args: Args) => void | Promise<void>,
): (...args: Args) => void {
  return (...args: Args) => {
    void handler(...args);
  };
}
