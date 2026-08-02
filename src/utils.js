export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function formatNumber(value) {
  const n = Math.floor(value);
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + formatNumber(-n);

  const tiers = [
    { limit: 1e15, suffix: "Qa" },
    { limit: 1e12, suffix: "T" },
    { limit: 1e9, suffix: "B" },
    { limit: 1e6, suffix: "M" },
    { limit: 1e3, suffix: "K" }
  ];

  for (const tier of tiers) {
    if (n >= tier.limit) {
      const scaled = n / tier.limit;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return scaled.toFixed(decimals) + tier.suffix;
    }
  }
  return String(n);
}
