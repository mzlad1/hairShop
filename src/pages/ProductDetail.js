import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useCart } from "../contexts/CartContext";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/ProductDetail.css";

// صفحة تفاصيل المنتج
function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { addToCart, cartItems } = useCart();

  // Check if user is admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError("");
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setProduct(data);
          setMainImage(
            data.images && data.images.length > 0 ? data.images[0] : ""
          );
        } else {
          setError("المنتج غير موجود");
        }
      } catch (error) {
        console.error("Error getting product:", error);
        setError("حدث خطأ في تحميل المنتج");
        // بيانات تجريبية في حال عدم القدرة على جلب البيانات
        const fallback = {
          id: "0",
          name: "كريم مرطب للوجه الفاخر",
          price: 120,
          brand: "Zara Beauty",
          description:
            "كريم مرطب فاخر للوجه مُعزز بالفيتامينات والزيوت الطبيعية. يوفر ترطيباً عميقاً ونعومة فائقة للبشرة مع حماية من العوامل البيئية. مناسب لجميع أنواع البشرة.",
          images: [
            "/images/sample1.jpg",
            "/images/sample2.jpg",
            "/images/sample3.jpg",
          ],
          categories: ["الوجه", "العناية اليومية"],
          stock: 15,
          features: [
            "100% طبيعي",
            "مناسب لجميع أنواع البشرة",
            "خالي من البارابين",
          ],
          ingredients: [
            "زيت الأرغان",
            "فيتامين E",
            "حمض الهيالورونيك",
            "الصبار",
          ],
        };
        setProduct(fallback);
        setMainImage(fallback.images[0]);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0 || isAdmin) return;

    // Calculate available quantity considering current cart contents
    const currentInCart =
      cartItems.find((i) => i.id === product.id)?.quantity || 0;
    const availableStock = Math.max(0, (product.stock || 0) - currentInCart);
    const qtyToAdd = Math.min(quantity, availableStock);

    if (qtyToAdd <= 0) {
      setError("لا يمكن إضافة المزيد - تم الوصول للحد الأقصى المتاح");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setAddingToCart(true);
    try {
      // Add product to cart with selected quantity
      for (let i = 0; i < qtyToAdd; i++) {
        addToCart(product);
      }

      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);

      // Reset quantity to 1 after adding
      setQuantity(1);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setError("حدث خطأ أثناء إضافة المنتج إلى السلة");
    } finally {
      setAddingToCart(false);
    }
  };

  // Helper to validate and parse stock
  const parseStock = (s) => {
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const getStockStatus = () => {
    if (!product) return null;
    const stock = parseStock(product.stock);
    const currentInCart =
      cartItems.find((i) => i.id === product.id)?.quantity || 0;
    const availableStock = Math.max(0, stock - currentInCart);

    if (stock <= 0) {
      return { text: "غير متوفر", class: "pd-out-of-stock", icon: "❌" };
    } else if (availableStock <= 0) {
      return {
        text: "تم إضافة الكمية المتاحة للسلة",
        class: "pd-low-stock",
        icon: "🛒",
      };
    } else if (stock <= 5) {
      return {
        text: `متبقي ${availableStock} قطع متاحة للإضافة`,
        class: "pd-low-stock",
        icon: "⚠️",
      };
    } else {
      return {
        text: `متوفر (${availableStock} متاح للإضافة)`,
        class: "pd-in-stock",
        icon: "✅",
      };
    }
  };

  const handleQuantityChange = (newQuantity) => {
    if (!product) return;

    const stock = parseStock(product.stock);
    const currentInCart =
      cartItems.find((i) => i.id === product.id)?.quantity || 0;
    const maxAddable = Math.max(0, stock - currentInCart);

    if (maxAddable === 0) {
      setQuantity(0);
      return;
    }

    if (newQuantity < 1) {
      setQuantity(1);
      return;
    }

    setQuantity(Math.min(newQuantity, maxAddable));
  };

  const increaseQuantity = () => {
    const stock = parseStock(product.stock);
    const currentInCart =
      cartItems.find((i) => i.id === product.id)?.quantity || 0;
    const maxAddable = Math.max(0, stock - currentInCart);

    if (quantity < maxAddable) {
      setQuantity(quantity + 1);
    }
  };
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleImageClick = (image) => {
    setMainImage(image);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="pd-container">
      <div className="pd-images">
        <div className="pd-skel-main"></div>
        <div className="pd-skel-thumbs">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="pd-skel-thumb"></div>
          ))}
        </div>
      </div>
      <div className="pd-info">
        <div className="pd-skel-breadcrumb"></div>
        <div className="pd-skel-title"></div>
        <div className="pd-skel-price"></div>
        <div className="pd-skel-stock"></div>
        <div className="pd-skel-desc"></div>
        <div className="pd-skel-list"></div>
        <div className="pd-skel-qty"></div>
        <div className="pd-skel-btn"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="product-detail-page">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  if (error && !product) {
    return (
      <>
        <Navbar />
        <div className="product-detail-page">
          <div className="error-container">
            <div className="error-icon">😞</div>
            <h2>عذراً، حدث خطأ</h2>
            <p>{error}</p>
            <button onClick={handleBackClick} className="back-button">
              العودة للمنتجات
            </button>
          </div>
        </div>
      </>
    );
  }

  const stockStatus = getStockStatus();
  const currentInCart =
    cartItems.find((i) => i.id === product?.id)?.quantity || 0;
  const stock = parseStock(product?.stock);
  const maxAddable = Math.max(0, stock - currentInCart);

  return (
    <>
      <Navbar />
      <div className="product-detail-page">
        <div className="pd-container">
          {/* Breadcrumb Navigation */}
          <nav className="pd-breadcrumb">
            <button
              onClick={() => navigate("/")}
              className="pd-breadcrumb-link"
            >
              الرئيسية
            </button>
            <span className="pd-breadcrumb-sep">›</span>
            <button
              onClick={() => navigate("/products")}
              className="pd-breadcrumb-link"
            >
              المنتجات
            </button>
            <span className="pd-breadcrumb-sep">›</span>
            <span className="pd-breadcrumb-current">{product.name}</span>
          </nav>

          {/* Back Button */}
          <button onClick={handleBackClick} className="pd-back-btn">
            <span>←</span>
            العودة
          </button>

          {error && (
            <div className="pd-error" role="alert">
              <span className="pd-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {addedToCart && (
            <div className="pd-success" role="alert">
              <span className="pd-success-icon">✅</span>
              <span>تم إضافة المنتج إلى السلة بنجاح!</span>
            </div>
          )}

          <div className="pd-content">
            {/* Product Images */}
            <div className="pd-images">
              <div className="pd-main-image-wrap">
                {mainImage && (
                  <>
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="pd-main-image"
                      onClick={() => setShowImageModal(true)}
                    />
                    <button
                      className="pd-zoom-btn"
                      onClick={() => setShowImageModal(true)}
                      aria-label="تكبير الصورة"
                    >
                      🔍
                    </button>
                  </>
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <div className="pd-thumbs">
                  {product.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className={`pd-thumb ${
                        mainImage === img ? "active" : ""
                      }`}
                      onClick={() => handleImageClick(img)}
                      onError={(e) => {
                        e.target.src = "/images/placeholder.jpg";
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="pd-info">
              <div className="pd-header">
                <h1 className="pd-title">{product.name}</h1>
                {product.brand && (
                  <div className="pd-brand">
                    <span className="pd-brand-label">العلامة التجارية:</span>
                    <span className="pd-brand-name">{product.brand}</span>
                  </div>
                )}
                <div className="pd-price">
                  <span className="pd-price-label">السعر:</span>
                  <span className="pd-price-value">{product.price} شيكل</span>
                </div>
              </div>

              {/* Enhanced Stock Status */}
              <div className="pd-stock">
                <span className={`pd-stock-status ${stockStatus.class}`}>
                  <span className="pd-stock-icon">{stockStatus.icon}</span>
                  {stockStatus.text}
                </span>
                {currentInCart > 0 && (
                  <div className="pd-cart-info">
                    في السلة حالياً: {currentInCart} قطعة
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="pd-description">
                <h3>وصف المنتج</h3>
                <p>{product.description}</p>
              </div>

              {/* Categories */}
              {product.categories && (
                <div className="pd-categories">
                  <h4>الفئات:</h4>
                  <div className="pd-category-tags">
                    {product.categories.map((category, index) => (
                      <span key={index} className="pd-category-tag">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {product.features && (
                <div className="pd-features">
                  <h4>المميزات:</h4>
                  <ul className="pd-features-list">
                    {product.features.map((feature, index) => (
                      <li key={index} className="pd-feature-item">
                        <span className="pd-feature-icon">✨</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ingredients */}
              {product.ingredients && (
                <div className="pd-ingredients">
                  <h4>المكونات الرئيسية:</h4>
                  <div className="pd-ingredient-tags">
                    {product.ingredients.map((ingredient, index) => (
                      <span key={index} className="pd-ingredient-tag">
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Quantity Selector - Only show for non-admin users */}
              {maxAddable > 0 && !isAdmin && (
                <div className="pd-qty">
                  <label htmlFor="quantity" className="pd-qty-label">
                    الكمية المطلوبة:
                  </label>
                  <div className="pd-qty-controls">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      className="pd-qty-btn decrease"
                      disabled={quantity <= 1}
                      aria-label="تقليل الكمية"
                    >
                      −
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      max={maxAddable}
                      value={quantity}
                      onChange={(e) =>
                        handleQuantityChange(parseInt(e.target.value) || 1)
                      }
                      className="pd-qty-input"
                      aria-label="الكمية"
                    />
                    <button
                      type="button"
                      onClick={increaseQuantity}
                      className="pd-qty-btn increase"
                      disabled={quantity >= maxAddable}
                      aria-label="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                  <span className="pd-qty-note">
                    المتاح للإضافة: {maxAddable} قطعة
                  </span>
                </div>
              )}

              {/* Enhanced Add to Cart Button */}
              <div className="pd-actions">
                <button
                  className={`pd-add-btn ${
                    stock <= 0 || maxAddable <= 0 || isAdmin ? "disabled" : ""
                  }`}
                  onClick={handleAddToCart}
                  disabled={
                    addingToCart ||
                    stock <= 0 ||
                    maxAddable <= 0 ||
                    quantity <= 0 ||
                    isAdmin
                  }
                >
                  {isAdmin ? (
                    <>
                      <span>🔒</span>
                      المديرون لا يمكنهم التسوق
                    </>
                  ) : addingToCart ? (
                    <>
                      <span className="pd-loading"></span>
                      جاري الإضافة...
                    </>
                  ) : stock <= 0 ? (
                    <>
                      <span>❌</span>
                      نفدت الكمية
                    </>
                  ) : maxAddable <= 0 ? (
                    <>
                      <span>🛒</span>
                      تم إضافة الكمية المتاحة
                    </>
                  ) : (
                    <>
                      <span>🛍️</span>
                      أضف {quantity > 1 ? `(${quantity})` : ""} إلى السلة
                    </>
                  )}
                </button>
              </div>

              {/* Admin Notice */}
              {isAdmin && (
                <div className="pd-admin-notice">
                  <div className="pd-notice-content">
                    <span className="pd-notice-icon">ℹ️</span>
                    <div className="pd-notice-text">
                      <strong>ملاحظة للمدير:</strong>
                      <p>
                        أنت مسجل دخول كمدير. لا يمكن للمديرين إضافة منتجات إلى
                        السلة. يمكنك إدارة المنتجات من{" "}
                        <button
                          onClick={() => navigate("/admin/dashboard")}
                          className="pd-admin-link"
                        >
                          لوحة التحكم
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {showImageModal && (
          <div
            className="pd-image-modal"
            onClick={() => setShowImageModal(false)}
          >
            <div
              className="pd-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="pd-close-modal"
                onClick={() => setShowImageModal(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
              <img
                src={mainImage}
                alt={product.name}
                className="pd-modal-image"
              />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default ProductDetail;
