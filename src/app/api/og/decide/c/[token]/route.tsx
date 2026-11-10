import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getChatCard } from "@/lib/chatDisputes/server";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { normalizeLocale } from "@/lib/i18n/locales";
import { loadFont } from "@/lib/ogFont";

// The picture a chat dispute link shows in messengers: the situation and the two positions while it is
// open; the split and Dreddi's answer once decided.
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const locale = normalizeLocale(new URL(req.url).searchParams.get("locale")) ?? "uk";
  const t = createTranslator(locale, getMessages(locale));
  const card = await getChatCard(token);
  if (!card) return new Response("Not found", { status: 404 });

  const question = clip(card.question, 110);
  const decided = Boolean(card.verdict && card.split);
  const winner = card.verdict?.winner === "1" || card.verdict?.winner === "2" ? (Number(card.verdict.winner) as 1 | 2) : null;
  const logo = await readFile(path.join(process.cwd(), "public", "dreddi-logo.svg"), "utf8");
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;
  const fonts = await Promise.all([loadFont(400), loadFont(600)])
    .then(([regular, bold]) => [
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: bold, weight: 600 as const, style: "normal" as const },
    ])
    .catch(() => undefined);

  const row = (position: 1 | 2) => {
    const percent = position === 1 ? card.split?.percent1 : card.split?.percent2;
    const right = winner === position;
    return (
      <div
        key={position}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 22px",
          borderRadius: 14,
          fontSize: 28,
          fontWeight: right ? 600 : 400,
          background: right ? "#fdf1c7" : "#ffffffaa",
          border: right ? "2px solid #f2cf63" : "2px solid #e2e8f0",
        }}
      >
        <span style={{ display: "flex" }}>{`${right ? "✓  " : ""}${clip(card.positions[position], 60)}`}</span>
        {decided && <span style={{ display: "flex", fontWeight: 600 }}>{percent}%</span>}
      </div>
    );
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          fontFamily: "Inter",
          color: "#0b1220",
          background: "linear-gradient(135deg, #f6f8fb 0%, #eaf6f0 55%, #f1eefb 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={56} height={56} alt="" />
          <span style={{ fontSize: 30, fontWeight: 600 }}>{t("decide.title")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: question.length > 60 ? 42 : 52, fontWeight: 600, lineHeight: 1.15 }}>{question}</span>
          {row(1)}
          {row(2)}
        </div>
        {decided && card.verdict ? (
          // Who is right first, as in the chat; Dreddi's answer under it, whole when it fits.
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "16px 22px",
              borderRadius: 14,
              // Gold and green belong to the right side; a majority that got it wrong stays neutral, as on the page.
              background: card.majorityRight === false ? "#ffffffaa" : "#e7f8ef",
              border: card.majorityRight === false ? "2px solid #e2e8f0" : "2px solid #9fdcbf",
            }}
          >
            {/* The right side is already marked in its row: the box says whether the majority got it, or,
                with no single right side, what Dreddi found. Nothing is cut in the middle. */}
            <span style={{ display: "flex", fontSize: 28, fontWeight: 600, color: card.majorityRight === false ? "#0b1220" : "#0f7a4a" }}>
              {winner
                ? card.majorityRight !== null
                  ? card.majorityRight
                    ? t("decide.group.majorityRight")
                    : t("decide.group.majorityWrong")
                  : clip(t("decide.group.winner", { position: card.positions[winner] }), 90)
                : t(`decide.verdict.${card.verdict.winner}`)}
            </span>
            <span style={{ display: "flex", fontSize: 24, color: card.majorityRight === false ? "#334155" : "#1d3b2f", lineHeight: 1.3 }}>{clip(card.verdict.short_answer, 150)}</span>
          </div>
        ) : (
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
              {t("decide.format.chatHint")}
            </span>
          </div>
        )}
      </div>
    ),
    {
      ...SIZE,
      fonts,
      headers: { "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=600" },
    }
  );
}
