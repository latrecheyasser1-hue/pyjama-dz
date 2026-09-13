/**
 * Smart Size Recommender for Pyjama-DZ
 * Estimates the optimal clothing size based on height, weight, and fit preference.
 */

export function calculateRecommendedSize({
  height,
  weight,
  fitPreference = 'relaxed',
  availableSizes = []
}) {
  const h = Number(height);
  const w = Number(weight);

  if (!h || !w || h < 130 || h > 220 || w < 35 || w > 180) {
    return {
      recommendedSize: null,
      secondarySize: null,
      bodyType: 'regular',
      fitNote: 'يرجى إدخال طول ووزن صحيحين لحساب المقاس المناسب'
    };
  }

  // Calculate BMI to estimate body frame
  const heightInMeters = h / 100;
  const bmi = w / (heightInMeters * heightInMeters);

  let rawSize = 'M';
  let bodyType = 'regular';

  // Standard female clothing distribution
  if (w <= 52) {
    rawSize = h > 168 ? 'M' : 'S';
    bodyType = 'slim';
  } else if (w <= 62) {
    rawSize = bmi > 24 ? 'L' : 'M';
    bodyType = 'slim';
  } else if (w <= 73) {
    rawSize = bmi > 27 ? 'XL' : 'L';
    bodyType = 'regular';
  } else if (w <= 84) {
    rawSize = bmi > 30 ? '2XL' : 'XL';
    bodyType = 'curvy';
  } else if (w <= 96) {
    rawSize = bmi > 34 ? '3XL' : '2XL';
    bodyType = 'curvy';
  } else {
    rawSize = '3XL';
    bodyType = 'plus';
  }

  // Adjust for relaxed nightwear fit preference (pyjamas are preferred loose)
  if (fitPreference === 'relaxed') {
    if (rawSize === 'S') rawSize = 'M';
  }

  // Standardize size tokens
  const normalizeSize = (s) => {
    if (!s) return '';
    const cleaned = String(s).trim().toUpperCase();
    if (cleaned === 'XXL') return '2XL';
    if (cleaned === 'XXXL') return '3XL';
    return cleaned;
  };

  const normalizedAvailable = Array.isArray(availableSizes) && availableSizes.length > 0
    ? availableSizes.map(s => ({ original: s, normalized: normalizeSize(s) }))
    : [];

  let matchedSize = rawSize;
  let secondarySize = null;

  if (normalizedAvailable.length > 0) {
    // Check if available sizes has the exact match
    const exact = normalizedAvailable.find(item => item.normalized === rawSize);
    if (exact) {
      matchedSize = exact.original;
    } else {
      // Find closest size in available sizes
      const sizeRank = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, '2XL': 6, 'XXL': 6, '3XL': 7, 'XXXL': 7, '4XL': 8 };
      const targetRank = sizeRank[rawSize] || 3;

      let closest = normalizedAvailable[0];
      let minDiff = 999;

      normalizedAvailable.forEach(item => {
        const rank = sizeRank[item.normalized] || 3;
        const diff = Math.abs(rank - targetRank);
        if (diff < minDiff) {
          minDiff = diff;
          closest = item;
        }
      });

      matchedSize = closest?.original || normalizedAvailable[0].original;
    }
  }

  // Notes in Arabic without emojis
  let fitNote = `المقاس المقترح بناءً على طولك (${h} سم) ووزنك (${w} كغ) هو ${matchedSize}.`;
  if (bodyType === 'slim') {
    fitNote += ' يعطيك قصة أنيقة ومناسبة لقوامك.';
  } else if (bodyType === 'curvy' || bodyType === 'plus') {
    fitNote += ' يمنحك راحة تامة وحرية حركة أثناء النوم.';
  } else {
    fitNote += ' هذا المقاس مريح ومتناسق مع قوامك.';
  }

  return {
    recommendedSize: matchedSize,
    secondarySize,
    bodyType,
    bmi: Math.round(bmi * 10) / 10,
    fitNote
  };
}
