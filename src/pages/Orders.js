import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/Orders.css";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// صفحة عرض الطلبات وإدارتها
function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Add search term
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" }); // Add date filter
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [stats, setStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // 5 orders per page
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const statuses = [
    "قيد الانتظار",
    "قيد التنفيذ",
    "قيد التوصيل",
    "منجز",
    "مرفوض",
  ];

  // Force refresh function
  const forceRefresh = async () => {
    setRefreshing(true);
    // Clear cache
    CacheManager.remove(CACHE_KEYS.ORDERS);
    await fetchOrders(true);
    setRefreshing(false);
  };

  // Modified fetch function with force parameter
  const fetchOrders = async (forceRefresh = false) => {
    try {
      // For orders, use very short cache (30 seconds) or force refresh
      const cacheTime = 30 * 1000; // 30 seconds
      const cachedOrders = !forceRefresh
        ? CacheManager.get(CACHE_KEYS.ORDERS)
        : null;

      if (cachedOrders && !forceRefresh) {
        console.log("Loading orders from cache (30s TTL)");
        setOrders(cachedOrders);
        calculateStats(cachedOrders);
        setLastFetch(
          new Date(
            JSON.parse(localStorage.getItem(CACHE_KEYS.ORDERS))?.timestamp
          )
        );
        return;
      }

      console.log("Fetching fresh orders from Firebase");
      const snapshot = await getDocs(collection(db, "orders"));
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

      // ترتيب الطلبات حسب التاريخ (الأحدث أولاً)
      data.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      setOrders(data);
      setLastFetch(new Date());

      // Cache for only 30 seconds for orders
      CacheManager.set(CACHE_KEYS.ORDERS, data, cacheTime);

      calculateStats(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      // بيانات تجريبية
      setOrders([
        {
          id: "order1",
          customerName: "أحمد",
          customerEmail: "ahmed@example.com",
          customerPhone: "0590xxxxxx",
          customerAddress: "شارع xx، نابلس",
          items: [{ id: "1", name: "كريم مرطب", price: 50, quantity: 2 }],
          total: 100,
          status: "قيد الانتظار",
          createdAt: { seconds: Date.now() / 1000 },
        },
      ]);
    }
  };

  function calculateStats(ordersData) {
    // حساب الإحصائيات
    const orderStats = statuses.reduce((acc, status) => {
      acc[status] = ordersData.filter(
        (order) => order.status === status
      ).length;
      return acc;
    }, {});
    orderStats.total = ordersData.length;
    orderStats.totalRevenue = ordersData
      .filter((order) => order.status === "منجز")
      .reduce((sum, order) => sum + (order.total || 0), 0);
    setStats(orderStats);
  }

  // Auto-refresh every 2 minutes when component is visible
  useEffect(() => {
    let interval;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refresh when user comes back to tab
        forceRefresh();
      }
    };

    // Initial fetch
    fetchOrders();

    // Set up auto-refresh every 2 minutes
    interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrders(true); // Force refresh every 2 minutes
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Listen for tab visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const currentOrder = orders.find((order) => order.id === orderId);

      if (!currentOrder) {
        console.error("Order not found for status update");
        return;
      }

      // If status is changing to "مرفوض" (rejected), restore stock
      if (newStatus === "مرفوض" && currentOrder.status !== "مرفوض") {
        // Use Firestore transaction to ensure data consistency
        const result = await runTransaction(db, async (transaction) => {
          // Restore stock for all items in the order
          const stockRestorations = [];

          for (const item of currentOrder.items || []) {
            const productRef = doc(db, "products", item.id);
            const productSnap = await transaction.get(productRef);

            if (productSnap.exists()) {
              const productData = productSnap.data();
              let stockUpdateData = {};

              if (productData.hasVariants && item.selectedVariant) {
                // For variant products, restore specific variant stock
                const updatedVariants = productData.variants.map((v) => {
                  if (
                    v.size === item.selectedVariant.size &&
                    v.color === item.selectedVariant.color
                  ) {
                    return {
                      ...v,
                      stock: parseInt(v.stock || 0) + item.quantity,
                    };
                  }
                  return v;
                });

                stockUpdateData = { variants: updatedVariants };
              } else {
                // For regular products, restore product stock
                stockUpdateData = {
                  stock: parseInt(productData.stock || 0) + item.quantity,
                };
              }

              stockRestorations.push({
                ref: productRef,
                updateData: stockUpdateData,
              });
            }
          }

          // Restore stock for all products
          stockRestorations.forEach(({ ref, updateData }) => {
            transaction.update(ref, updateData);
          });

          // Update order status
          transaction.update(orderRef, { status: newStatus });

          return "success";
        });

        // Transaction successful
        const updatedOrders = orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        );
        setOrders(updatedOrders);

        // Update cache with short TTL and refresh stats
        CacheManager.set(CACHE_KEYS.ORDERS, updatedOrders, 30 * 1000);
        calculateStats(updatedOrders);

        // Optionally fetch fresh data after status change
        setTimeout(() => fetchOrders(true), 1000);
      } else {
        // For other status changes, just update the status
        await updateDoc(orderRef, { status: newStatus });
        const updatedOrders = orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        );
        setOrders(updatedOrders);

        // Update cache with short TTL and refresh stats
        CacheManager.set(CACHE_KEYS.ORDERS, updatedOrders, 30 * 1000);
        calculateStats(updatedOrders);

        // Optionally fetch fresh data after status change
        setTimeout(() => fetchOrders(true), 1000);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("حدث خطأ أثناء تحديث حالة الطلب. يرجى المحاولة مرة أخرى.");
    }
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("هل تريد حذف هذا الطلب؟")) return;

    try {
      // Find the order to get its items before deletion
      const orderToDelete = orders.find((order) => order.id === orderId);
      if (!orderToDelete) {
        console.error("Order not found for deletion");
        return;
      }

      // Use Firestore transaction to ensure data consistency
      const result = await runTransaction(db, async (transaction) => {
        // First, restore stock for all items in the order
        const stockRestorations = [];

        for (const item of orderToDelete.items || []) {
          const productRef = doc(db, "products", item.id);
          const productSnap = await transaction.get(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();
            let stockUpdateData = {};

            if (productData.hasVariants && item.selectedVariant) {
              // For variant products, restore specific variant stock
              const updatedVariants = productData.variants.map((v) => {
                if (
                  v.size === item.selectedVariant.size &&
                  v.color === item.selectedVariant.color
                ) {
                  return {
                    ...v,
                    stock: parseInt(v.stock || 0) + item.quantity,
                  };
                }
                return v;
              });

              stockUpdateData = { variants: updatedVariants };
            } else {
              // For regular products, restore product stock
              stockUpdateData = {
                stock: parseInt(productData.stock || 0) + item.quantity,
              };
            }

            stockRestorations.push({
              ref: productRef,
              updateData: stockUpdateData,
            });
          }
        }

        // Restore stock for all products
        stockRestorations.forEach(({ ref, updateData }) => {
          transaction.update(ref, updateData);
        });

        // Delete the order
        const orderRef = doc(db, "orders", orderId);
        transaction.delete(orderRef);

        return "success";
      });

      // Transaction successful
      const updatedOrders = orders.filter((order) => order.id !== orderId);
      setOrders(updatedOrders);

      // Update cache and stats
      CacheManager.set(CACHE_KEYS.ORDERS, updatedOrders, 30 * 1000);
      calculateStats(updatedOrders);

      // Fetch fresh data after deletion
      setTimeout(() => fetchOrders(true), 1000);
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("حدث خطأ أثناء حذف الطلب. يرجى المحاولة مرة أخرى.");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      "قيد الانتظار": "#f39c12",
      "قيد التنفيذ": "#3498db",
      "قيد التوصيل": "#9b59b6",
      منجز: "#27ae60",
      مرفوض: "#e74c3c",
    };
    return colors[status] || "#95a5a6";
  };

  // Enhanced filtering function
  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filter by search term (customer name, email, phone, or order ID)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.customerEmail?.toLowerCase().includes(searchLower) ||
          order.customerPhone?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter((order) => {
        if (!order.createdAt?.seconds) return false;
        const orderDate = new Date(order.createdAt.seconds * 1000);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end
          ? new Date(dateFilter.end + "T23:59:59")
          : null;

        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, dateFilter]);

  const handleDateFilterChange = (field, value) => {
    setDateFilter((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setStatusFilter("");
    setSearchTerm("");
    setDateFilter({ start: "", end: "" });
  };

  // تنسيق التاريخ من الطابع الزمني
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "numeric", // Changed from "long" to "numeric"
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Navbar />
      <div className="orders-page">
        <div className="orders-header">
          <h1>إدارة الطلبات</h1>
          <div className="orders-actions">
            <button
              className="refresh-btn"
              onClick={forceRefresh}
              disabled={refreshing}
              title="تحديث البيانات"
            >
              {refreshing ? "جاري التحديث..." : "🔄 تحديث"}
            </button>
            {lastFetch && (
              <span className="last-update">
                آخر تحديث: {lastFetch.toLocaleTimeString("ar-EG")}
              </span>
            )}
          </div>
        </div>

        {/* Stock Management Note */}
        <div className="orders-stock-note">
          <div className="stock-note-content">
            <span className="stock-note-icon">📦</span>
            <span className="stock-note-text">
              <strong>ملاحظة:</strong> يتم إدارة المخزون تلقائياً. عند حذف الطلب
              أو رفضه، يتم إرجاع الكميات إلى المخزون.
            </span>
          </div>
        </div>

        {/* Real-time indicator */}
        <div className="realtime-status">
          <div
            className={`status-indicator ${refreshing ? "updating" : "live"}`}
          >
            <span className="status-dot"></span>
            {refreshing ? "جاري التحديث..." : "البيانات محدثة"}
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="orders-stats">
          <div className="ord-stat-card">
            <h3>إجمالي الطلبات</h3>
            <p className="ord-stat-number">{stats.total || 0}</p>
          </div>
          <div className="ord-stat-card ord-pending">
            <h3>قيد الانتظار</h3>
            <p className="ord-stat-number">{stats["قيد الانتظار"] || 0}</p>
          </div>
          <div className="ord-stat-card ord-completed">
            <h3>منجز</h3>
            <p className="ord-stat-number">{stats["منجز"] || 0}</p>
          </div>
          <div className="ord-stat-card ord-revenue">
            <h3>إجمالي المبيعات</h3>
            <p className="ord-stat-number">{stats.totalRevenue || 0} شيكل</p>
          </div>
        </div>

        <div className="orders-controls">
          <div className="search-section">
            <label>البحث في الطلبات:</label>
            <input
              type="text"
              placeholder="ابحث بالاسم، الإيميل، الهاتف، أو رقم الطلب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ord-search-input"
            />
          </div>

          <div className="date-filter-section">
            <label>تصفية حسب التاريخ:</label>
            <div className="ord-date-inputs">
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  handleDateFilterChange("start", e.target.value)
                }
                className="ord-date-input"
                placeholder="من تاريخ"
              />
              <span>إلى</span>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => handleDateFilterChange("end", e.target.value)}
                className="ord-date-input"
                placeholder="إلى تاريخ"
              />
            </div>
          </div>

          <div className="filter-section">
            <label>تصفية الحالة:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">كل الحالات</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status} ({stats[status] || 0})
                </option>
              ))}
            </select>
          </div>

          <button className="ord-clear-filters-btn" onClick={clearFilters}>
            مسح الفلاتر
          </button>

          <div className="orders-count">
            عرض {indexOfFirstItem + 1}-
            {Math.min(indexOfLastItem, filteredOrders.length)} من{" "}
            {filteredOrders.length} طلب
          </div>
        </div>

        <div className="orders-container">
          {currentOrders.map((order) => (
            <div key={order.id} className="ord-card">
              <div
                className="ord-header"
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div className="ord-basic-info">
                  <div className="ord-id">#{order.id}</div>
                  <div className="ord-customer-name">{order.customerName}</div>
                  <div className="ord-date">{formatDate(order.createdAt)}</div>
                  <div className="ord-total">{order.total} شيكل</div>
                  <div
                    className="ord-status"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </div>
                  <button className="ord-expand-btn">
                    {expandedOrders.has(order.id) ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {expandedOrders.has(order.id) && (
                <div className="ord-details">
                  <div className="ord-customer-details">
                    <h4>معلومات العميل:</h4>
                    <p>
                      <strong>👤 الاسم:</strong> {order.customerName}
                    </p>
                    <p>
                      <strong>📧 البريد:</strong> {order.customerEmail}
                    </p>
                    <p>
                      <strong>📞 الهاتف:</strong> {order.customerPhone}
                    </p>
                    <p>
                      <strong>📍 العنوان:</strong> {order.customerAddress}
                    </p>
                  </div>

                  {/* Order Summary with Variant Info */}

                  {/* Delivery Information */}
                  {(order.deliveryFee || order.deliveryOption) && (
                    <div className="ord-delivery-info">
                      <h4>معلومات التوصيل:</h4>
                      <div className="ord-delivery-details">
                        {order.deliveryOption && (
                          <div className="ord-delivery-item">
                            <span className="ord-delivery-label">
                              منطقة التوصيل:
                            </span>
                            <span className="ord-delivery-value">
                              {order.deliveryOption}
                            </span>
                          </div>
                        )}
                        {order.deliveryFee && (
                          <div className="ord-delivery-item">
                            <span className="ord-delivery-label">
                              رسوم التوصيل:
                            </span>
                            <span className="ord-delivery-value">
                              {order.deliveryFee} شيكل
                            </span>
                          </div>
                        )}
                        {order.subtotal && (
                          <div className="ord-delivery-item">
                            <span className="ord-delivery-label">
                              المجموع الفرعي:
                            </span>
                            <span className="ord-delivery-value">
                              {order.subtotal} شيكل
                            </span>
                          </div>
                        )}
                        <div className="ord-delivery-item ord-delivery-total">
                          <span className="ord-delivery-label">
                            الإجمالي النهائي:
                          </span>
                          <span className="ord-delivery-value">
                            {order.total} شيكل
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="ord-items">
                    <h4>تفاصيل الطلب:</h4>
                    <table className="ord-items-table">
                      <thead>
                        <tr>
                          <th>المنتج</th>
                          <th>السعر</th>
                          <th>الكمية</th>
                          <th>المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <div className="ord-item-details">
                                {item.id ? (
                                  <Link
                                    to={`/products/${item.id}`}
                                    target="_blank"
                                    className="ord-product-link"
                                    onClick={(e) => e.stopPropagation()}
                                    title={`عرض تفاصيل ${item.name}`}
                                  >
                                    {item.name}
                                    <span className="ord-link-icon">🔗</span>
                                  </Link>
                                ) : (
                                  <span className="ord-product-name">
                                    {item.name}
                                    <span
                                      className="ord-no-link-note"
                                      title="معرف المنتج غير متوفر"
                                    >
                                      📦
                                    </span>
                                  </span>
                                )}

                                {/* Show variant information if available */}
                                {item.selectedVariant && (
                                  <div className="ord-variant-info">
                                    <span className="ord-variant-badge">
                                      متغير: {item.selectedVariant.size} -{" "}
                                      {item.selectedVariant.color}
                                    </span>
                                    <span className="ord-variant-price">
                                      سعر المتغير:{" "}
                                      {parseFloat(item.selectedVariant.price) ||
                                        item.price}{" "}
                                      شيكل
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {item.selectedVariant &&
                              item.selectedVariant.price
                                ? `${parseFloat(
                                    item.selectedVariant.price
                                  )} شيكل`
                                : `${item.price} شيكل`}
                            </td>
                            <td>{item.quantity}</td>
                            <td>
                              {(() => {
                                const itemPrice =
                                  item.selectedVariant &&
                                  item.selectedVariant.price
                                    ? parseFloat(item.selectedVariant.price)
                                    : item.price;
                                return `${itemPrice * item.quantity} شيكل`;
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ord-actions">
                    <div className="status-update">
                      <label>تحديث الحالة:</label>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value)
                        }
                        className="ord-status-select"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ord-action-buttons">
                      <button
                        className="ord-action-btn ord-delete-btn"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="ord-pagination">
            <button
              className="ord-pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              السابق
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  className={`ord-pagination-btn ${
                    currentPage === pageNumber ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              className="ord-pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              التالي
            </button>
          </div>
        )}

        {filteredOrders.length === 0 && (
          <div className="ord-no-orders">
            <p>لا توجد طلبات {statusFilter ? `بحالة "${statusFilter}"` : ""}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default Orders;
