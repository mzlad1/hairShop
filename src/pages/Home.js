import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import { useNavigate } from "react-router-dom";
import "../css/Home.css";

function Home() {
  const [shopNameText, setShopNameText] = useState("");
  const [sentenceText, setSentenceText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [mostOrderedProducts, setMostOrderedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  // NEW: ref for the marquee track
  const trackRef = useRef(null);
  const navigate = useNavigate();

  const shopName = "Unlock Your Curls";
  const sentences = [
    "محتوى متخصص بالعناية بالشعر الكيرلي",
    "نصائح كيرلية مبنية على خبرة وتجربة",
    "بساعدك تحبي شعرك وتفهمي احتياجاته",
    "توصيل للضفة والقدس والداخل المحتل",
  ];

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

  // Typing effect for shop name
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < shopName.length) {
        setShopNameText(shopName.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Typing effect for sentences
  useEffect(() => {
    if (shopNameText === shopName) {
      let currentSentenceIndex = 0;
      let currentCharIndex = 0;
      let isDeleting = false;

      const typeNextCharacter = () => {
        const currentSentence = sentences[currentSentenceIndex];

        if (!isDeleting) {
          // Typing forward
          if (currentCharIndex <= currentSentence.length) {
            setSentenceText(currentSentence.slice(0, currentCharIndex));
            currentCharIndex++;
            setTimeout(typeNextCharacter, 80);
          } else {
            // Pause at end of sentence
            setTimeout(() => {
              isDeleting = true;
              typeNextCharacter();
            }, 2000);
          }
        } else {
          // Deleting backward
          if (currentCharIndex > 0) {
            setSentenceText(currentSentence.slice(0, currentCharIndex - 1));
            currentCharIndex--;
            setTimeout(typeNextCharacter, 50);
          } else {
            // Move to next sentence
            isDeleting = false;
            currentSentenceIndex =
              (currentSentenceIndex + 1) % sentences.length;
            setTimeout(typeNextCharacter, 500);
          }
        }
      };

      setTimeout(typeNextCharacter, 500);
    }
  }, [shopNameText]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorTimer);
  }, []);

  // Handle brand click
  const handleBrandClick = (brandName) => {
    // Navigate to products page with brand filter
    navigate(`/products?brand=${encodeURIComponent(brandName)}`);
  };

  return (
    <>
      <Navbar />
      <div className="home-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-image">
                <div className="hero-logo-animation">
                  <div className="animated-logo-container">
                    <img
                      src="/images/logo.png"
                      alt="Unlock Your Curls Logo"
                      className="animated-logo"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div
                      className="animated-logo-fallback"
                      style={{ display: "none" }}
                    >
                      <span className="animated-logo-icon">🌿</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shop-name-container">
                <h1 className="shop-name">
                  {shopNameText}
                  {shopNameText.length < shopName.length && (
                    <span
                      className={`typing-cursor ${showCursor ? "visible" : ""}`}
                    >
                      |
                    </span>
                  )}
                </h1>
              </div>

              <div className="hero-description">
                <p className="typed-sentences">
                  {sentenceText}
                  {!isTypingComplete && (
                    <span
                      className={`typing-cursor ${showCursor ? "visible" : ""}`}
                    >
                      |
                    </span>
                  )}
                </p>
              </div>

              <div className="hero-cta">
                <button
                  className="cta-button"
                  onClick={() => (window.location.href = "/products")}
                >
                  <span className="cta-icon">🛍️</span>
                  اشتري الآن
                </button>
              </div>
            </div>
          </div>

          <div className="hero-bg-decoration">
            <div className="bg-circle circle-1"></div>
            <div className="bg-circle circle-2"></div>
            <div className="bg-circle circle-3"></div>
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

        {/* Brands Section */}
        <section className="brands-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">🏆</span>
                العلامات التجارية المتوفرة
              </h2>
              <p className="section-subtitle">
                نتعامل مع أفضل العلامات التجارية العالمية
              </p>
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
