import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getInviteCard } from "@/lib/quickDisputes/server";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { normalizeLocale } from "@/lib/i18n/locales";
import { loadFont } from "@/lib/ogFont";

// The picture an invite link shows in messengers: the question and who is calling, never the position.
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const locale = normalizeLocale(new URL(req.url).searchParams.get("locale")) ?? "uk";
  const t = createTranslator(locale, getMessages(locale));
  const card = await getInviteCard(token);
  if (!card) return new Response("Not found", { status: 404 });

  const question = clip(card.question, 140);
  const headline = t("decide.join.title", { nickname: card.nicknameA });
  const logo = await readFile(path.join(process.cwd(), "public", "dreddi-logo.svg"), "utf8");
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;
  const fonts = await Promise.all([loadFont(400), loadFont(600)])
    .then(([regular, bold]) => [
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: bold, weight: 600 as const, style: "normal" as const },
    ])
    .catch(() => undefined);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          fontFamily: "Inter",
          color: "#0b1220",
          background: "linear-gradient(135deg, #f6f8fb 0%, #eaf6f0 55%, #f1eefb 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={60} height={60} alt="" />
            <span style={{ fontSize: 30, fontWeight: 600 }}>{t("decide.title")}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span style={{ fontSize: question.length > 70 ? 48 : 60, fontWeight: 600, lineHeight: 1.15 }}>{question}</span>
        </div>
        <div style={{ display: "flex" }}>
          <span
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 14,
              fontSize: 26,
              fontWeight: 600,
              background: "#e7f8ef",
              color: "#0f7a4a",
              border: "2px solid #9fdcbf",
            }}
          >
            {headline}
          </span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" },
    }
  );
}
