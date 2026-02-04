import type { TFunction } from "@/lib/i18n/t";

export type PromiseType = "deal" | "assignment";

export const normalizePromiseType = (value?: string | null): PromiseType =>
  value === "assignment" ? "assignment" : "deal";

export const getPromiseLabels = (t: TFunction, promiseType?: string | null) => {
  const normalized = normalizePromiseType(promiseType);

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
