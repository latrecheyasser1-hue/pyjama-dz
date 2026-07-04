export const getTopSellingProducts = (orders) => {
  const productCounts = {};
  
  orders.forEach(order => {
    if (order.status !== 'annulee' && order.status !== 'retour' && order.items) {
      order.items.forEach(item => {
        const title = item.product || 'Produit Inconnu';
        productCounts[title] = (productCounts[title] || 0) + (Number(item.qty) || 1);
      });
    }
  });

  return Object.keys(productCounts)
    .map(key => ({ name: key, sales: productCounts[key] }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5); // Top 5
};

export const getTopWilayas = (orders) => {
  const wilayaCounts = {};
  
  orders.forEach(order => {
    if (order.status !== 'annulee' && order.status !== 'retour') {
      const wilaya = order.wilaya || 'Inconnu';
      wilayaCounts[wilaya] = (wilayaCounts[wilaya] || 0) + 1;
    }
  });

  return Object.keys(wilayaCounts)
    .map(key => ({ name: key, value: wilayaCounts[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
};

export const getDeliveryStats = (orders) => {
  const stats = {
    nouvelle: 0,
    confirmee: 0,
    expediee: 0,
    livree: 0,
    annulee: 0,
    retour: 0
  };

  orders.forEach(order => {
    const status = order.status || 'nouvelle';
    if (stats[status] !== undefined) {
      stats[status]++;
    } else {
      stats[status] = 1;
    }
  });

  return [
    { name: 'Livrée', value: stats.livree || 0, fill: '#1F8A55' },
    { name: 'Expédiée', value: stats.expediee || 0, fill: '#3B82F6' },
    { name: 'Confirmée', value: stats.confirmee || 0, fill: '#F59E0B' },
    { name: 'Nouvelle', value: stats.nouvelle || 0, fill: '#8B5CF6' },
    { name: 'Retour/Annulée', value: (stats.annulee || 0) + (stats.retour || 0), fill: '#EF4444' }
  ].filter(stat => stat.value > 0);
};

export const getDeadStock = (products, orders) => {
  // Calculate total sold for each product
  const soldCounts = {};
  orders.forEach(order => {
    if (order.status !== 'annulee' && order.status !== 'retour' && order.items) {
      order.items.forEach(item => {
        soldCounts[item.productId || item.product] = (soldCounts[item.productId || item.product] || 0) + (Number(item.qty) || 1);
      });
    }
  });

  const deadStock = [];

  products.forEach(product => {
    // calculate total stock of the product across all variants
    let totalStock = 0;
    if (product.colorVariants) {
      product.colorVariants.forEach(variant => {
        if (variant.stock) {
          Object.values(variant.stock).forEach(qty => {
            totalStock += Number(qty) || 0;
          });
        }
      });
    }

    const sold = soldCounts[product.id] || soldCounts[product.title] || 0;

    // Condition for dead stock: 0 sales but has stock > 0
    if (sold === 0 && totalStock > 0) {
      deadStock.push({
        id: product.id,
        title: product.title,
        stock: totalStock,
        price: product.price
      });
    }
  });

  return deadStock.sort((a, b) => b.stock - a.stock);
};
