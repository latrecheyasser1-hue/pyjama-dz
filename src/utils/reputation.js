export const getClientReputation = (phone, allOrders) => {
  if (!phone || !Array.isArray(allOrders)) return 'normal';
  
  const phoneNormalized = phone.trim().replace(/\s+/g, '');
  if (!phoneNormalized) return 'normal';

  const clientOrders = allOrders.filter(o => {
    const isPos = o.isPos || o.clientName === 'زبون المحل (بيع حضوري)' || o.commune === 'المتجر الحضوري';
    if (isPos || !o.phone) return false;
    return o.phone.trim().replace(/\s+/g, '') === phoneNormalized;
  });

  const livreeCount = clientOrders.filter(o => o.status === 'confirmee' || o.status === 'expediee' || o.status === 'livree').length;
  const annuleeCount = clientOrders.filter(o => o.status === 'annulee').length;
  const retourCount = clientOrders.filter(o => o.status === 'retour').length;

  const badOrdersCount = annuleeCount + retourCount;

  if (badOrdersCount - livreeCount >= 2) {
    return 'bad';
  } else if (livreeCount - badOrdersCount >= 5) {
    return 'good';
  }
  return 'normal';
};
