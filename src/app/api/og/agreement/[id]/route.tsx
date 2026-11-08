import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { lookupAgreementPreview } from "@/lib/agreementPreview";
import { formatKyivDate } from "@/lib/ai/kyivDate";
import { caseNumber } from "@/lib/ai/caseNumber";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { normalizeLocale } from "@/lib/i18n/locales";
import { loadFont } from "@/lib/ogFont";

// The picture a shared link to a public promise shows in Telegram, Facebook, X and the like.
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

const STATUS_TONE: Record<string, { bg: string; fg: string; border: string }> = {
  confirmed: { bg: "#e7f8ef", fg: "#0f7a4a", border: "#9fdcbf" },
  completed_by_promisor: { bg: "#e7f8ef", fg: "#0f7a4a", border: "#9fdcbf" },
  disputed: { bg: "#fdecee", fg: "#b42339", border: "#f3b3bd" },
  declined: { bg: "#fdecee", fg: "#b42339", border: "#f3b3bd" },
  expired: { bg: "#fdecee", fg: "#b42339", border: "#f3b3bd" },
};
const NEUTRAL_TONE = { bg: "#eef1f6", fg: "#334155", border: "#d5dbe5" };

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const locale = normalizeLocale(new URL(req.url).searchParams.get("locale")) ?? "uk";
  const t = createTranslator(locale, getMessages(locale));
  const preview = await lookupAgreementPreview(id);
  if (!preview) return new Response("Not found", { status: 404 });

  const status = t(`publicAgreement.status.${preview.uiStatus}`);
  const due = preview.dueAt
    ? t("publicAgreement.deadline", { date: formatKyivDate(new Date(preview.dueAt), locale === "uk" ? "uk-UA" : "en-US") })
    : null;
  const ruling = preview.verdict
    ? `${t("publicAgreement.dreddi.title")} · ${t(`publicAgreement.dreddi.verdict.${preview.verdict}`)}`
    : null;
  const caseLabel = preview.verdict ? t("arbitration.caseNumber", { number: caseNumber(preview.id) }) : null;
  const tone = STATUS_TONE[preview.uiStatus] ?? NEUTRAL_TONE;
  const title = preview.title.length > 110 ? `${preview.title.slice(0, 107)}…` : preview.title;

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
          padding: "64px 72px",
          fontFamily: "Inter",
          color: "#0b1220",
          background: "linear-gradient(135deg, #f6f8fb 0%, #eaf6f0 55%, #f1eefb 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={64} height={64} alt="" />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: 4, color: "#0f7a4a" }}>DREDDI</span>
              <span style={{ fontSize: 30, fontWeight: 600 }}>knows</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              padding: "10px 24px",
              borderRadius: 999,
              background: tone.bg,
              color: tone.fg,
              border: `2px solid ${tone.border}`,
            }}
          >
            {status}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {preview.executorName ? (
            <span style={{ fontSize: 32, color: "#475569" }}>{preview.executorName}</span>
          ) : null}
          <span style={{ fontSize: title.length > 60 ? 54 : 66, fontWeight: 600, lineHeight: 1.12 }}>{title}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28 }}>
          <span style={{ color: "#475569" }}>{due ?? ""}</span>
          {ruling ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {caseLabel ? <span style={{ color: "#64748b" }}>{caseLabel}</span> : null}
              <span
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  borderRadius: 14,
                  fontWeight: 600,
                  background: preview.verdict === "kept" ? "#ede9fe" : "#fdecee",
                  color: preview.verdict === "kept" ? "#5b21b6" : "#b42339",
                }}
              >
                {ruling}
              </span>
            </div>
          ) : null}
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
