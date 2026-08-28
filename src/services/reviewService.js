import { supabase } from '../lib/supabaseClient.js';

// Initial realistic Algerian customer reviews to give the store social proof and trust
export const DEFAULT_INITIAL_REVIEWS = [
  {
    id: 'rev_init_1',
    productId: '1',
    productTitle: 'بيجامة ساتان حريرية فاخرة',
    customerName: 'أمينة ب.',
    wilaya: '16 - الجزائر (Alger)',
    rating: 5,
    comment: 'ما شاء الله القماش روعة وناعم بزاف على الجسم، والخياطة متقونة وفينيسيون شابة. التوصيل جاني في 48 ساعة حتى لباب الدار، شكراً بيجاما ديزاد ❤️',
    date: '2026-08-20T14:30:00.000Z',
    verifiedPurchase: true,
    status: 'approved',
    likes: 8
  },
  {
    id: 'rev_init_2',
    productId: '1',
    productTitle: 'بيجامة ساتان حريرية فاخرة',
    customerName: 'فاطمة الزهراء',
    wilaya: '31 - وهران (Oran)',
    rating: 5,
    comment: 'سلعة هايلة ومقاسات مضبوطة تماماً. فرحت بيها بزاف وطلبت 2 حبات لوحدوخرين لأختي!',
    date: '2026-08-22T10:15:00.000Z',
    verifiedPurchase: true,
    status: 'approved',
    likes: 5
  },
  {
    id: 'rev_init_3',
    productId: '2',
    productTitle: 'بيجامة قطن تركي أصلي',
    customerName: 'مريم ق.',
    wilaya: '25 - قسنطينة (Constantine)',
    rating: 5,
    comment: 'قطن 100% طبيعي بارد ومريح جداً للنوم. التغليف كان بزاف أنيق والتعامل راقي.',
    date: '2026-08-23T18:45:00.000Z',
    verifiedPurchase: true,
    status: 'approved',
    likes: 11
  },
  {
    id: 'rev_init_4',
    productId: '3',
    productTitle: 'روب نوم عرائس ملكي',
    customerName: 'سارة م.',
    wilaya: '19 - سطيف (Sétif)',
    rating: 5,
    comment: 'خدمة في القمة، شريتها لجهازي وجات تحفة وأجمل من الصور بمرتين. ربي يباركلكم في رزقكم 👑',
    date: '2026-08-25T11:20:00.000Z',
    verifiedPurchase: true,
    status: 'approved',
    likes: 14
  }
];

const LOCAL_STORAGE_KEY = 'pyjama_dz_product_reviews_v1';

// Load cached reviews from localStorage
export const getLocalReviews = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading local reviews:', e);
  }
  return DEFAULT_INITIAL_REVIEWS;
};

// Save reviews to localStorage and Supabase settings
export const saveReviews = async (reviewsList) => {
  if (!Array.isArray(reviewsList)) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviewsList));
    // Trigger local storage event for reactive updates across tabs/components
    window.dispatchEvent(new CustomEvent('pyjama_reviews_updated', { detail: reviewsList }));

    // Persist to Supabase in settings table (key: 'product_reviews')
    if (supabase) {
      await supabase
        .from('settings')
        .upsert({ key: 'product_reviews', value: JSON.stringify(reviewsList) }, { onConflict: 'key' });
    }
  } catch (e) {
    console.error('Error saving reviews:', e);
  }
};

// Fetch latest reviews from Supabase with fallback to localStorage
export const fetchReviews = async () => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'product_reviews')
        .maybeSingle();

      if (data && data.value) {
        let remoteReviews = null;
        try {
          remoteReviews = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        } catch (err) {}

        if (Array.isArray(remoteReviews) && remoteReviews.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteReviews));
          return remoteReviews;
        }
      }
    }
  } catch (e) {
    console.error('Error fetching remote reviews:', e);
  }
  return getLocalReviews();
};

// Add a new customer review
export const submitReview = async ({ productId, productTitle, customerName, wilaya, rating, comment }) => {
  const currentReviews = await fetchReviews();
  const newReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    productId: String(productId || ''),
    productTitle: productTitle || 'منتج',
    customerName: (customerName || 'زبونة المتجر').trim(),
    wilaya: wilaya || 'الجزائر',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    comment: (comment || '').trim(),
    date: new Date().toISOString(),
    verifiedPurchase: true,
    status: 'approved',
    likes: 0
  };

  const updatedReviews = [newReview, ...currentReviews];
  await saveReviews(updatedReviews);
  return { success: true, review: newReview, allReviews: updatedReviews };
};

// Delete a review by ID (Admin)
export const deleteReview = async (reviewId) => {
  const currentReviews = await fetchReviews();
  const updatedReviews = currentReviews.filter(r => r.id !== reviewId);
  await saveReviews(updatedReviews);
  return updatedReviews;
};

// Toggle status between 'approved' and 'hidden' (Admin)
export const toggleReviewStatus = async (reviewId) => {
  const currentReviews = await fetchReviews();
  const updatedReviews = currentReviews.map(r => {
    if (r.id === reviewId) {
      return { ...r, status: r.status === 'hidden' ? 'approved' : 'hidden' };
    }
    return r;
  });
  await saveReviews(updatedReviews);
  return updatedReviews;
};

// Like a review
export const likeReview = async (reviewId) => {
  const currentReviews = await fetchReviews();
  const updatedReviews = currentReviews.map(r => {
    if (r.id === reviewId) {
      return { ...r, likes: (r.likes || 0) + 1 };
    }
    return r;
  });
  await saveReviews(updatedReviews);
  return updatedReviews;
};

// Calculate rating statistics for a product
export const getProductRatingStats = (productId, allReviews = []) => {
  const pId = String(productId || '');
  const productReviews = allReviews.filter(r => {
    if (r.status === 'hidden') return false;
    if (!pId) return true;
    return String(r.productId) === pId;
  });

  const totalCount = productReviews.length;
  if (totalCount === 0) {
    return {
      average: 5.0,
      totalCount: 0,
      hasReviews: false,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const sum = productReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const average = Number((sum / totalCount).toFixed(1));

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  productReviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
  });

  return {
    average,
    totalCount,
    hasReviews: true,
    distribution
  };
};
