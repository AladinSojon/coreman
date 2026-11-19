/** ৳1,234.50 — always two decimals, with thousands separators. */
export function formatPrice(value) {
  const n = Number(value ?? 0);
  return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

/** Sort clothing sizes S → XL; unknown sizes go last in their original order. */
export function sortSizes(sizes) {
  const rank = (s) => { const i = SIZE_ORDER.indexOf(String(s).toUpperCase()); return i < 0 ? 99 : i; };
  return [...sizes].sort((a, b) => rank(a) - rank(b));
}

export function isOnSale(product) {
  return product?.compareAtPrice != null && Number(product.compareAtPrice) > Number(product.basePrice);
}

export function discountPercent(product) {
  if (!isOnSale(product)) return 0;
  return Math.round((1 - Number(product.basePrice) / Number(product.compareAtPrice)) * 100);
}
