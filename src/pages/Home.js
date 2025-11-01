import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import PromotionalBanner from "../components/PromotionalBanner";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import { useNavigate } from "react-router-dom";
import "../css/Home.css";

function Home() {
  const [mostOrderedProducts, setMostOrderedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [heroSlides, setHeroSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const navigate = useNavigate();

  // Check and remove expired discounts
  const checkExpiredDiscounts = async () => {
    try {
      const cachedProducts = CacheManager.get(CACHE_KEYS.PRODUCTS);
      if (!cachedProducts) return;

      const now = new Date();
      const expiredProducts = cachedProducts.filter(
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
        console.log(`Removed ${expiredProducts.length} expired discounts`);
      }
    } catch (error) {
      console.error("Error checking expired discounts:", error);
    }
  };

  // Fetch hero slides
  useEffect(() => {
    async function fetchHeroSlides() {
      setLoadingSlides(true);
      try {
        const slidesSnapshot = await getDocs(collection(db, "heroSlides"));
        const slidesData = [];
        slidesSnapshot.forEach((doc) => {
          slidesData.push({ id: doc.id, ...doc.data() });
        });

        const activeSlides = slidesData.filter((s) => s.isActive !== false);
        activeSlides.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Fetch global colors from settings and apply to slides
        try {
          const settingsSnapshot = await getDocs(collection(db, "settings"));
          let colors = { textColor: "#FFFFFF", buttonColor: "#DEAA9B" };
          settingsSnapshot.forEach((sdoc) => {
            if (sdoc.id === "heroColors") {
              const data = sdoc.data();
              colors.textColor = data.textColor || colors.textColor;
              colors.buttonColor = data.buttonColor || colors.buttonColor;
            }
          });

          const slidesWithColors = activeSlides.map((slide) => ({
            ...slide,
            textColor: colors.textColor,
            buttonColor: colors.buttonColor,
          }));

          setHeroSlides(slidesWithColors);
        } catch (e) {
          // If fetching settings fails, fall back to slides without global colors
          console.error("Error fetching global colors:", e);
          setHeroSlides(activeSlides);
        }
      } catch (error) {
        console.error("Error fetching hero slides:", error);
        // Set default slides if error
        setHeroSlides([
          {
            id: "default-1",
            imageUrl: "/images/hero1.jpg",
            title: "Unlock Your Curls",
            subtitle: "محتوى متخصص بالعناية بالشعر الكيرلي",
            buttonText: "اشتري الآن",
            buttonLink: "/products",
            order: 1,
            textColor: "#FFFFFF",
            buttonColor: "#DEAA9B",
          },
        ]);
      } finally {
        setLoadingSlides(false);
      }
    }
    fetchHeroSlides();
  }, []);

  // Auto-slide carousel
  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      setLoadingCategories(true);
      try {
        // Check cache first
        const cachedCategories = CacheManager.get(CACHE_KEYS.CATEGORIES);
        if (cachedCategories) {
          console.log("Loading categories from cache");
          setCategories(cachedCategories);
          setLoadingCategories(false);
          return;
        }

        const categoriesSnapshot = await getDocs(collection(db, "categories"));
        const categoriesData = [];
        categoriesSnapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() });
        });

        CacheManager.set(CACHE_KEYS.CATEGORIES, categoriesData, 10 * 60 * 1000);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Fetch most ordered products based on order data
  useEffect(() => {
    async function fetchMostOrderedProducts() {
      setLoadingProducts(true);
      try {
        // Get cached data first
        const cachedOrders = CacheManager.get(CACHE_KEYS.ORDERS);
        const cachedProducts = CacheManager.get(CACHE_KEYS.PRODUCTS);

        let orders = cachedOrders;
        let products = cachedProducts;

        // Fetch from Firebase if not cached
        if (!orders) {
          const ordersSnapshot = await getDocs(collection(db, "orders"));
          orders = [];
          ordersSnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
          });
          CacheManager.set(CACHE_KEYS.ORDERS, orders, 30 * 1000);
        }

        if (!products) {
          const productsSnapshot = await getDocs(collection(db, "products"));
          products = [];
          productsSnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
          });
          CacheManager.set(CACHE_KEYS.PRODUCTS, products, 5 * 60 * 1000);
        }

        // Calculate product order frequency
        const productOrderCount = {};

        orders.forEach((order) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              if (item.id) {
                productOrderCount[item.id] =
                  (productOrderCount[item.id] || 0) + (item.quantity || 1);
              }
            });
          }
        });

        // Sort products by order count and get top 5
        const sortedProducts = products
          .map((product) => ({
            ...product,
            orderCount: productOrderCount[product.id] || 0,
          }))
          .filter((product) => product.orderCount > 0) // Only include products that have been ordered
          .sort((a, b) => b.orderCount - a.orderCount)
          .slice(0, 5); // Get top 5

        setMostOrderedProducts(sortedProducts);

        // Check for expired discounts after loading products
        await checkExpiredDiscounts();
      } catch (error) {
        console.error("Error fetching most ordered products:", error);
        // Fallback data with mock order counts
        setMostOrderedProducts([
          {
            id: "1",
            name: "كريم مرطب للوجه",
            price: 50,
            brand: "Nivea",
            description: "كريم يرطب البشرة ويمنحها نعومة فائقة",
            images: ["/images/sample1.jpg"],
            categories: ["الوجه"],
            stock: 15,
            orderCount: 45,
          },
          {
            id: "2",
            name: "زيت الأرغان للشعر",
            price: 70,
            brand: "The Ordinary",
            description: "زيت طبيعي 100% لتقوية الشعر",
            images: ["/images/sample2.jpg"],
            categories: ["الشعر"],
            stock: 8,
            orderCount: 38,
          },
          {
            id: "4",
            name: "سيروم فيتامين سي",
            price: 85,
            brand: "The Ordinary",
            description: "سيروم مضاد للأكسدة لإشراق البشرة",
            images: ["/images/sample4.jpg"],
            categories: ["الوجه"],
            stock: 3,
            orderCount: 32,
          },
          {
            id: "5",
            name: "شامبو للشعر الجاف",
            price: 45,
            brand: "L'Oréal",
            description: "شامبو مخصص للشعر الجاف والمتضرر",
            images: ["/images/sample5.jpg"],
            categories: ["الشعر"],
            stock: 12,
            orderCount: 28,
          },
          {
            id: "6",
            name: "كريم مقشر للجسم",
            price: 55,
            brand: "Zara Beauty",
            description: "مقشر لطيف لإزالة خلايا الجلد الميتة",
            images: ["/images/sample6.jpg"],
            categories: ["الجسم"],
            stock: 7,
            orderCount: 22,
          },
        ]);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchMostOrderedProducts();
  }, []);

  // Check for expired discounts every 5 minutes
  useEffect(() => {
    const interval = setInterval(checkExpiredDiscounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch brands
  useEffect(() => {
    async function fetchBrands() {
      setLoadingBrands(true);
      try {
        const querySnapshot = await getDocs(collection(db, "brands"));
        const brandsData = [];
        querySnapshot.forEach((doc) => {
          brandsData.push({ id: doc.id, ...doc.data() });
        });
        setBrands(brandsData);
      } catch (error) {
        console.error("Error fetching brands:", error);
        setBrands([
          {
            id: "1",
            name: "Nivea",
            logo: "/images/brands/nivea.png",
            icon: "🧴",
          },
          {
            id: "2",
            name: "L'Oréal",
            logo: "/images/brands/loreal.png",
            icon: "💄",
          },
          {
            id: "3",
            name: "Garnier",
            logo: "/images/brands/garnier.png",
            icon: "🌿",
          },
          {
            id: "4",
            name: "The Ordinary",
            logo: "/images/brands/the-ordinary.png",
            icon: "🧪",
          },
          {
            id: "5",
            name: "Zara Beauty",
            logo: "/images/brands/zara-beauty.png",
            icon: "✨",
          },
          {
            id: "6",
            name: "CeraVe",
            logo: "/images/brands/cerave.png",
            icon: "🧴",
          },
        ]);
      } finally {
        setLoadingBrands(false);
      }
    }
    fetchBrands();
  }, []);

  // Handle next slide
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  // Handle previous slide
  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
    );
  };

  // Handle dot click
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Handle category click
  const handleCategoryClick = (categoryName) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  // Handle brand click
  const handleBrandClick = (brandName) => {
    navigate(`/products?brand=${encodeURIComponent(brandName)}`);
  };

  return (
    <>
      <Navbar />
      <div className="home-page">
        {/* Hero Section - Carousel */}
        <section className="hero-section">
          {loadingSlides ? (
            <div className="hero-loading">
              <div className="spinner"></div>
              <p>جاري التحميل...</p>
            </div>
          ) : heroSlides.length > 0 ? (
            <div className="hero-carousel">
              {/* Slides */}
              <div
                className="hero-slides"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {heroSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`hero-slide ${
                      index === currentSlide ? "active" : ""
                    }`}
                    style={{
                      backgroundImage: `url(${slide.imageUrl})`,
                    }}
                  >
                    <div className="hero-overlay"></div>
                    <div 
                      className="hero-content"
                      style={{ color: slide.textColor || "white" }}
                    >
                      <h1 className="hero-title">{slide.title}</h1>
                      {slide.subtitle && (
                        <p className="hero-subtitle">{slide.subtitle}</p>
                      )}
                      {slide.buttonText && slide.buttonLink && (
                        <button
                          className="hero-button"
                          onClick={() => navigate(slide.buttonLink)}
                          style={{ backgroundColor: slide.buttonColor || "#DEAA9B" }}
                        >
                          {slide.buttonText}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {heroSlides.length > 1 && (
                <>
                  <button
                    className="hero-nav-btn prev"
                    onClick={prevSlide}
                    aria-label="Previous slide"
                  >
                    ❮
                  </button>
                  <button
                    className="hero-nav-btn next"
                    onClick={nextSlide}
                    aria-label="Next slide"
                  >
                    ❯
                  </button>

                  {/* Dots Navigation */}
                  <div className="hero-dots">
                    {heroSlides.map((_, index) => (
                      <button
                        key={index}
                        className={`hero-dot ${
                          index === currentSlide ? "active" : ""
                        }`}
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hero-empty">
              <p>لا توجد شرائح معروضة حالياً</p>
            </div>
          )}
        </section>

        {/* Categories Section */}
        <section className="categories-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                تصفحي حسب الفئة
              </h2>
            </div>

            {loadingCategories ? (
              <div className="categories-loading">
                <div className="categories-loading-grid">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="category-skeleton">
                      <div className="skeleton-category-image"></div>
                      <div className="skeleton-category-name"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="categories-grid">
                {categories.map((category) => (
                  <div key={category.id} className="category-item">
                    <div
                      className="category-card"
                      onClick={() => handleCategoryClick(category.name)}
                    >
                      <div className="category-image-container">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="category-image"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="category-image-fallback"
                          style={{
                            display: category.imageUrl ? "none" : "flex",
                          }}
                        >
                          <span className="category-icon">
                            {category.name === "الوجه"
                              ? "💄"
                              : category.name === "الشعر"
                              ? "💇‍♀️"
                              : category.name === "الجسم"
                              ? "🧴"
                              : "🏷️"}
                          </span>
                        </div>
                      </div>
                      <h3 className="category-name">{category.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {categories.length === 0 && !loadingCategories && (
              <div className="no-categories-message">
                <div className="no-categories-icon">🏷️</div>
                <h3>لا توجد فئات</h3>
                <p>لم يتم إضافة أي فئة بعد</p>
              </div>
            )}
          </div>
        </section>

        {/* Most Ordered Products Section */}
        <section className="popular-products-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">المنتجات الأكثر طلباً</h2>
              <p className="section-subtitle">
                المنتجات التي يطلبها عملاؤنا أكثر من غيرها
              </p>
            </div>

            {loadingProducts ? (
              <div className="products-loading">
                <div className="loading-grid">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="product-skeleton">
                      <div className="skeleton-image"></div>
                      <div className="skeleton-content">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-price"></div>
                        <div className="skeleton-button"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="popular-products-grid">
                  {mostOrderedProducts.map((product, index) => (
                    <div key={product.id} className="popular-product-item">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

                {mostOrderedProducts.length === 0 && (
                  <div className="no-orders-message">
                    <div className="no-orders-icon">📦</div>
                    <h3>لا توجد طلبات بعد</h3>
                    <p>لم يتم طلب أي منتج حتى الآن</p>
                  </div>
                )}

                <div className="section-cta">
                  <button
                    className="view-all-button"
                    onClick={() => (window.location.href = "/products")}
                  >
                    <span className="cta-text">عرض جميع المنتجات</span>
                    <span className="cta-arrow">←</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Promotional Banner */}
        <section className="promotional-banner-section">
          <div className="promo-container">
            <PromotionalBanner
              backgroundImage="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              headline="عروض حصرية على منتجات العناية الفاخرة"
              subheading="وفري حتى 30% على مجموعات العناية المتكاملة للشعر والبشرة"
              primaryButtonText="تسوقي الآن"
              secondaryButtonText="اعرفي المزيد"
              primaryButtonAction="/products"
              secondaryButtonAction="/contact"
            />
          </div>
        </section>

        {/* Brands Section */}
        <section className="brands-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                العلامات التجارية المتوفرة
              </h2>
            </div>

            {loadingBrands ? (
              <div className="brands-loading">
                <div className="brands-loading-grid">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="brand-skeleton">
                      <div className="skeleton-brand-logo"></div>
                      <div className="skeleton-brand-name"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="brands-grid">
                {brands.map((brand) => (
                  <div key={brand.id} className="brand-item">
                    <div
                      className="brand-card"
                      onClick={() => handleBrandClick(brand.name)}
                    >
                      <div className="brand-logo-container">
                        {brand.logo ? (
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="brand-logo"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="brand-logo-fallback"
                          style={{ display: brand.logo ? "none" : "flex" }}
                        >
                          <span className="brand-icon">
                            {brand.icon || "🏷️"}
                          </span>
                        </div>
                      </div>
                      <div className="brand-info">
                        <h3 className="brand-name">{brand.name}</h3>
                        <div className="brand-click-hint">
                          <span>انقر لعرض المنتجات</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {brands.length === 0 && !loadingBrands && (
              <div className="no-brands-message">
                <div className="no-brands-icon">🏷️</div>
                <h3>لا توجد علامات تجارية</h3>
                <p>لم يتم إضافة أي علامة تجارية بعد</p>
              </div>
            )}
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

export default Home;
