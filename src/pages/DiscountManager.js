import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import Navbar from "../components/Navbar";
import "../css/DiscountManager.css";

function DiscountManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Discount form state
  const [discountType, setDiscountType] = useState("product"); // product, category, brand
  const [selectedItems, setSelectedItems] = useState([]);
  const [discountMethod, setDiscountMethod] = useState("percentage"); // percentage, fixed
  const [discountValue, setDiscountValue] = useState("");
  const [discountName, setDiscountName] = useState("");
  const [discountExpiry, setDiscountExpiry] = useState("");

  // Search and pagination for products
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Show 12 products per page

  // Pagination for current discounts
  const [discountsPage, setDiscountsPage] = useState(1);
  const [discountsPerPage] = useState(8); // Show 8 discounts per page

  useEffect(() => {
    fetchData();
    // Check for expired discounts every minute
    const interval = setInterval(checkExpiredDiscounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const productsQuery = query(collection(db, "products"), orderBy("name"));
      const productsSnapshot = await getDocs(productsQuery);
      const productsList = [];
      productsSnapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);

      // Fetch categories from the categories collection
      try {
        const categoriesSnapshot = await getDocs(collection(db, "categories"));
        const categoriesList = [];
        categoriesSnapshot.forEach((doc) => {
          categoriesList.push(doc.data().name);
        });
        setCategories(categoriesList);
      } catch (error) {
        console.warn("Error fetching categories, using fallback:", error);
        // Fallback to unique categories from products
        const uniqueCategories = [
          ...new Set(productsList.map((p) => p.category).filter(Boolean)),
        ];
        setCategories(uniqueCategories);
      }

      // Fetch brands from the brands collection
      try {
        const brandsSnapshot = await getDocs(collection(db, "brands"));
        const brandsList = [];
        brandsSnapshot.forEach((doc) => {
          brandsList.push(doc.data().name);
        });
        setBrands(brandsList);
      } catch (error) {
        console.warn("Error fetching brands, using fallback:", error);
        // Fallback to unique brands from products
        const uniqueBrands = [
          ...new Set(productsList.map((p) => p.brand).filter(Boolean)),
        ];
        setBrands(uniqueBrands);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountedPrice = (
    originalPrice,
    discountValue,
    discountMethod
  ) => {
    if (discountMethod === "percentage") {
      return originalPrice - originalPrice * (discountValue / 100);
    } else {
      return Math.max(0, originalPrice - discountValue);
    }
  };

  const applyDiscount = async () => {
    if (!discountValue || !discountName || selectedItems.length === 0) {
      alert("يرجى ملء جميع الحقول واختيار العناصر");
      return;
    }

    if (
      discountValue <= 0 ||
      (discountMethod === "percentage" && discountValue >= 100)
    ) {
      alert("يرجى إدخال قيمة خصم صحيحة");
      return;
    }

    setUpdating(true);
    try {
      const batch = writeBatch(db);
      let affectedProducts = [];

      if (discountType === "product") {
        affectedProducts = products.filter((p) => selectedItems.includes(p.id));
      } else if (discountType === "category") {
        affectedProducts = products.filter((p) =>
          selectedItems.includes(p.category)
        );
      } else if (discountType === "brand") {
        affectedProducts = products.filter((p) =>
          selectedItems.includes(p.brand)
        );
      }

      affectedProducts.forEach((product) => {
        if (product.hasVariants) {
          // Handle variants with discounts
          const updatedVariants = product.variants.map((variant) => {
            const originalVariantPrice = variant.originalPrice || variant.price;
            const discountedVariantPrice = calculateDiscountedPrice(
              originalVariantPrice,
              parseFloat(discountValue),
              discountMethod
            );

            return {
              ...variant,
              originalPrice: originalVariantPrice,
              price: Math.round(discountedVariantPrice * 100) / 100,
            };
          });

          const productRef = doc(db, "products", product.id);
          batch.update(productRef, {
            variants: updatedVariants,
            hasDiscount: true,
            discountType: discountMethod,
            discountValue: parseFloat(discountValue),
            discountName: discountName,
            discountAppliedAt: new Date(),
            discountExpiresAt: discountExpiry ? new Date(discountExpiry) : null,
          });
        } else {
          // Handle regular products
          const discountedPrice = calculateDiscountedPrice(
            product.originalPrice || product.price,
            parseFloat(discountValue),
            discountMethod
          );

          const productRef = doc(db, "products", product.id);
          batch.update(productRef, {
            originalPrice: product.originalPrice || product.price, // Keep original if not set
            price: Math.round(discountedPrice * 100) / 100, // Round to 2 decimals
            hasDiscount: true,
            discountType: discountMethod,
            discountValue: parseFloat(discountValue),
            discountName: discountName,
            discountAppliedAt: new Date(),
            discountExpiresAt: discountExpiry ? new Date(discountExpiry) : null,
          });
        }
      });

      await batch.commit();

      // Invalidate products cache to ensure fresh data everywhere
      CacheManager.remove(CACHE_KEYS.PRODUCTS);

      // Reset form
      setSelectedItems([]);
      setDiscountValue("");
      setDiscountName("");
      setDiscountExpiry("");

      // Refresh data
      await fetchData();

      alert(`تم تطبيق الخصم على ${affectedProducts.length} منتج`);
    } catch (error) {
      console.error("Error applying discount:", error);
      alert("حدث خطأ في تطبيق الخصم");
    } finally {
      setUpdating(false);
    }
  };

  const removeDiscount = async (productId) => {
    setUpdating(true);
    try {
      const product = products.find((p) => p.id === productId);
      if (!product.originalPrice) {
        alert("هذا المنتج لا يحتوي على خصم");
        return;
      }

      const productRef = doc(db, "products", productId);
      if (product.hasVariants) {
        // Restore original variant prices
        const restoredVariants = product.variants.map((variant) => ({
          ...variant,
          price: variant.originalPrice || variant.price,
          originalPrice: null,
        }));

        await updateDoc(productRef, {
          variants: restoredVariants,
          hasDiscount: false,
          discountType: null,
          discountValue: null,
          discountName: null,
          discountAppliedAt: null,
          discountExpiresAt: null,
        });
      } else {
        await updateDoc(productRef, {
          price: product.originalPrice,
          hasDiscount: false,
          discountType: null,
          discountValue: null,
          discountName: null,
          discountAppliedAt: null,
          discountExpiresAt: null,
          originalPrice: null,
        });
      }

      // Invalidate products cache to ensure fresh data everywhere
      CacheManager.remove(CACHE_KEYS.PRODUCTS);

      await fetchData();
      alert("تم إزالة الخصم بنجاح");
    } catch (error) {
      console.error("Error removing discount:", error);
      alert("حدث خطأ في إزالة الخصم");
    } finally {
      setUpdating(false);
    }
  };

  const handleItemSelection = (item) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const getAvailableItems = () => {
    switch (discountType) {
      case "product":
        // Filter products by search term
        let filteredProducts = products.filter(
          (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.category &&
              product.category
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (product.brand &&
              product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Apply pagination for products only
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredProducts.slice(startIndex, endIndex);

      case "category":
        return categories.map((cat) => ({ id: cat, name: cat }));
      case "brand":
        return brands.map((brand) => ({ id: brand, name: brand }));
      default:
        return [];
    }
  };

  // Get total filtered products count for pagination
  const getFilteredProductsCount = () => {
    if (discountType !== "product") return 0;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category &&
          product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brand &&
          product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    ).length;
  };

  const totalPages = Math.ceil(getFilteredProductsCount() / itemsPerPage);

  // Reset pagination when search term or discount type changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDiscountTypeChange = (type) => {
    setDiscountType(type);
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedItems([]);
  };

  // Select all items on current page
  const selectAllCurrentPage = () => {
    const currentItems = getAvailableItems();
    const currentItemIds = currentItems.map((item) => item.id);
    setSelectedItems((prev) => {
      const newSelection = [...prev];
      currentItemIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  // Clear selection for current page
  const clearCurrentPageSelection = () => {
    const currentItems = getAvailableItems();
    const currentItemIds = currentItems.map((item) => item.id);
    setSelectedItems((prev) =>
      prev.filter((id) => !currentItemIds.includes(id))
    );
  };

  // Select all products (across all pages)
  const selectAllProducts = () => {
    if (discountType === "product") {
      const filteredProducts = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.category &&
            product.category
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (product.brand &&
            product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      const allProductIds = filteredProducts.map((product) => product.id);
      setSelectedItems((prev) => {
        const newSelection = [...prev];
        allProductIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedItems([]);
  };

  // Get discounted products with pagination
  const getDiscountedProducts = () => {
    const discountedProducts = products.filter((p) => p.hasDiscount);
    const startIndex = (discountsPage - 1) * discountsPerPage;
    const endIndex = startIndex + discountsPerPage;
    return discountedProducts.slice(startIndex, endIndex);
  };

  const totalDiscountedProducts = products.filter((p) => p.hasDiscount).length;
  const totalDiscountPages = Math.ceil(
    totalDiscountedProducts / discountsPerPage
  );

  // Remove all discounts
  // Check and remove expired discounts
  const checkExpiredDiscounts = async () => {
    try {
      const now = new Date();
      const expiredProducts = products.filter(
        (p) =>
          p.hasDiscount &&
          p.discountExpiresAt &&
          new Date(p.discountExpiresAt.seconds * 1000) < now
      );

      if (expiredProducts.length > 0) {
        const batch = writeBatch(db);

        expiredProducts.forEach((product) => {
          const productRef = doc(db, "products", product.id);
          if (product.hasVariants) {
            // Restore original variant prices
            const restoredVariants = product.variants.map((variant) => ({
              ...variant,
              price: variant.originalPrice || variant.price,
              originalPrice: null,
            }));

            batch.update(productRef, {
              variants: restoredVariants,
              hasDiscount: false,
              discountType: null,
              discountValue: null,
              discountName: null,
              discountAppliedAt: null,
              discountExpiresAt: null,
            });
          } else {
            batch.update(productRef, {
              price: product.originalPrice,
              hasDiscount: false,
              discountType: null,
              discountValue: null,
              discountName: null,
              discountAppliedAt: null,
              discountExpiresAt: null,
              originalPrice: null,
            });
          }
        });

        await batch.commit();
        CacheManager.remove(CACHE_KEYS.PRODUCTS);
        await fetchData();

        if (expiredProducts.length === 1) {
          console.log(`1 discount expired and was removed`);
        } else {
          console.log(
            `${expiredProducts.length} discounts expired and were removed`
          );
        }
      }
    } catch (error) {
      console.error("Error checking expired discounts:", error);
    }
  };

  // Check expired discounts on component mount
  useEffect(() => {
    checkExpiredDiscounts();
  }, [products]);

  const removeAllDiscounts = async () => {
    if (
      !window.confirm(
        `هل أنت متأكد من إزالة جميع الخصومات؟ (${totalDiscountedProducts} منتج)`
      )
    ) {
      return;
    }

    setUpdating(true);
    try {
      const batch = writeBatch(db);
      const discountedProducts = products.filter((p) => p.hasDiscount);

      discountedProducts.forEach((product) => {
        const productRef = doc(db, "products", product.id);
        if (product.hasVariants) {
          // Restore original variant prices
          const restoredVariants = product.variants.map((variant) => ({
            ...variant,
            price: variant.originalPrice || variant.price,
            originalPrice: null,
          }));

          batch.update(productRef, {
            variants: restoredVariants,
            hasDiscount: false,
            discountType: null,
            discountValue: null,
            discountName: null,
            discountAppliedAt: null,
            discountExpiresAt: null,
          });
        } else {
          batch.update(productRef, {
            price: product.originalPrice,
            hasDiscount: false,
            discountType: null,
            discountValue: null,
            discountName: null,
            discountAppliedAt: null,
            discountExpiresAt: null,
            originalPrice: null,
          });
        }
      });

      await batch.commit();

      // Invalidate products cache
      CacheManager.remove(CACHE_KEYS.PRODUCTS);

      await fetchData();
      setDiscountsPage(1);
      alert(`تم إزالة ${discountedProducts.length} خصم بنجاح`);
    } catch (error) {
      console.error("Error removing all discounts:", error);
      alert("حدث خطأ في إزالة الخصومات");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="dm-container">
          <div className="dm-loading">جاري تحميل البيانات...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dm-container">
        <div className="dm-header">
          <h1 className="dm-title">إدارة الخصومات</h1>
        </div>

        {/* Discount Creation Form */}
        <div className="dm-form-section">
          <h2>إضافة خصم جديد</h2>

          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>نوع الخصم:</label>
              <select
                value={discountType}
                onChange={(e) => handleDiscountTypeChange(e.target.value)}
              >
                <option value="product">منتجات محددة</option>
                <option value="category">فئة كاملة</option>
                <option value="brand">ماركة كاملة</option>
              </select>
            </div>

            <div className="dm-form-group">
              <label>طريقة الخصم:</label>
              <select
                value={discountMethod}
                onChange={(e) => setDiscountMethod(e.target.value)}
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (شيكل)</option>
              </select>
            </div>
          </div>

          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>قيمة الخصم:</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={
                  discountMethod === "percentage" ? "مثال: 25" : "مثال: 50"
                }
                min="0"
                max={discountMethod === "percentage" ? "99" : undefined}
              />
            </div>

            <div className="dm-form-group">
              <label>اسم الخصم:</label>
              <input
                type="text"
                value={discountName}
                onChange={(e) => setDiscountName(e.target.value)}
                placeholder="مثال: خصم الجمعة البيضاء"
                maxLength={50}
              />
            </div>

            <div className="dm-form-group">
              <label>تاريخ انتهاء الخصم:</label>
              <input
                type="datetime-local"
                value={discountExpiry}
                onChange={(e) => setDiscountExpiry(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                placeholder="اختر تاريخ انتهاء الخصم"
              />
              <small className="dm-expiry-note">
                اتركه فارغاً إذا كنت تريد خصماً دائماً
              </small>
            </div>
          </div>

          {/* Item Selection */}
          <div className="dm-selection-section">
            <label>اختر العناصر للخصم:</label>

            {/* Search and controls for products */}
            {discountType === "product" && (
              <div className="dm-search-controls">
                <div className="dm-search-group">
                  <input
                    type="text"
                    placeholder="البحث بالاسم، الفئة، أو الماركة..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="dm-search-input"
                  />
                  <span className="dm-results-count">
                    {getFilteredProductsCount()} منتج
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="dm-pagination">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="dm-page-btn"
                    >
                      السابق
                    </button>
                    <span className="dm-page-info">
                      صفحة {currentPage} من {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="dm-page-btn"
                    >
                      التالي
                    </button>
                  </div>
                )}

                <div className="dm-selection-controls">
                  <button
                    type="button"
                    onClick={selectAllCurrentPage}
                    className="dm-select-btn dm-select-all"
                  >
                    اختيار الكل في هذه الصفحة
                  </button>
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="dm-select-btn dm-select-all-global"
                  >
                    اختيار جميع المنتجات ({getFilteredProductsCount()})
                  </button>
                  <button
                    type="button"
                    onClick={clearCurrentPageSelection}
                    className="dm-select-btn dm-clear-selection"
                  >
                    إلغاء الاختيار من هذه الصفحة
                  </button>
                  <button
                    type="button"
                    onClick={clearAllSelections}
                    className="dm-select-btn dm-clear-all"
                  >
                    إلغاء جميع الاختيارات
                  </button>
                  {selectedItems.length > 0 && (
                    <span className="dm-selected-count">
                      تم اختيار {selectedItems.length} عنصر
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="dm-items-grid">
              {getAvailableItems().map((item) => (
                <div
                  key={item.id}
                  className={`dm-item-card ${
                    selectedItems.includes(item.id) ? "selected" : ""
                  }`}
                  onClick={() => handleItemSelection(item.id)}
                >
                  <div className="dm-item-info">
                    <h4>{item.name}</h4>
                    {discountType === "product" && (
                      <>
                        <p>السعر: {item.price} شيكل</p>
                        {item.hasDiscount && (
                          <span className="dm-current-discount">
                            خصم حالي: {item.discountName}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {selectedItems.includes(item.id) && (
                    <span className="dm-selected-check">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="dm-apply-btn"
            onClick={applyDiscount}
            disabled={updating || selectedItems.length === 0}
          >
            {updating ? "جاري التطبيق..." : "تطبيق الخصم"}
          </button>
        </div>

        {/* Current Discounts */}
        <div className="dm-current-section">
          <div className="dm-section-header">
            <h2>الخصومات الحالية ({totalDiscountedProducts})</h2>
            {totalDiscountedProducts > 0 && (
              <button
                className="dm-remove-all-btn"
                onClick={removeAllDiscounts}
                disabled={updating}
              >
                إزالة جميع الخصومات
              </button>
            )}
          </div>

          <div className="dm-discounts-list">
            {getDiscountedProducts().map((product) => (
              <div key={product.id} className="dm-discount-item">
                <div className="dm-discount-info">
                  <h4>{product.name}</h4>
                  <p>
                    السعر الأصلي:{" "}
                    <span className="dm-original-price">
                      {product.originalPrice} شيكل
                    </span>
                  </p>
                  <p>
                    السعر بعد الخصم:{" "}
                    <span className="dm-discounted-price">
                      {product.price} شيكل
                    </span>
                  </p>
                  <p>اسم الخصم: {product.discountName}</p>
                  <p>
                    قيمة الخصم: {product.discountValue}
                    {product.discountType === "percentage" ? "%" : " شيكل"}
                  </p>
                  {product.discountExpiresAt && (
                    <p>
                      ينتهي في:{" "}
                      <span className="dm-expiry-time">
                        {new Date(
                          product.discountExpiresAt.seconds * 1000
                        ).toLocaleString("ar-EG")}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  className="dm-remove-btn"
                  onClick={() => removeDiscount(product.id)}
                  disabled={updating}
                >
                  إزالة الخصم
                </button>
              </div>
            ))}

            {totalDiscountedProducts === 0 && (
              <div className="dm-no-discounts">لا توجد خصومات حالية</div>
            )}
          </div>

          {/* Discounts Pagination */}
          {totalDiscountPages > 1 && (
            <div className="dm-pagination">
              <button
                onClick={() =>
                  setDiscountsPage((prev) => Math.max(1, prev - 1))
                }
                disabled={discountsPage === 1}
                className="dm-page-btn"
              >
                السابق
              </button>
              <span className="dm-page-info">
                صفحة {discountsPage} من {totalDiscountPages}
              </span>
              <button
                onClick={() =>
                  setDiscountsPage((prev) =>
                    Math.min(totalDiscountPages, prev + 1)
                  )
                }
                disabled={discountsPage === totalDiscountPages}
                className="dm-page-btn"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DiscountManager;
