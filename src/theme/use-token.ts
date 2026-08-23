import { useColorScheme } from "nativewind";
import { palette, type TokenName } from "./tokens";

/** Raw hex for consumers that can't take a className (icons, native props). */
export function useToken(name: TokenName): string {
  const { colorScheme } = useColorScheme();
  return palette[colorScheme === "dark" ? "dark" : "light"][name];
}
