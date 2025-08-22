import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useCart } from "../contexts/CartContext";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductFeedback from "../components/ProductFeedback";
import "../css/ProductDetail.css";

// Countdown Timer Component
const CountdownTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!expiryDate) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiryDate.seconds * 1000);
      const difference = expiry - now;

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
  }, [expiryDate]);

  if (!timeLeft) return null;

  return (
    <div className="pd-timer-display">
      {timeLeft.days > 0 && (
        <span className="pd-timer-unit">
          <span className="pd-timer-value">{timeLeft.days}</span>
          <span className="pd-timer-label-small">يوم</span>
        </span>
      )}
      <span className="pd-timer-unit">
        <span className="pd-timer-value">
          {timeLeft.hours.toString().padStart(2, "0")}
        </span>
        <span className="pd-timer-label-small">ساعة</span>
      </span>
      <span className="pd-timer-unit">
        <span className="pd-timer-value">
          {timeLeft.minutes.toString().padStart(2, "0")}
        </span>
        <span className="pd-timer-label-small">دقيقة</span>
      </span>
      <span className="pd-timer-unit">
        <span className="pd-timer-value">
          {timeLeft.seconds.toString().padStart(2, "0")}
        </span>
        <span className="pd-timer-label-small">ثانية</span>
      </span>
    </div>
  );
};

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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const { addToCart, cartItems, getProductTotalQuantity } = useCart();

  // Toast message function
  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    // Auto-hide toast after 4 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Check if user is admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Auto-select variant when both size and color are selected
  useEffect(() => {
    if (selectedSize && selectedColor) {
      const variant = getVariantInfo(selectedSize, selectedColor);
      if (variant) {
        setSelectedVariant(variant);
      }
    }
  }, [selectedSize, selectedColor]);

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
    if (!product || isAdmin) return;

    // Check if variant is selected for variant products
    if (product.hasVariants && !selectedVariant) {
      showToastMessage("يرجى اختيار الحجم واللون أولاً", "error");
      return;
    }

    let availableStock;
    if (product.hasVariants) {
      availableStock = parseInt(selectedVariant.stock) || 0;
    } else {
      if (product.stock <= 0) return;
      const currentInCart = getProductTotalQuantity(product.id);
      availableStock = Math.max(0, (product.stock || 0) - currentInCart);
    }

    const qtyToAdd = Math.min(quantity, availableStock);

    if (qtyToAdd <= 0) {
      showToastMessage(
        "لا يمكن إضافة المزيد - تم الوصول للحد الأقصى المتاح",
        "error"
      );
      return;
    }

    setAddingToCart(true);
    try {
      // Add product to cart with selected quantity and variant info
      const productToAdd = {
        ...product,
        selectedVariant: product.hasVariants ? selectedVariant : null,
        variantId: product.hasVariants
          ? `${selectedVariant.size}-${selectedVariant.color}`
          : null,
      };

      for (let i = 0; i < qtyToAdd; i++) {
        addToCart(productToAdd);
      }

      // Show success toast
      const variantInfo = product.hasVariants
        ? ` (${selectedVariant.size} - ${selectedVariant.color})`
        : "";
      showToastMessage(
        `تم إضافة ${qtyToAdd} قطعة${
          qtyToAdd > 1 ? "ات" : "ة"
        } إلى السلة${variantInfo}`,
        "success"
      );

      // Reset quantity to 1 after adding
      setQuantity(1);
    } catch (error) {
      console.error("Error adding to cart:", error);
      showToastMessage("حدث خطأ أثناء إضافة المنتج إلى السلة", "error");
    } finally {
      setAddingToCart(false);
    }
  };

  // Helper to validate and parse stock
  const parseStock = (s) => {
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  // Helper to get available sizes for a selected color
  const getAvailableSizesForColor = (color) => {
    if (!product?.variants) return [];
    return product.variants
      .filter((v) => v.color === color && (parseInt(v.stock) || 0) > 0)
      .map((v) => v.size);
  };

  // Helper to get available colors for a selected size
  const getAvailableColorsForSize = (size) => {
    if (!product?.variants) return [];
    return product.variants
      .filter((v) => v.size === size && (parseInt(v.stock) || 0) > 0)
      .map((v) => v.color);
  };

  // Helper to get variant info for size/color combination
  const getVariantInfo = (size, color) => {
    if (!product?.variants) return null;
    return product.variants.find((v) => v.size === size && v.color === color);
  };

  // Helper to check if a variant is available
  const isVariantAvailable = (size, color) => {
    const variant = getVariantInfo(size, color);
    return variant && (parseInt(variant.stock) || 0) > 0;
  };

  // Handle size selection
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSelectedColor(null); // Reset color when size changes
    setSelectedVariant(null); // Reset variant selection
    setQuantity(1); // Reset quantity

    showToastMessage(`تم اختيار الحجم: ${size}`, "success");
  };

  // Handle color selection
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setSelectedVariant(null); // Reset variant selection
    setQuantity(1); // Reset quantity

    // If both size and color are selected, auto-select the variant
    if (selectedSize) {
      const variant = getVariantInfo(selectedSize, color);
      if (variant) {
        setSelectedVariant(variant);
        showToastMessage(`تم اختيار ${selectedSize} - ${color}`, "success");
      }
    } else {
      showToastMessage(`تم اختيار اللون: ${color}`, "success");
    }
  };

  const getStockStatus = () => {
    if (!product) return null;

    if (product.hasVariants) {
      // Handle variants stock
      const totalStock =
        product.variants?.reduce(
          (sum, v) => sum + (parseInt(v.stock) || 0),
          0
        ) || 0;
      const currentInCart = getProductTotalQuantity(product.id);
      const availableStock = Math.max(0, totalStock - currentInCart);

      if (totalStock <= 0) {
        return { text: "غير متوفر", class: "pd-out-of-stock", icon: "❌" };
      } else if (availableStock <= 0) {
        return {
          text: "تم إضافة الكمية المتاحة للسلة",
          class: "pd-low-stock",
          icon: "🛒",
        };
      } else if (totalStock <= 5) {
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
    } else {
      // Handle regular product stock
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
    }
  };

  const handleQuantityChange = (newQuantity) => {
    if (!product) return;

    let maxAddable;
    if (product.hasVariants && selectedVariant) {
      // For variants, use the selected variant's stock
      maxAddable = parseInt(selectedVariant.stock) || 0;
    } else if (product.hasVariants) {
      // No variant selected
      maxAddable = 0;
    } else {
      // Regular product
      const stock = parseStock(product.stock);
      const currentInCart = getProductTotalQuantity(product.id);
      maxAddable = Math.max(0, stock - currentInCart);
    }

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
    let maxAddable;
    if (product.hasVariants && selectedVariant) {
      // For variants, use the selected variant's stock
      maxAddable = parseInt(selectedVariant.stock) || 0;
    } else if (product.hasVariants) {
      // No variant selected
      maxAddable = 0;
    } else {
      // Regular product
      const stock = parseStock(product.stock);
      const currentInCart = getProductTotalQuantity(product.id);
      maxAddable = Math.max(0, stock - currentInCart);
    }

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
  const currentInCart = getProductTotalQuantity(product?.id);

  let maxAddable;
  let stock;
  if (product?.hasVariants) {
    const totalStock =
      product.variants?.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0) ||
      0;
    maxAddable = Math.max(0, totalStock - currentInCart);
    stock = totalStock;
  } else {
    stock = parseStock(product?.stock);
    maxAddable = Math.max(0, stock - currentInCart);
  }

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

          {error && (
            <div className="pd-error" role="alert">
              <span className="pd-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Toast Notification */}
          {showToast && (
            <div className={`pd-toast pd-toast--${toastType}`} role="alert">
              <div className="pd-toast-content">
                <span className={`pd-toast-icon pd-toast-icon--${toastType}`}>
                  {toastType === "success" ? "✅" : "⚠️"}
                </span>
                <span className="pd-toast-message">{toastMessage}</span>
                <button
                  className="pd-toast-close"
                  onClick={() => setShowToast(false)}
                  aria-label="إغلاق الإشعار"
                >
                  ×
                </button>
              </div>
              <div className="pd-toast-progress"></div>
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
                  {product.hasVariants ? (
                    <div className="pd-variants-pricing">
                      <span className="pd-price-value pd-price-variants">
                        <small>
                          من{" "}
                          {Math.min(
                            ...(product.variants?.map(
                              (v) => parseFloat(v.price) || 0
                            ) || [0])
                          )}{" "}
                          شيكل
                        </small>
                        <small>
                          {" "}
                          إلى{" "}
                          {Math.max(
                            ...(product.variants?.map(
                              (v) => parseFloat(v.price) || 0
                            ) || [0])
                          )}{" "}
                          شيكل
                        </small>
                      </span>
                      <div className="pd-variants-overview"></div>
                    </div>
                  ) : product.hasDiscount && product.originalPrice ? (
                    <div className="pd-discount-price">
                      <span className="pd-price-value pd-price-discounted">
                        {product.price} شيكل
                      </span>
                      <span className="pd-original-price">
                        {product.originalPrice} شيكل
                      </span>

                      {product.discountExpiresAt && (
                        <div className="pd-countdown-timer">
                          <span className="pd-timer-label">
                            ينتهي الخصم في:
                          </span>
                          <CountdownTimer
                            expiryDate={product.discountExpiresAt}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="pd-price-value">{product.price} شيكل</span>
                  )}
                </div>
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

              {/* Variants Selection */}
              {product.hasVariants && (
                <div className="pd-variants-selection">
                  <h4>اختر الحجم واللون</h4>

                  <div className="pd-selection-options">
                    {/* Size Selection */}
                    <div className="pd-size-selection">
                      <h5>اختر الحجم:</h5>
                      <div className="pd-size-options">
                        {product.sizes?.map((size) => {
                          const isAvailable = product.colors?.some((color) =>
                            isVariantAvailable(size, color)
                          );
                          const isSelected = selectedSize === size;

                          return (
                            <button
                              key={size}
                              className={`pd-size-option ${
                                isSelected ? "selected" : ""
                              } ${!isAvailable ? "unavailable" : ""}`}
                              onClick={() =>
                                isAvailable && handleSizeSelect(size)
                              }
                              disabled={!isAvailable}
                            >
                              <span className="pd-size-name">{size}</span>
                              {isSelected && (
                                <span className="pd-selected-icon">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div className="pd-color-selection">
                      <h5>اختر اللون:</h5>
                      <div className="pd-color-options">
                        {(() => {
                          // If size is selected, show only available colors for that size
                          // If no size selected, show all available colors
                          const availableColors = selectedSize
                            ? getAvailableColorsForSize(selectedSize)
                            : product.colors?.filter((color) =>
                                product.sizes?.some((size) =>
                                  isVariantAvailable(size, color)
                                )
                              ) || [];

                          return availableColors.map((color) => {
                            const isSelected = selectedColor === color;

                            return (
                              <button
                                key={color}
                                className={`pd-color-option ${
                                  isSelected ? "selected" : ""
                                }`}
                                onClick={() => handleColorSelect(color)}
                              >
                                <span className="pd-color-name">{color}</span>
                                {isSelected && (
                                  <span className="pd-selected-icon">✓</span>
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Show selected variant info */}
                </div>
              )}

              {/* Selected Variant Display */}

              {/* Enhanced Quantity Selector - Only show for non-admin users */}
              {((product.hasVariants && selectedVariant) ||
                (!product.hasVariants && maxAddable > 0)) &&
                !isAdmin && (
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
                        max={
                          product.hasVariants && selectedVariant
                            ? parseInt(selectedVariant.stock) || 0
                            : maxAddable
                        }
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
                  </div>
                )}

              {/* Enhanced Add to Cart Button */}
              <div className="pd-actions">
                <button
                  className={`pd-add-btn ${
                    (product?.hasVariants && !selectedVariant) ||
                    (product?.hasVariants ? maxAddable <= 0 : stock <= 0) ||
                    maxAddable <= 0 ||
                    isAdmin
                      ? "disabled"
                      : ""
                  }`}
                  onClick={handleAddToCart}
                  disabled={
                    addingToCart ||
                    (product?.hasVariants && !selectedVariant) ||
                    (product?.hasVariants ? maxAddable <= 0 : stock <= 0) ||
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
                  ) : (product?.hasVariants ? maxAddable <= 0 : stock <= 0) ? (
                    <>
                      <span>❌</span>
                      نفدت الكمية
                    </>
                  ) : maxAddable <= 0 ? (
                    <>
                      <span>🛒</span>
                      تم إضافة الكمية المتاحة
                    </>
                  ) : product?.hasVariants && !selectedVariant ? (
                    <>
                      <span>⚠️</span>
                      اختر الحجم واللون أولاً
                    </>
                  ) : (
                    <>
                      <span>🛍️</span>
                      أضف {quantity > 1 ? `(${quantity})` : ""} إلى السلة
                      {product.hasVariants && selectedVariant && (
                        <span className="pd-variant-info">
                          {selectedVariant.size} - {selectedVariant.color}
                        </span>
                      )}
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

          {/* Product Feedback Section */}
          <ProductFeedback productId={product.id} />
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
