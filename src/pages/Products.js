import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLocation, useSearchParams } from "react-router-dom";
import "../css/Products.css";
import { CacheManager, CACHE_KEYS } from "../utils/cache";

// صفحة المنتجات تحتوي على البحث، الترتيب، والتصنيف
function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // 8 products per page
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // جلب الفئات من قاعدة البيانات
  useEffect(() => {
    async function fetchCategories() {
      try {
        // Check cache first
        const cachedCategories = CacheManager.get(CACHE_KEYS.CATEGORIES);
        if (cachedCategories) {
          console.log("Loading categories from cache");
          setCategories(cachedCategories.map((cat) => cat.name));
          return;
        }

        console.log("Fetching categories from Firebase");
        const snapshot = await getDocs(collection(db, "categories"));
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

        // Cache the full data for other pages
        CacheManager.set(CACHE_KEYS.CATEGORIES, data, 10 * 60 * 1000); // 10 minutes

        setCategories(data.map((cat) => cat.name));
      } catch (error) {
        console.error("Error fetching categories:", error);
        // بيانات تجريبية في حال عدم القدرة على جلب البيانات
        setCategories(["الجسم", "الوجه", "الشعر"]);
      }
    }
    fetchCategories();
  }, []);

  // جلب العلامات التجارية من قاعدة البيانات
  useEffect(() => {
    async function fetchBrands() {
      try {
        // Check cache first
        const cachedBrands = CacheManager.get(CACHE_KEYS.BRANDS);
        if (cachedBrands) {
          console.log("Loading brands from cache");
          setBrands(cachedBrands.map((brand) => brand.name));
          return;
        }

        console.log("Fetching brands from Firebase");
        const snapshot = await getDocs(collection(db, "brands"));
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

        // Cache the full data for other pages
        CacheManager.set(CACHE_KEYS.BRANDS, data, 10 * 60 * 1000); // 10 minutes

        setBrands(data.map((brand) => brand.name));
      } catch (error) {
        console.error("Error fetching brands:", error);
        // بيانات تجريبية في حال عدم القدرة على جلب البيانات
        setBrands([
          "Zara Beauty",
          "Nivea",
          "L'Oréal",
          "Garnier",
          "The Ordinary",
        ]);
      }
    }
    fetchBrands();
  }, []);

  // جلب المنتجات من قاعدة البيانات
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError("");
      try {
        // Check cache first
        const cachedProducts = CacheManager.get(CACHE_KEYS.PRODUCTS);
        if (cachedProducts) {
          console.log("Loading products from cache");
          setProducts(cachedProducts);
          setLoading(false);
          return;
        }

        console.log("Fetching products from Firebase");
        const querySnapshot = await getDocs(collection(db, "products"));
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });

        // Cache products for 5 minutes
        CacheManager.set(CACHE_KEYS.PRODUCTS, data, 5 * 60 * 1000);

        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("حدث خطأ في تحميل المنتجات");
        // بيانات تجريبية في حال عدم القدرة على جلب البيانات
        setProducts([
          {
            id: "1",
            name: "كريم مرطب للوجه",
            price: 50,
            brand: "Nivea",
            description:
              "كريم يرطب البشرة ويمنحها نعومة فائقة مع الحماية اليومية.",
            images: ["/images/sample1.jpg"],
            categories: ["الوجه"],
            stock: 15,
          },
          {
            id: "2",
            name: "زيت الأرغان للشعر",
            price: 70,
            brand: "The Ordinary",
            description: "زيت طبيعي 100% لتقوية الشعر وإضافة اللمعان الطبيعي.",
            images: ["/images/sample2.jpg"],
            categories: ["الشعر"],
            stock: 8,
          },
          {
            id: "3",
            name: "غسول الجسم المغذي",
            price: 40,
            brand: "Garnier",
            description: "غسول رائع لتنظيف الجسم برائحة عطرة ومكونات طبيعية.",
            images: ["/images/sample3.jpg"],
            categories: ["الجسم"],
            stock: 0,
          },
          {
            id: "4",
            name: "سيروم فيتامين سي",
            price: 85,
            brand: "The Ordinary",
            description:
              "سيروم مضاد للأكسدة لإشراق البشرة ومحاربة علامات التقدم.",
            images: ["/images/sample4.jpg"],
            categories: ["الوجه"],
            stock: 3,
          },
          {
            id: "5",
            name: "شامبو للشعر الجاف",
            price: 45,
            brand: "L'Oréal",
            description: "شامبو مخصص للشعر الجاف والمتضرر بتركيبة مرطبة عميقة.",
            images: ["/images/sample5.jpg"],
            categories: ["الشعر"],
            stock: 12,
          },
          {
            id: "6",
            name: "كريم مقشر للجسم",
            price: 55,
            brand: "Zara Beauty",
            description:
              "مقشر لطيف لإزالة خلايا الجلد الميتة وتجديد نعومة البشرة.",
            images: ["/images/sample6.jpg"],
            categories: ["الجسم"],
            stock: 7,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // تحديث قائمة المنتجات عند تغيّر معايير البحث أو الترتيب أو التصنيف
  useEffect(() => {
    let updated = [...products];

    // البحث بالاسم والوصف
    if (searchTerm) {
      updated = updated.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.brand &&
            item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // تصفية حسب التصنيف
    if (selectedCategory) {
      updated = updated.filter((item) =>
        item.categories.includes(selectedCategory)
      );
    }

    // تصفية حسب العلامة التجارية
    if (selectedBrand) {
      updated = updated.filter((item) => item.brand === selectedBrand);
    }

    // الترتيب
    if (sortOrder === "name") {
      updated.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "priceAsc") {
      updated.sort((a, b) => a.price - b.price);
    } else if (sortOrder === "priceDesc") {
      updated.sort((a, b) => b.price - a.price);
    } else if (sortOrder === "brand") {
      updated.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
    }

    setFilteredProducts(updated);
    setCurrentPage(1); // Reset to first page when filtering
  }, [products, searchTerm, sortOrder, selectedCategory, selectedBrand]);

  // Handle URL parameters for brand filtering
  useEffect(() => {
    const brandFromURL = searchParams.get("brand");
    if (brandFromURL) {
      setSelectedBrand(decodeURIComponent(brandFromURL));
    }
  }, [searchParams]);

  // حساب الصفحات
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortOrder("");
    setSelectedCategory("");
    setSelectedBrand("");
    // Clear URL parameters
    setSearchParams({});
  };

  // مكون الهيكل العظمي للتحميل
  const LoadingSkeleton = () => (
    <div className="pr-grid">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="pr-skeleton">
          <div className="pr-skel-image"></div>
          <div className="pr-skel-content">
            <div className="pr-skel-title"></div>
            <div className="pr-skel-desc"></div>
            <div className="pr-skel-price"></div>
            <div className="pr-skel-btn"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="products-page">
        <div className="pr-container">
          <div className="pr-header">
            <h1 className="pr-title">💄 منتجاتنا المميزة</h1>
            <p className="pr-subtitle">
              اكتشف مجموعتنا الرائعة من منتجات التجميل الطبيعية
            </p>
          </div>

          {error && (
            <div className="pr-error" role="alert">
              <span className="pr-error-icon">⚠️</span>
              <span>{error}</span>
              <button
                onClick={() => window.location.reload()}
                className="pr-retry-btn"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          <div className="pr-controls">
            <div className="pr-filters-header">
              <span className="pr-filters-icon">🔍</span>
              <h3 className="pr-filters-title">البحث والتصفية</h3>
            </div>

            <div className="pr-filters">
              <div className="pr-search">
                <label htmlFor="search-input" className="pr-search-label">
                  البحث
                </label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="ابحث عن منتج أو وصف أو علامة تجارية..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-search-input"
                  aria-label="البحث في المنتجات"
                />
                {searchTerm && (
                  <button
                    className="pr-clear-search"
                    onClick={() => setSearchTerm("")}
                    aria-label="مسح البحث"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="pr-selects">
                <div className="pr-filter">
                  <label htmlFor="sort-select" className="pr-filter-label">
                    الترتيب
                  </label>
                  <select
                    id="sort-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="pr-filter-select"
                    aria-label="ترتيب المنتجات"
                  >
                    <option value="">اختر الترتيب</option>
                    <option value="name">الاسم (أ-ي)</option>
                    <option value="brand">العلامة التجارية (أ-ي)</option>
                    <option value="priceAsc">السعر (الأقل أولاً)</option>
                    <option value="priceDesc">السعر (الأعلى أولاً)</option>
                  </select>
                </div>

                <div className="pr-filter">
                  <label htmlFor="category-select" className="pr-filter-label">
                    الفئة
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="pr-filter-select"
                    aria-label="تصفية حسب الفئة"
                  >
                    <option value="">كل الفئات</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pr-filter">
                  <label htmlFor="brand-select" className="pr-filter-label">
                    العلامة التجارية
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="pr-filter-select"
                    aria-label="تصفية حسب العلامة التجارية"
                  >
                    <option value="">كل العلامات التجارية</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(searchTerm ||
                sortOrder ||
                selectedCategory ||
                selectedBrand) && (
                <div className="pr-active">
                  <span className="pr-active-label">الفلاتر المطبقة:</span>
                  <div className="pr-active-list">
                    {searchTerm && (
                      <span className="pr-filter-tag">
                        البحث: {searchTerm}
                        <button onClick={() => setSearchTerm("")}>×</button>
                      </span>
                    )}
                    {selectedCategory && (
                      <span className="pr-filter-tag">
                        الفئة: {selectedCategory}
                        <button onClick={() => setSelectedCategory("")}>
                          ×
                        </button>
                      </span>
                    )}
                    {selectedBrand && (
                      <span className="pr-filter-tag">
                        العلامة التجارية: {selectedBrand}
                        <button onClick={() => setSelectedBrand("")}>×</button>
                      </span>
                    )}
                  </div>
                  <button className="pr-clear-filters" onClick={clearFilters}>
                    مسح جميع الفلاتر
                  </button>
                </div>
              )}
            </div>

            {!loading && (
              <div className="pr-info">
                <div className="pr-count">
                  عرض {indexOfFirstItem + 1}-
                  {Math.min(indexOfLastItem, filteredProducts.length)} من{" "}
                  {filteredProducts.length} منتج
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filteredProducts.length === 0 ? (
            <div className="pr-empty">
              <div className="pr-empty-icon">🔍</div>
              <h3>لا توجد منتجات</h3>
              <p>
                {searchTerm || selectedCategory || selectedBrand
                  ? "لا توجد منتجات تطابق معايير البحث المحددة"
                  : "لا توجد منتجات متاحة حالياً"}
              </p>
              {(searchTerm ||
                selectedCategory ||
                sortOrder ||
                selectedBrand) && (
                <button className="pr-clear-filters-btn" onClick={clearFilters}>
                  مسح جميع الفلاتر
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="pr-grid">
                {currentItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pr-pagination">
                  <button
                    className="pr-page-btn prev"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="الصفحة السابقة"
                  >
                    <span>←</span>
                    السابق
                  </button>

                  <div className="pr-page-numbers">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;

                      // Show first page, last page, current page, and adjacent pages
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 &&
                          pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            className={`pr-page-btn ${
                              currentPage === pageNumber ? "active" : ""
                            }`}
                            onClick={() => handlePageChange(pageNumber)}
                            aria-label={`الصفحة ${pageNumber}`}
                            aria-current={
                              currentPage === pageNumber ? "page" : undefined
                            }
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return (
                          <span key={pageNumber} className="pr-page-ellipsis">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    className="pr-page-btn next"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="الصفحة التالية"
                  >
                    التالي
                    <span>→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Products;
