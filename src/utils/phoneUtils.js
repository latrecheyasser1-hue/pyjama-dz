export const sanitizeAlgerianPhone = (input) => {
  if (!input) return '';
  // Only keep actual numeric digits 0-9 (Strict no conversion)
  let cleaned = String(input).replace(/\D/g, '');

  if (cleaned.startsWith('213') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned.substring(0, 10);
};

export const isValidAlgerianPhone = (phoneStr) => {
  if (!phoneStr) return false;
  const clean = String(phoneStr).replace(/\D/g, '');
  return /^0[567]\d{8}$/.test(clean);
};
