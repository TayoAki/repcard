/**
 * Transactional email. With RESEND_API_KEY set, sends through Resend; without
 * it (local dev), the full message is emitted as a structured log so flows
 * like password reset stay end-to-end testable from the server console.
 */
import { logEvent, reportError } from "@/server/log";

const FROM = process.env.EMAIL_FROM ?? "RepCard <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      // Never write reset links (or any mail body) into production logs -
      // a token in a log drain is a password takeover. Fail loudly instead.
      const error = new Error("RESEND_API_KEY is not configured");
      reportError("email/send", error, { to, subject });
      throw error;
    }
    // Dev keeps the full message visible so flows stay end-to-end testable.
    logEvent("email_logged_not_sent", { to, subject, text });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    logEvent("email_sent", { to, subject });
  } catch (error) {
    reportError("email/send", error, { to, subject });
    throw error;
  }
}
