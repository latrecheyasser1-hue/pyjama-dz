import React, { useState, useEffect, useMemo } from 'react';
import { Star, ThumbsUp, MessageSquarePlus, CheckCircle2, ShieldCheck, X, Send } from 'lucide-react';
import { fetchReviews, submitReview, likeReview, getProductRatingStats } from '../services/reviewService.js';
import { ALGERIA_WILAYAS } from '../data/mockData.js';

export default function ProductReviewsSection({ product }) {
  const [reviews, setReviews] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [wilaya, setWilaya] = useState('16 - الجزائر (Alger)');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load reviews on mount and listen to updates
  useEffect(() => {
    let isMounted = true;
    fetchReviews().then(data => {
      if (isMounted) setReviews(data);
    });

    const handleReviewsUpdate = (e) => {
      if (e.detail) setReviews(e.detail);
    };
    window.addEventListener('pyjama_reviews_updated', handleReviewsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('pyjama_reviews_updated', handleReviewsUpdate);
    };
  }, []);

  const stats = useMemo(() => {
    return getProductRatingStats(product?.id, reviews);
  }, [product?.id, reviews]);

  const productReviews = useMemo(() => {
    const pId = String(product?.id || '');
    return reviews.filter(r => {
      if (r.status === 'hidden') return false;
      if (!pId) return true;
      return String(r.productId) === pId;
    });
  }, [product?.id, reviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await submitReview({
        productId: product?.id || '1',
        productTitle: product?.title || 'منتج',
        customerName: customerName.trim() || 'زبونة المتجر',
        wilaya,
        rating,
        comment
      });

      if (result.success) {
        setReviews(result.allReviews);
        setComment('');
        setCustomerName('');
        setSubmittedSuccess(true);
        setIsFormOpen(false);
        setTimeout(() => setSubmittedSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (reviewId) => {
    const updated = await likeReview(reviewId);
    setReviews(updated);
  };

  const getRatingLabel = (stars) => {
    switch (stars) {
      case 5: return 'ممتاز جداً 🌟 (Parfait)';
      case 4: return 'جيد جداً ✨ (Très bien)';
      case 3: return 'جيد 👍 (Bien)';
      case 2: return 'متوسط 😐 (Moyen)';
      case 1: return 'غير راضٍ 💔 (Mauvais)';
      default: return '';
    }
  };

  return (
    <section className="product-reviews-container animate-fade-in" aria-label="آراء وتقييمات الزبائن">
      {/* Header Row */}
      <div className="reviews-header-row">
        <div>
          <h3 className="reviews-section-title">
            <span>⭐</span> آراء وتقييمات الزبائن (Avis & Évaluations)
          </h3>
          <span style={{ fontSize: '0.86rem', color: '#64748B', fontWeight: 600, display: 'block', marginTop: '4px' }}>
            تجارب حقيقية من زبائن تم توصيل الطلبات إليهم وفحصها
          </span>
        </div>

        <button
          type="button"
          className="reviews-open-form-btn"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          {isFormOpen ? (
            <>
              <X size={16} /> إغلاق نموذج التقييم
            </>
          ) : (
            <>
              <MessageSquarePlus size={16} /> شاركي تجربتكِ وتقييمكِ ⭐
            </>
          )}
        </button>
      </div>

      {submittedSuccess && (
        <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '14px 18px', borderRadius: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.95rem' }} className="animate-fade-in">
          <CheckCircle2 size={20} color="#16A34A" />
          <span>شكراً جزيلاً لكِ! تم تسجيل تقييمكِ بنجاح وسيظهر لجميع زوار المتجر ❤️</span>
        </div>
      )}

      {/* Interactive Review Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="review-submit-form animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 className="review-form-title">✍️ إضافة تقييمكِ للمنتج ({product?.title})</h4>
            <button type="button" onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: '8px' }}>
              اختاري تقييمك بالنجوم: <strong style={{ color: '#D97706', marginRight: '6px' }}>{getRatingLabel(hoverRating || rating)}</strong>
            </label>
            <div className="review-star-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-pick-btn ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${star} نجوم`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="review-form-grid">
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                الإسم الكامل أو اللقب *
              </label>
              <input
                type="text"
                required
                className="review-input"
                placeholder="مثال: ياسمين ب."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                الولاية *
              </label>
              <select
                className="review-select"
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
              >
                {ALGERIA_WILAYAS.map(w => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              رأيكِ في المنتج وجودة القماش والتوصيل *
            </label>
            <textarea
              required
              className="review-textarea"
              placeholder="اكتبي تجربتكِ الصادقة (نوعية القماش، المقاس، راحة الموديل، سرعة التوصيل)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="review-form-actions">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="reviews-open-form-btn"
              style={{ padding: '10px 28px' }}
            >
              {isSubmitting ? 'جاري الإرسال...' : (
                <>
                  <Send size={16} /> نشر التقييم الآن
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Summary Score Card */}
      <div className="reviews-summary-grid">
        <div className="reviews-score-box">
          <div className="reviews-score-number">{stats.average}</div>
          <div className="reviews-stars-row">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} style={{ color: s <= Math.round(stats.average) ? '#F59E0B' : '#CBD5E1' }}>★</span>
            ))}
          </div>
          <span className="reviews-score-sub">
            {stats.totalCount > 0 ? `بناءً على ${stats.totalCount} تقييم حقيقي` : 'كن أول من يقيّم هذا الموديل ⭐'}
          </span>
          <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#16A34A', fontWeight: 800, background: '#DCFCE7', padding: '3px 8px', borderRadius: '9999px' }}>
            <ShieldCheck size={13} /> تقييمات موثوقة 100%
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="reviews-bars-list">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = stats.distribution[stars] || 0;
            const percentage = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : (stars === 5 ? 100 : 0);
            return (
              <div key={stars} className="reviews-bar-item">
                <span className="reviews-bar-label">
                  {stars} <span style={{ color: '#F59E0B' }}>★</span>
                </span>
                <div className="reviews-bar-track">
                  <div className="reviews-bar-fill" style={{ width: `${percentage}%` }} />
                </div>
                <span className="reviews-bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews Feed List */}
      <div className="reviews-feed-list">
        {productReviews.length > 0 ? (
          productReviews.map(rev => {
            const initial = (rev.customerName || 'ز')[0].toUpperCase();
            const dateStr = rev.date ? new Date(rev.date).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' }) : 'مؤخراً';
            return (
              <div key={rev.id} className="review-card-item animate-fade-in">
                <div className="review-card-header">
                  <div className="review-user-info">
                    <div className="review-user-avatar">{initial}</div>
                    <div>
                      <h5 className="review-user-name">
                        <span>{rev.customerName}</span>
                        {rev.verifiedPurchase && (
                          <span className="review-verified-badge">
                            <CheckCircle2 size={12} /> مشترية مؤكدة
                          </span>
                        )}
                      </h5>
                      <span className="review-wilaya-tag">{rev.wilaya || 'الجزائر'}</span>
                    </div>
                  </div>

                  <div className="review-stars-and-date">
                    <div className="review-stars-gold">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{ color: i < (rev.rating || 5) ? '#F59E0B' : '#CBD5E1' }}>★</span>
                      ))}
                    </div>
                    <span className="review-date-text">{dateStr}</span>
                  </div>
                </div>

                <p className="review-comment-text">{rev.comment}</p>

                <div className="review-card-footer">
                  <button
                    type="button"
                    className="review-like-btn"
                    onClick={() => handleLike(rev.id)}
                  >
                    <ThumbsUp size={13} />
                    <span>مفيد ({rev.likes || 0})</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>💬</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155', margin: '0 0 6px 0' }}>لا توجد تقييمات لهذا الموديل بعد</h4>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '0 0 16px 0' }}>كوني أول من يشارك تجربته مع هذا المنتج المميز!</p>
            <button
              type="button"
              className="reviews-open-form-btn"
              onClick={() => setIsFormOpen(true)}
            >
              <MessageSquarePlus size={16} /> كتابة أول تقييم ⭐
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
