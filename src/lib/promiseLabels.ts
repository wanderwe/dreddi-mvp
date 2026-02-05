import type { TFunction } from "@/lib/i18n/t";

export type PromiseMode = "deal" | "request";

export const normalizePromiseMode = (value?: string | null): PromiseMode | null => {
  if (value === "deal" || value === "request") return value;
  if (value === null || value === undefined || value === "") return "deal";
  return null;
};

export const getPromiseLabels = (t: TFunction, promiseMode?: string | null) => {
  const normalized = normalizePromiseMode(promiseMode) ?? "deal";

  return {
    type: normalized,
    entity: t(`promises.entity.${normalized}`),
    entityLower: t(`promises.entityLower.${normalized}`),
    publicEntity: t(`promises.entityPublic.${normalized}`),
    newEntity: t(`promises.entityNew.${normalized}`),
    entityPlural: t(`promises.entityPlural.${normalized}`),
    creatorLabel: t(`promises.roles.${normalized}.creatorLabel`),
    creatorRole: t(`promises.roles.${normalized}.creator`),
    executorRole: t(`promises.roles.${normalized}.executor`),
  };
};
