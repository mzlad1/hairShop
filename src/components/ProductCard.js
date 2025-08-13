import React from "react";
import { Link } from "react-router-dom";
import "../css/ProductCard.css";

// مكون لعرض بطاقة المنتج في صفحة المنتجات
function ProductCard({ product }) {
  return (
    <div className="pc-card">
      <img
        src={
          product.images && product.images.length > 0 ? product.images[0] : ""
        }
        alt={product.name}
        className="pc-image"
        loading="lazy"
      />
      <h3 className="pc-name">{product.name}</h3>
      <p className="pc-price">{product.price} شيكل</p>
      <Link to={`/products/${product.id}`} className="pc-button">
        عرض المنتج
      </Link>
    </div>
  );
}

export default ProductCard;
