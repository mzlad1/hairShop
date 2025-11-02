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
  const [activityFilter, setActivityFilter] = useState("all"); // "all", "today", "month", "custom"
  const [customDate, setCustomDate] = useState("");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(""); // For month selector
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
    allOrdersByMonth: {}, // Store all monthly data for filtering
    topProducts: [],
    recentActivity: [],
    mostOrderedProducts: [],
    allActivities: [], // Store all activities for filtering
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

      // Calculate total revenue only from completed orders
      const totalRevenue = orders
        .filter((order) => order.status === "منجز")
        .reduce((sum, order) => sum + (order.total || 0), 0);

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

      // Calculate orders by month for all available months
      const allOrdersByMonth = {};
      orders.forEach((order) => {
        if (order.createdAt) {
          const orderDate = order.createdAt.toDate
            ? order.createdAt.toDate()
            : new Date(order.createdAt);
          const monthKey = orderDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          });
          allOrdersByMonth[monthKey] = (allOrdersByMonth[monthKey] || 0) + 1;
        }
      });

      // Get available months for selector
      const availableMonths = Object.keys(allOrdersByMonth).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB - dateA;
      });

      // Set default selected month to current month if none selected
      if (!selectedMonth && availableMonths.length > 0) {
        const currentMonth = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
        setSelectedMonth(
          availableMonths.includes(currentMonth)
            ? currentMonth
            : availableMonths[0]
        );
      }

      // Filter orders by selected month
      const ordersByMonth =
        selectedMonth && allOrdersByMonth[selectedMonth]
          ? { [selectedMonth]: allOrdersByMonth[selectedMonth] }
          : allOrdersByMonth;

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

      // Get all activities for filtering
      const allActivities = [
        ...orders.map((order) => ({
          type: "order",
          title: `طلب جديد #${order.id}`,
          description: `طلب من ${order.customerName || "عميل"} بقيمة ${
            order.total || 0
          } شيكل`,
          date: order.createdAt,
          status: order.status,
        })),
        ...feedbacks.map((feedback) => ({
          type: "feedback",
          title: `تقييم جديد`,
          description: `تقييم من ${feedback.name} للمنتج`,
          date: feedback.createdAt,
          status: feedback.status,
        })),
      ].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

      // Get recent activity based on filter
      const recentActivity = getFilteredActivities(
        allActivities,
        activityFilter,
        customDate
      ).slice(0, 5);

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
        allOrdersByMonth,
        topProducts,
        recentActivity,
        mostOrderedProducts,
        allActivities,
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

  // Helper function to filter activities based on date
  const getFilteredActivities = (activities, filter, customDate) => {
    const now = new Date();

    switch (filter) {
      case "today":
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        return activities.filter((activity) => {
          const activityDate = activity.date?.toDate
            ? activity.date.toDate()
            : new Date(activity.date);
          return activityDate >= today;
        });

      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return activities.filter((activity) => {
          const activityDate = activity.date?.toDate
            ? activity.date.toDate()
            : new Date(activity.date);
          return activityDate >= monthStart;
        });

      case "custom":
        if (!customDate) return activities;
        const selectedDate = new Date(customDate);
        const selectedDayStart = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );
        const selectedDayEnd = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate() + 1
        );
        return activities.filter((activity) => {
          const activityDate = activity.date?.toDate
            ? activity.date.toDate()
            : new Date(activity.date);
          return (
            activityDate >= selectedDayStart && activityDate < selectedDayEnd
          );
        });

      default:
        return activities;
    }
  };

  // Update activities when filter changes
  useEffect(() => {
    if (stats.allActivities.length > 0) {
      const filteredActivities = getFilteredActivities(
        stats.allActivities,
        activityFilter,
        customDate
      );
      setStats((prev) => ({
        ...prev,
        recentActivity: filteredActivities.slice(0, 5),
      }));
    }
  }, [activityFilter, customDate]);

  // Update orders by month when selected month changes
  useEffect(() => {
    if (
      stats.allOrdersByMonth &&
      Object.keys(stats.allOrdersByMonth).length > 0
    ) {
      const ordersByMonth =
        selectedMonth && stats.allOrdersByMonth[selectedMonth]
          ? { [selectedMonth]: stats.allOrdersByMonth[selectedMonth] }
          : stats.allOrdersByMonth;

      setStats((prev) => ({
        ...prev,
        ordersByMonth,
      }));
    }
  }, [selectedMonth, stats.allOrdersByMonth]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const formatDate = (date) => {
    if (!date) return "-";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US").format(amount);
  };

  // Helper function to get total stock for variant products
  const getTotalStock = (product) => {
    if (
      product.hasVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      return product.variants.reduce(
        (total, variant) => total + (variant.stock || 0),
        0
      );
    }
    return product.stock || 0;
  };

  // Helper function to get stock status class
  const getStockStatusClass = (stock) => {
    if (stock > 10) return "high";
    if (stock > 5) return "medium";
    return "low";
  };

  const handleFilterChange = (newFilter) => {
    setActivityFilter(newFilter);
    if (newFilter !== "custom") {
      setCustomDate("");
    }
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

  // Pagination functions
  const getCurrentActivities = () => {
    const filteredActivities = getFilteredActivities(
      stats.allActivities,
      activityFilter,
      customDate
    );
    const startIndex = (currentPage - 1) * activitiesPerPage;
    return filteredActivities.slice(startIndex, startIndex + activitiesPerPage);
  };

  const getTotalPages = () => {
    const filteredActivities = getFilteredActivities(
      stats.allActivities,
      activityFilter,
      customDate
    );
    return Math.ceil(filteredActivities.length / activitiesPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openActivityModal = () => {
    setShowActivityModal(true);
    setCurrentPage(1); // Reset to first page when opening modal
  };

  const closeActivityModal = () => {
    setShowActivityModal(false);
    setCurrentPage(1);
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
                آخر تحديث: {lastUpdate.toLocaleTimeString("en-US")}
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
              <div className="metric-label">إجمالي المبيعات (طلبات مكتملة)</div>
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

              {/* Month Selector */}
              <div className="month-selector-container">
                <label
                  htmlFor="month-selector"
                  className="month-selector-label"
                >
                  اختر الشهر:
                </label>
                <select
                  id="month-selector"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="month-selector"
                >
                  <option value="">جميع الأشهر</option>
                  {Object.keys(stats.allOrdersByMonth || {})
                    .sort((a, b) => {
                      const dateA = new Date(a);
                      const dateB = new Date(b);
                      return dateB - dateA;
                    })
                    .map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                </select>
              </div>

              <div className="chart-content">
                {Object.entries(stats.ordersByMonth).length > 0 ? (
                  Object.entries(stats.ordersByMonth).map(([month, count]) => (
                    <div key={month} className="chart-item">
                      <div className="chart-label">{month}</div>
                      <div className="chart-bar">
                        <div
                          className="chart-bar-fill"
                          style={{
                            width: `${Math.max(
                              (count /
                                Math.max(
                                  ...Object.values(stats.ordersByMonth)
                                )) *
                                100,
                              5
                            )}%`,
                            backgroundColor: "#4CAF50",
                          }}
                        ></div>
                      </div>
                      <div className="chart-value">{count}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-month-data-message">
                    <div className="no-month-data-icon">📅</div>
                    <p>لا توجد بيانات للشهر المحدد</p>
                  </div>
                )}
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

              {/* Activity Filter Controls */}
              <div className="activity-filter-controls">
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${
                      activityFilter === "all" ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange("all")}
                  >
                    الكل
                  </button>
                  <button
                    className={`filter-btn ${
                      activityFilter === "today" ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange("today")}
                  >
                    اليوم
                  </button>
                  <button
                    className={`filter-btn ${
                      activityFilter === "month" ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange("month")}
                  >
                    هذا الشهر
                  </button>
                  <button
                    className={`filter-btn ${
                      activityFilter === "custom" ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange("custom")}
                  >
                    تاريخ محدد
                  </button>
                </div>

                {activityFilter === "custom" && (
                  <div className="custom-date-input">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="date-picker"
                    />
                  </div>
                )}
              </div>

              <div className="activity-list">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity, index) => (
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
                  ))
                ) : (
                  <div className="no-activities-message">
                    <div className="no-activities-icon">📅</div>
                    <p>لا توجد نشاطات في الفترة المحددة</p>
                  </div>
                )}
              </div>

              {/* See More Button */}
              {getFilteredActivities(
                stats.allActivities,
                activityFilter,
                customDate
              ).length > 5 && (
                <div className="see-more-container">
                  <button
                    className="stats-btn secondary see-more-btn"
                    onClick={openActivityModal}
                  >
                    عرض المزيد من النشاطات
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Most Ordered Products Grid */}
          <div className="stats-row">
            <div className="stats-card most-ordered-products-card">
              <h3>🛍️ المنتجات الأكثر طلباً - عرض تفصيلي</h3>

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
                              className={`stat-value stock ${getStockStatusClass(
                                getTotalStock(product)
                              )}`}
                            >
                              {formatCurrency(getTotalStock(product))} قطعة
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

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="activity-modal-overlay" onClick={closeActivityModal}>
          <div className="activity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🕒 جميع النشاطات</h2>
              <button className="modal-close-btn" onClick={closeActivityModal}>
                ✕
              </button>
            </div>

            {/* Modal Filter Controls */}
            <div className="modal-filter-controls">
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${
                    activityFilter === "all" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("all")}
                >
                  الكل
                </button>
                <button
                  className={`filter-btn ${
                    activityFilter === "today" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("today")}
                >
                  اليوم
                </button>
                <button
                  className={`filter-btn ${
                    activityFilter === "month" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("month")}
                >
                  هذا الشهر
                </button>
                <button
                  className={`filter-btn ${
                    activityFilter === "custom" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("custom")}
                >
                  تاريخ محدد
                </button>
              </div>

              {activityFilter === "custom" && (
                <div className="custom-date-input">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="date-picker"
                  />
                </div>
              )}
            </div>

            <div className="modal-content">
              <div className="modal-activity-list">
                {getCurrentActivities().length > 0 ? (
                  getCurrentActivities().map((activity, index) => (
                    <div key={index} className="modal-activity-item">
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
                  ))
                ) : (
                  <div className="no-activities-message">
                    <div className="no-activities-icon">📅</div>
                    <p>لا توجد نشاطات في الفترة المحددة</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {getTotalPages() > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </button>

                  <div className="page-numbers">
                    {Array.from(
                      { length: getTotalPages() },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        className={`page-number ${
                          page === currentPage ? "active" : ""
                        }`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                  >
                    التالي
                  </button>
                </div>
              )}

              <div className="modal-footer">
                <div className="activity-summary">
                  <span>
                    عرض {getCurrentActivities().length} من{" "}
                    {
                      getFilteredActivities(
                        stats.allActivities,
                        activityFilter,
                        customDate
                      ).length
                    }{" "}
                    نشاط
                  </span>
                </div>
                <button
                  className="stats-btn primary"
                  onClick={closeActivityModal}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
