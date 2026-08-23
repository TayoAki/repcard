/** "Jade Q. Fox" -> "jadeqfox"; collisions get a numeric suffix at signup. */
export const toHandle = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || "athlete";
