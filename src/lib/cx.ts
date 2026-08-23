type ClassValue = string | number | false | null | undefined;

/** Tiny className joiner - no runtime deps. */
export const cx = (...values: ClassValue[]) => values.filter(Boolean).join(" ");
