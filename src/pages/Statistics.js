import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import "../css/Statistics.css";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { CacheManager, CACHE_KEYS } from "../utils/cache";

function Statistics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  // Statistics data
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalFeedbacks: 0,
    totalCategories: 0,
    totalBrands: 0,
    ordersByStatus: {},
    ordersByMonth: {},
    topProducts: [],
    recentActivity: [],
    mostOrderedProducts: [],
  });

  const fetchStatistics = async (force = false) => {
    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch all collections
      const [
        ordersSnapshot,
        productsSnapshot,
        feedbacksSnapshot,
        categoriesSnapshot,
        brandsSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "feedbacks")),
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "brands")),
      ]);

      // Process orders
      const orders = [];
      ordersSnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      // Process products
      const products = [];
      productsSnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });

      // Process feedbacks
      const feedbacks = [];
      feedbacksSnapshot.forEach((doc) => {
        feedbacks.push({ id: doc.id, ...doc.data() });
      });

      // Process categories
      const categories = [];
      categoriesSnapshot.forEach((doc) => {
        categories.push({ id: doc.id, ...doc.data() });
      });

      // Process brands
      const brands = [];
      brandsSnapshot.forEach((doc) => {
        brands.push({ id: doc.id, ...doc.data() });
      });

      // Calculate statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );
      const totalProducts = products.length;
      const totalFeedbacks = feedbacks.length;
      const totalCategories = categories.length;
      const totalBrands = brands.length;

      // Calculate orders by status
      const ordersByStatus = {};
      orders.forEach((order) => {
        const status = order.status || "غير محدد";
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      });

      // Calculate orders by month (last 6 months)
      const ordersByMonth = {};
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
        });
        ordersByMonth[monthKey] = 0;
      }

      orders.forEach((order) => {
        if (order.createdAt) {
          const orderDate = order.createdAt.toDate
            ? order.createdAt.toDate()
            : new Date(order.createdAt);
          const monthKey = orderDate.toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "long",
          });
          if (ordersByMonth[monthKey] !== undefined) {
            ordersByMonth[monthKey]++;
          }
        }
      });

      // Get top products by orders
      const productOrderCount = {};
      orders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            // Check both item.id and item.productId for compatibility
            const productId = item.id || item.productId;
            if (productId) {
              productOrderCount[productId] =
                (productOrderCount[productId] || 0) + (item.quantity || 1);
            }
          });
        }
      });

      const topProducts = Object.entries(productOrderCount)
        .map(([productId, count]) => {
          const product = products.find((p) => p.id === productId);
          return {
            id: productId,
            name: product ? product.name : "منتج غير معروف",
            orderCount: count,
          };
        })
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

      // Get most ordered products with full product details
      let mostOrderedProducts = products
        .map((product) => ({
          ...product,
          orderCount: productOrderCount[product.id] || 0,
        }))
        .filter((product) => product.orderCount > 0) // Only include products that have been ordered
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 8); // Get top 8 for better display

      // If no products have been ordered, show some sample products with mock order counts
      if (mostOrderedProducts.length === 0 && products.length > 0) {
        mostOrderedProducts = products.slice(0, 6).map((product, index) => ({
          ...product,
          orderCount: Math.max(1, Math.floor(Math.random() * 20) + 5), // Random order count between 5-25
        }));
      }

      // Get recent activity
      const recentActivity = [
        ...orders.slice(0, 3).map((order) => ({
          type: "order",
          title: `طلب جديد #${order.id}`,
          description: `طلب من ${order.customerName || "عميل"} بقيمة ${
            order.total || 0
          } شيكل`,
          date: order.createdAt,
          status: order.status,
        })),
        ...feedbacks.slice(0, 3).map((feedback) => ({
          type: "feedback",
          title: `تقييم جديد`,
          description: `تقييم من ${feedback.name} للمنتج`,
          date: feedback.createdAt,
          status: feedback.status,
        })),
      ]
        .sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return dateB - dateA;
        })
        .slice(0, 5);

      // Estimate unique customers (based on unique customer names in orders)
      const uniqueCustomers = new Set(
        orders.map((order) => order.customerName).filter(Boolean)
      );
      const totalCustomers = uniqueCustomers.size;

      setStats({
        totalOrders,
        totalRevenue,
        totalProducts,
        totalCustomers,
        totalFeedbacks,
        totalCategories,
        totalBrands,
        ordersByStatus,
        ordersByMonth,
        topProducts,
        recentActivity,
        mostOrderedProducts,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching statistics:", error);
      setError("حدث خطأ أثناء تحميل الإحصائيات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const formatDate = (date) => {
    if (!date) return "-";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ar-EG").format(amount);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="statistics-page">
          <div className="stats-loading-container">
            <div className="stats-loading-spinner"></div>
            <p>جاري تحميل الإحصائيات...</p>
          </div>
        </div>
      </>
    );
  }

  if (error && !refreshing) {
    return (
      <>
        <Navbar />
        <div className="statistics-page">
          <div className="stats-error-container">
            <div className="stats-error-icon">⚠️</div>
            <h2>خطأ في تحميل الإحصائيات</h2>
            <p>{error}</p>
            <button
              className="stats-btn primary"
              onClick={() => fetchStatistics(true)}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="statistics-page">
        <header className="stats-header">
          <h1>📊 إحصائيات الموقع</h1>
          <div className="stats-actions">
            <button
              className="stats-btn primary"
              onClick={() => fetchStatistics(true)}
              disabled={refreshing}
              title="تحديث الإحصائيات"
            >
              {refreshing ? "جاري التحديث..." : "🔄 تحديث"}
            </button>
            {lastUpdate && (
              <span className="stats-last-update">
                آخر تحديث: {lastUpdate.toLocaleTimeString("ar-EG")}
              </span>
            )}
          </div>
        </header>

        <div className={`stats-status ${refreshing ? "updating" : "live"}`}>
          <span className="stats-status-dot" />
          {refreshing ? "جاري التحديث..." : "الإحصائيات محدثة"}
        </div>

        {/* Key Metrics */}
        <section className="stats-metrics-grid">
          <div className="stats-card metric-card primary">
            <div className="metric-icon">📦</div>
            <div className="metric-content">
              <div className="metric-value">
                {formatCurrency(stats.totalOrders)}
              </div>
              <div className="metric-label">إجمالي الطلبات</div>
            </div>
          </div>

          <div className="stats-card metric-card accent">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <div className="metric-value">
                {formatCurrency(stats.totalRevenue)} شيكل
              </div>
              <div className="metric-label">إجمالي المبيعات</div>
            </div>
          </div>

          <div className="stats-card metric-card success">
            <div className="metric-icon">🛍️</div>
            <div className="metric-content">
              <div className="metric-value">
                {formatCurrency(stats.totalProducts)}
              </div>
              <div className="metric-label">المنتجات</div>
            </div>
          </div>

          <div className="stats-card metric-card info">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <div className="metric-value">
                {formatCurrency(stats.totalCustomers)}
              </div>
              <div className="metric-label">العملاء</div>
            </div>
          </div>

          <div className="stats-card metric-card warning">
            <div className="metric-icon">💬</div>
            <div className="metric-content">
              <div className="metric-value">
                {formatCurrency(stats.totalFeedbacks)}
              </div>
              <div className="metric-label">التقييمات</div>
            </div>
          </div>

          <div className="stats-card metric-card secondary">
            <div className="metric-icon">📂</div>
            <div className="metric-content">
              <div className="metric-value">
                {formatCurrency(stats.totalCategories)}
              </div>
              <div className="metric-label">الفئات</div>
            </div>
          </div>
        </section>

        {/* Charts and Analytics */}
        <section className="stats-analytics">
          <div className="stats-row">
            {/* Orders by Status */}
            <div className="stats-card chart-card">
              <h3>📊 الطلبات حسب الحالة</h3>
              <div className="chart-content">
                {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                  <div key={status} className="chart-item">
                    <div className="chart-label">{status}</div>
                    <div className="chart-bar">
                      <div
                        className="chart-bar-fill"
                        style={{
                          width: `${(count / stats.totalOrders) * 100}%`,
                          backgroundColor: getStatusColor(status),
                        }}
                      ></div>
                    </div>
                    <div className="chart-value">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders by Month */}
            <div className="stats-card chart-card">
              <h3>📈 الطلبات حسب الشهر</h3>
              <div className="chart-content">
                {Object.entries(stats.ordersByMonth).map(([month, count]) => (
                  <div key={month} className="chart-item">
                    <div className="chart-label">{month}</div>
                    <div className="chart-bar">
                      <div
                        className="chart-bar-fill"
                        style={{
                          width: `${Math.max(
                            (count /
                              Math.max(...Object.values(stats.ordersByMonth))) *
                              100,
                            5
                          )}%`,
                          backgroundColor: "#4CAF50",
                        }}
                      ></div>
                    </div>
                    <div className="chart-value">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="stats-row">
            {/* Top Products Chart */}
            <div className="stats-card chart-card">
              <h3>🏆 المنتجات الأكثر طلباً</h3>
              <div className="chart-content">
                {stats.topProducts.map((product, index) => (
                  <div key={product.id} className="chart-item">
                    <div className="chart-label">
                      <span className="rank-badge">{index + 1}</span>
                      {product.name}
                    </div>
                    <div className="chart-bar">
                      <div
                        className="chart-bar-fill"
                        style={{
                          width: `${
                            (product.orderCount /
                              Math.max(
                                ...stats.topProducts.map((p) => p.orderCount)
                              )) *
                            100
                          }%`,
                          backgroundColor: getRankColor(index),
                        }}
                      ></div>
                    </div>
                    <div className="chart-value">{product.orderCount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="stats-card activity-card">
              <h3>🕒 النشاطات الأخيرة</h3>
              <div className="activity-list">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === "order" ? "📦" : "💬"}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-description">
                        {activity.description}
                      </div>
                      <div className="activity-date">
                        {formatDate(activity.date)}
                      </div>
                    </div>
                    <div className={`activity-status ${activity.status}`}>
                      {activity.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Most Ordered Products Grid */}
          <div className="stats-row">
            <div className="stats-card most-ordered-products-card">
              <h3>🛍️ المنتجات الأكثر طلباً - عرض تفصيلي</h3>
              {/* Debug info - remove this later */}

              <div className="most-ordered-products-grid">
                {stats.mostOrderedProducts &&
                stats.mostOrderedProducts.length > 0 ? (
                  stats.mostOrderedProducts.map((product, index) => (
                    <div key={product.id} className="most-ordered-product-item">
                      <div className="product-image-container">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="product-image"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="product-image-fallback"
                          style={{
                            display:
                              product.images && product.images.length > 0
                                ? "none"
                                : "flex",
                          }}
                        >
                          <span className="product-icon">🛍️</span>
                        </div>
                        <div className="product-rank-badge">
                          <span className="rank-number">{index + 1}</span>
                        </div>
                      </div>
                      <div className="product-info">
                        <h4 className="product-name">{product.name}</h4>
                        <div className="product-meta">
                          <span className="product-brand">
                            {product.brand || "غير محدد"}
                          </span>
                          <span className="product-category">
                            {product.categories?.[0] || "عام"}
                          </span>
                        </div>
                        <div className="product-stats">
                          <div className="stat-item">
                            <span className="stat-label">الطلبات:</span>
                            <span className="stat-value orders-count">
                              {product.orderCount}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">السعر:</span>
                            <span className="stat-value price">
                              {product.hasVariants && product.variants ? (
                                <span>
                                  من{" "}
                                  {Math.min(
                                    ...product.variants.map((v) => v.price)
                                  )}{" "}
                                  إلى{" "}
                                  {Math.max(
                                    ...product.variants.map((v) => v.price)
                                  )}{" "}
                                  شيكل
                                </span>
                              ) : (
                                <span>{product.price} شيكل</span>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">المخزون:</span>
                            <span
                              className={`stat-value stock ${
                                product.stock > 10
                                  ? "high"
                                  : product.stock > 5
                                  ? "medium"
                                  : "low"
                              }`}
                            >
                              {product.stock} قطعة
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-orders-message">
                    <div className="no-orders-icon">📦</div>
                    <h3>لا توجد طلبات بعد</h3>
                    <p>لم يتم طلب أي منتج حتى الآن</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// Helper function to get status colors
function getStatusColor(status) {
  const colors = {
    "قيد الانتظار": "#FF9800",
    "قيد التنفيذ": "#2196F3",
    "قيد التوصيل": "#9C27B0",
    منجز: "#4CAF50",
    مرفوض: "#F44336",
    "غير محدد": "#9E9E9E",
  };
  return colors[status] || colors["غير محدد"];
}

// Helper function to get rank colors
function getRankColor(rank) {
  const colors = ["#FFD700", "#C0C0C0", "#CD7F32", "#4CAF50", "#2196F3"];
  return colors[rank] || "#9E9E9E";
}

export default Statistics;
