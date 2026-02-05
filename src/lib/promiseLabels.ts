import type { TFunction } from "@/lib/i18n/t";

export const getPromiseLabels = (t: TFunction) => ({
  entity: t("promises.entity.deal"),
  entityLower: t("promises.entityLower.deal"),
  publicEntity: t("promises.entityPublic.deal"),
  newEntity: t("promises.entityNew.deal"),
  entityPlural: t("promises.entityPlural.deal"),
  creatorLabel: t("promises.roles.deal.creatorLabel"),
  creatorRole: t("promises.roles.deal.creator"),
  executorRole: t("promises.roles.deal.executor"),
});
