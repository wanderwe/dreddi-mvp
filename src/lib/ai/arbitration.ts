// Server only. Arbitration with Dreddi is on wherever the server can call the model: on production
// once ANTHROPIC_API_KEY is set, locally with the lab. The lab page itself stays behind LAB_ENABLED.
export const ARBITRATION_ENABLED =
  process.env.LAB_ENABLED === "true" || Boolean(process.env.ANTHROPIC_API_KEY);
