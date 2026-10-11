/**
 * Utility to format prices cleanly without commas (virgule / فاصـلة).
 * e.g., 3200 => "3200" (instead of "3,200")
 */
export const formatPrice = (val) => {
  if (val === null || val === undefined) return '0';
  const cleanStr = typeof val === 'string' ? val.replace(/,/g, '').trim() : val;
  const num = Number(cleanStr);
  if (isNaN(num)) return '0';
  return String(Math.round(num));
};

export default formatPrice;
