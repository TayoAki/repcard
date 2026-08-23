import { useEffect, useState } from "react";

/** Returns `value` after it has been stable for `delayMs`. */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
