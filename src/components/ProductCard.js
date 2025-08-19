import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/ProductCard.css";

// مكون لعرض بطاقة المنتج في صفحة المنتجات
function ProductCard({ product }) {
  const [timeLeft, setTimeLeft] = useState(null);

  // Countdown timer for discounts
  useEffect(() => {
    if (!product.hasDiscount || !product.discountExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiryDate = new Date(product.discountExpiresAt.seconds * 1000);
      const difference = expiryDate - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [product.discountExpiresAt, product.hasDiscount]);

  // Determine which badges to show
  const getBadges = () => {
    const badges = [];

    // Check if sold out (stock is 0 or null)
    let isSoldOut = false;

    if (product.hasVariants) {
      // For variant products, check total stock from all variants
      const totalStock =
        product.variants?.reduce(
          (sum, v) => sum + (parseInt(v.stock) || 0),
          0
        ) || 0;
      isSoldOut = totalStock === 0;
    } else {
      // For regular products, check product stock
      isSoldOut = !product.stock || product.stock === 0;
    }

    if (isSoldOut) {
      badges.push({ text: "بيعت كلها", type: "sold-out" });
    }

    if (product.onDemand) {
      badges.push({
        text: "ع الطلب (توصيل خلال 2-3 أسابيع)",
        type: "on-demand",
      });
    }

    if (product.isNew) {
      badges.push({ text: "جديد", type: "new" });
    }

    return badges;
  };

  const badges = getBadges();

  return (
    <div className="pc-card">
      <div className="pc-image-container">
        <img
          src={
            product.images && product.images.length > 0 ? product.images[0] : ""
          }
          alt={product.name}
          className="pc-image"
          loading="lazy"
        />
        {badges.length > 0 && (
          <div className="pc-badges-container">
            {badges.map((badge, index) => (
              <div
                key={badge.type}
                className={`pc-badge pc-badge--${badge.type}`}
                style={{ top: `${8 + index * 32}px` }}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )}
      </div>
      <h3 className="pc-name">{product.name}</h3>

      <div className="pc-price-container">
        {product.hasVariants ? (
          <div className="pc-price pc-price--variants">
            {(() => {
              const prices = product.variants?.map(
                (v) => parseFloat(v.price) || 0
              ) || [0];
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);

              // If all prices are the same, show single price
              if (minPrice === maxPrice) {
                return `${minPrice} شيكل`;
              }

              // If prices are different, show range
              return `من ${minPrice} إلى ${maxPrice} شيكل`;
            })()}
          </div>
        ) : product.hasDiscount && product.originalPrice ? (
          <>
            <p className="pc-price pc-price--discounted">
              {product.price} شيكل
            </p>
            <p className="pc-price pc-price--original">
              {product.originalPrice} شيكل
            </p>
            <div className="pc-savings-info">
              {timeLeft && (
                <div className="pc-countdown-timer">
                  <span className="pc-timer-label">ينتهي الخصم في:</span>
                  <div className="pc-timer-display">
                    {timeLeft.days > 0 && (
                      <span className="pc-timer-unit">
                        <span className="pc-timer-value">{timeLeft.days}</span>
                        <span className="pc-timer-label-small">يوم</span>
                      </span>
                    )}
                    <span className="pc-timer-unit">
                      <span className="pc-timer-value">
                        {timeLeft.hours.toString().padStart(2, "0")}
                      </span>
                      <span className="pc-timer-label-small">ساعة</span>
                    </span>
                    <span className="pc-timer-unit">
                      <span className="pc-timer-value">
                        {timeLeft.minutes.toString().padStart(2, "0")}
                      </span>
                      <span className="pc-timer-label-small">دقيقة</span>
                    </span>
                    <span className="pc-timer-unit">
                      <span className="pc-timer-value">
                        {timeLeft.seconds.toString().padStart(2, "0")}
                      </span>
                      <span className="pc-timer-label-small">ثانية</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="pc-price">{product.price} شيكل</p>
        )}
      </div>
      <Link to={`/products/${product.id}`} className="pc-button">
        عرض المنتج
      </Link>
    </div>
  );
}

export default ProductCard;
