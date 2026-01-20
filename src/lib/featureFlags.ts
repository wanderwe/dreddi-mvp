type GroupDealUser = {
  id: string;
  email?: string | null;
};

const normalizeAllowlist = (value: string | undefined) => {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
};

const groupDealsAllowlist = normalizeAllowlist(process.env.GROUP_DEALS_ALLOWLIST);

export const isGroupDealsEnabled = (user: GroupDealUser | null) => {
  if (!user) return false;
  if (!groupDealsAllowlist.size) return false;
  const id = user.id.toLowerCase();
  const email = user.email?.toLowerCase();
  return groupDealsAllowlist.has(id) || (email ? groupDealsAllowlist.has(email) : false);
};
