import React from "react";
import { Link } from "react-router-dom";
import "../css/ProductCard.css";

// مكون لعرض بطاقة المنتج في صفحة المنتجات
function ProductCard({ product }) {
  // Determine which badges to show
  const getBadges = () => {
    const badges = [];

    // Check if sold out (stock is 0 or null)
    const isSoldOut = !product.stock || product.stock === 0;

    if (isSoldOut) {
      badges.push({ text: "بيعت كلها", type: "sold-out" });
    }

    if (product.onDemand) {
      badges.push({ text: "ع الطلب", type: "on-demand" });
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
        {product.hasDiscount && product.originalPrice ? (
          <>
            <p className="pc-price pc-price--discounted">
              {product.price} شيكل
            </p>
            <p className="pc-price pc-price--original">
              {product.originalPrice} شيكل
            </p>
            <div className="pc-savings-info">
              {product.discountName && (
                <span className="pc-discount-badge">
                  {product.discountName}
                </span>
              )}
              <span className="pc-savings-amount">
                توفر {(product.originalPrice - product.price).toFixed(2)} شيكل
              </span>
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
