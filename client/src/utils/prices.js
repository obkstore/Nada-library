// Offer helpers (mirror of server logic — values are never stored, always derived).
// effectivePrice is also stored on the doc (used for sorting/filters); these
// helpers keep every display consistent with it.
export function effectivePrice(p) {
  if (!p) return 0;
  return p.salePrice != null && Number(p.salePrice) > 0 ? Number(p.salePrice) : Number(p.price) || 0;
}

export function hasSale(p) {
  return p && p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price);
}

// Percentage badge, hidden when the discount is under 5% (never stored).
export function discountPct(p) {
  if (!hasSale(p)) return 0;
  return Math.round((Number(p.price) - Number(p.salePrice)) / Number(p.price) * 100);
}

export function showPctBadge(p) {
  return discountPct(p) >= 5;
}
