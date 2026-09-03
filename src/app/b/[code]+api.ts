import { eq } from "drizzle-orm";
import { z } from "zod";

import { battles, db, profiles, user } from "@/db";
import { escapeHtml, htmlPage } from "@/lib/web/page";

const codeSchema = z.string().regex(/^[A-Z2-9]{6}$/);

/** PUBLIC HTML: battle invite. Opens the app to join, or pitches the app. */
export async function GET(_request: Request, { code }: Record<string, string>) {
  const up = (code ?? "").toUpperCase();
  if (!codeSchema.safeParse(up).success) return new Response("Not found", { status: 404 });

  const [battle] = await db
    .select({ status: battles.status, creatorId: battles.creatorId })
    .from(battles)
    .where(eq(battles.code, up))
    .limit(1);
  if (!battle) return new Response("Not found", { status: 404 });

  const [creator] = await db
    .select({ name: user.name, handle: profiles.handle })
    .from(user)
    .innerJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, battle.creatorId))
    .limit(1);

  const who = creator ? escapeHtml(creator.name) : "An athlete";
  const taken = battle.status !== "pending";

  const body = taken
    ? `<h1>This battle's already on</h1><p class="sub">The invite from ${who} has been claimed. Start your own in the app.</p>`
    : `<h1>${who} challenged you</h1>
<p class="sub">A 7-day streak battle on RepCard. Train more days than they do.</p>
<div class="grid"><div class="cell"><b>${escapeHtml(up)}</b><span>INVITE CODE</span></div></div>`;

  return new Response(
    htmlPage({
      title: taken ? "Battle claimed" : `${who} challenged you`,
      description: "A 7-day streak battle on RepCard.",
      deepLink: taken ? "repcard://" : `repcard://battle/join/${up}`,
      body,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
