/**
 * Server-side Expo push. Fire-and-forget semantics: a notification failure
 * must never fail the request that triggered it.
 */
export async function sendPush(tokens: string[], title: string, body: string) {
  const valid = tokens.filter((t) => t.startsWith("ExponentPushToken"));
  if (valid.length === 0) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid.map((to) => ({ to, title, body, sound: "default" }))),
    });
  } catch (error) {
    console.warn("push send failed:", error);
  }
}
