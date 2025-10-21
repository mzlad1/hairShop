import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/AdminDashboard.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null); // Add error state

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const statuses = useMemo(
    () => ["قيد الانتظار", "قيد التنفيذ", "قيد التوصيل", "منجز", "مرفوض"],
    []
  );

  const paths = useMemo(
    () => ({
      orders: "/admin/orders",
      products: "/admin/products",
      brands: "/admin/brands",
      categories: "/admin/categories",
    }),
    []
  );

  const fetchAll = async (force = false) => {
    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const getOrFetch = async (key, colName, ttlMs) => {
        if (!force) {
          const cached = CacheManager.get(key);
          if (cached && Array.isArray(cached)) {
            console.log(`Using cached data for ${colName}`);
            return cached;
          }
        }

        console.log(`Fetching fresh data for ${colName}`);
        const snap = await getDocs(collection(db, colName));
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));

        // Validate data structure
        if (!Array.isArray(data)) {
          throw new Error(`Invalid data structure for ${colName}`);
        }

        CacheManager.set(key, data, ttlMs);
        return data;
      };

      // Fetch all data with error handling for each collection
      const fetchPromises = [
        getOrFetch(CACHE_KEYS.ORDERS, "orders", 30 * 1000).catch((err) => {
          console.error("Error fetching orders:", err);
          return [];
        }),
        getOrFetch(CACHE_KEYS.PRODUCTS, "products", 5 * 60 * 1000).catch(
          (err) => {
            console.error("Error fetching products:", err);
            return [];
          }
        ),
        getOrFetch(CACHE_KEYS.BRANDS, "brands", 10 * 60 * 1000).catch((err) => {
          console.error("Error fetching brands:", err);
          return [];
        }),
        getOrFetch(CACHE_KEYS.CATEGORIES, "categories", 10 * 60 * 1000).catch(
          (err) => {
            console.error("Error fetching categories:", err);
            return [];
          }
        ),
      ];

      const [o, p, b, c] = await Promise.all(fetchPromises);

      // Validate and set data
      const ordersData = Array.isArray(o) ? o : [];
      const productsData = Array.isArray(p) ? p : [];
      const brandsData = Array.isArray(b) ? b : [];
      const categoriesData = Array.isArray(c) ? c : [];

      // Sort orders by date desc
      ordersData.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      // Set state only after all data is ready
      setOrders(ordersData);
      setProducts(productsData);
      setBrands(brandsData);
      setCategories(categoriesData);
      setLastUpdate(new Date());

      console.log("Dashboard data loaded successfully:", {
        orders: ordersData.length,
        products: productsData.length,
        brands: brandsData.length,
        categories: categoriesData.length,
      });
    } catch (e) {
      console.error("Dashboard fetch error:", e);
      setError("حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.");

      // Set empty arrays as fallback
      setOrders([]);
      setProducts([]);
      setBrands([]);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchAll(false);

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAll(true);
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const completed = orders.filter((o) => o.status === "منجز");
    const revenue = completed.reduce((s, o) => s + (o.total || 0), 0);

    const lowStock = products.filter(
      (p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5
    ).length;
    const outOfStock = products.filter((p) => (p.stock || 0) === 0).length;

    const byStatus = statuses.reduce((acc, st) => {
      acc[st] = orders.filter((o) => o.status === st).length;
      return acc;
    }, {});

    return {
      totalOrders,
      completedCount: completed.length,
      revenue,
      productsCount: products.length,
      lowStock,
      outOfStock,
      brandsCount: brands.length,
      categoriesCount: categories.length,
      byStatus,
    };
  }, [orders, products, brands, categories, statuses]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "-";
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      CacheManager.clearAll();
      navigate("/admin");
    } catch (error) {
      console.error("Sign out error:", error);
      navigate("/admin");
    }
  };

  // Show loading skeleton while initial loading
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="admin-dashboard">
          <div className="ad-loading-container">
            <div className="ad-loading-spinner"></div>
            <p>جاري تحميل البيانات...</p>
          </div>
        </div>
      </>
    );
  }

  // Show error state if there's an error
  if (error && !refreshing) {
    return (
      <>
        <Navbar />
        <div className="admin-dashboard">
          <div className="ad-error-container">
            <div className="ad-error-icon">⚠️</div>
            <h2>خطأ في تحميل البيانات</h2>
            <p>{error}</p>
            <button className="ad-btn primary" onClick={() => fetchAll(true)}>
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
      <div className="admin-dashboard">
        <header className="ad-header">
          <h1>لوحة التحكم</h1>
          <div className="ad-actions">
            <button
              className="ad-btn primary"
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              title="تحديث البيانات"
            >
              {refreshing ? "جاري التحديث..." : "🔄 تحديث"}
            </button>
            <button
              className="ad-btn ghost"
              onClick={handleSignOut}
              title="تسجيل الخروج"
            >
              🚪 تسجيل الخروج
            </button>
            {lastUpdate && (
              <span className="ad-last-update">
                آخر تحديث: {lastUpdate.toLocaleTimeString("ar-EG")}
              </span>
            )}
          </div>
        </header>

        <div className={`ad-status ${refreshing ? "updating" : "live"}`}>
          <span className="ad-status-dot" />
          {refreshing ? "جاري التحديث..." : "البيانات محدثة"}
        </div>

        <section className="ad-stats-grid" aria-label="الإحصائيات">
          <div className="ad-card stat">
            <div className="stat-label">إجمالي الطلبات</div>
            <div className="stat-value">{kpis.totalOrders}</div>
          </div>
          <div className="ad-card stat">
            <div className="stat-label">طلبات منجزة</div>
            <div className="stat-value">{kpis.completedCount}</div>
          </div>

          <div className="ad-card stat">
            <div className="stat-label">المنتجات</div>
            <div className="stat-value">{kpis.productsCount}</div>
          </div>
          <div className="ad-card stat warn">
            <div className="stat-label">مخزون قليل</div>
            <div className="stat-value">{kpis.lowStock}</div>
          </div>
          <div className="ad-card stat danger">
            <div className="stat-label">نفدت الكمية</div>
            <div className="stat-value">{kpis.outOfStock}</div>
          </div>
          <div className="ad-card stat">
            <div className="stat-label">العلامات التجارية</div>
            <div className="stat-value">{kpis.brandsCount}</div>
          </div>
          <div className="ad-card stat">
            <div className="stat-label">الفئات</div>
            <div className="stat-value">{kpis.categoriesCount}</div>
          </div>
        </section>

        <section className="ad-content">
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>أحدث الطلبات</h2>
              <Link to={paths.orders} className="ad-btn ghost">
                عرض الكل
              </Link>
            </div>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>المجموع</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.customerName || "-"}</td>
                      <td>{o.total || 0} شيكل</td>
                      <td>
                        <span
                          className={`ad-badge ${String(o.status || "").replace(
                            /\s/g,
                            ""
                          )}`}
                        >
                          {o.status || "-"}
                        </span>
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" className="ad-empty">
                        لا توجد طلبات حديثة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>روابط سريعة</h2>
            </div>
            <div className="ad-quick-grid">
              <Link to={paths.orders} className="ad-tile">
                <span className="tile-title">الطلبات</span>
                <span className="tile-sub">عرض وإدارة الطلبات</span>
              </Link>
              <Link to={paths.products} className="ad-tile">
                <span className="tile-title">المنتجات</span>
                <span className="tile-sub">إدارة منتجات العناية بالشعر</span>
              </Link>
              <Link to={paths.brands} className="ad-tile">
                <span className="tile-title">العلامات التجارية</span>
                <span className="tile-sub">إدارة العلامات</span>
              </Link>
              <Link to={paths.categories} className="ad-tile">
                <span className="tile-title">الفئات</span>
                <span className="tile-sub">إدارة الفئات</span>
              </Link>
              <Link to="/admin/feedbacks" className="ad-tile">
                <span className="tile-title">تقييمات العملاء</span>
                <span className="tile-sub">مراجعة والموافقة على التقييمات</span>
              </Link>
              <Link to="/admin/discounts" className="ad-tile">
                <span className="tile-title">الخصومات</span>
                <span className="tile-sub">
                  تطبيق خصومات على المنتجات والفئات
                </span>
              </Link>
              <Link to="/admin/statistics" className="ad-tile">
                <span className="tile-title">إحصائيات الموقع</span>
                <span className="tile-sub">
                  عرض إحصائيات شاملة عن الموقع والزوار
                </span>
              </Link>
              <Link to="/admin/hero-slides" className="ad-tile">
                <span className="tile-title">شرائح الصفحة الرئيسية</span>
                <span className="tile-sub">
                  إدارة الشرائح المتحركة في الصفحة الرئيسية
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default AdminDashboard;
