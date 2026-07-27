export const sanitizeAlgerianPhone = (input) => {
  if (!input) return '';
  const azertyMap = {
    '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5',
    '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0',
    'É': '2', 'È': '7', 'À': '0', 'Ç': '9'
  };

  let cleaned = String(input)
    .split('')
    .map(ch => azertyMap[ch] !== undefined ? azertyMap[ch] : ch)
    .join('')
    .replace(/\D/g, '');

  if (cleaned.startsWith('213') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned.substring(0, 10);
};

export const isValidAlgerianPhone = (phoneStr) => {
  const clean = sanitizeAlgerianPhone(phoneStr);
  return /^0[567]\d{8}$/.test(clean);
};
