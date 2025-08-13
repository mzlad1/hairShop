import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/ManageBrands.css";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// صفحة إدارة العلامات التجارية
function ManageBrands() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    logo: "",
    website: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Add search functionality
  const [currentPage, setCurrentPage] = useState(1); // Add pagination
  const [itemsPerPage] = useState(6); // 6 brands per page

  useEffect(() => {
    async function fetchBrands() {
      try {
        // Check cache first
        const cachedBrands = CacheManager.get(CACHE_KEYS.BRANDS);
        if (cachedBrands) {
          console.log("Loading brands from cache");
          setBrands(cachedBrands);
          return;
        }

        console.log("Fetching brands from Firebase");
        const snapshot = await getDocs(collection(db, "brands"));
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setBrands(data);

        // Cache for 10 minutes
        CacheManager.set(CACHE_KEYS.BRANDS, data, 10 * 60 * 1000);
      } catch (error) {
        console.error("Error fetching brands:", error);
        // بيانات تجريبية
        setBrands([
          {
            id: "brand1",
            name: "لوريال",
            description: "علامة تجارية فرنسية للعناية بالشعر",
            logo: "",
            website: "https://loreal.com",
            country: "فرنسا",
          },
          {
            id: "brand2",
            name: "بانتين",
            description: "منتجات العناية بالشعر من بروكتر آند جامبل",
            logo: "",
            website: "https://pantene.com",
            country: "أمريكا",
          },
          {
            id: "brand3",
            name: "هيد آند شولدرز",
            description: "شامبو ضد القشرة",
            logo: "",
            website: "https://headandshoulders.com",
            country: "أمريكا",
          },
        ]);
      }
    }
    fetchBrands();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      name: formData.name,
      description: formData.description,
      logo: formData.logo,
      website: formData.website,
      country: formData.country,
    };
    try {
      let updatedBrands;
      if (formData.id) {
        // تحديث
        const docRef = doc(db, "brands", formData.id);
        await updateDoc(docRef, data);
        updatedBrands = brands.map((b) =>
          b.id === formData.id ? { id: b.id, ...data } : b
        );
      } else {
        // إضافة
        const docRef = await addDoc(collection(db, "brands"), data);
        updatedBrands = [...brands, { id: docRef.id, ...data }];
      }

      setBrands(updatedBrands);

      // Update cache
      CacheManager.set(CACHE_KEYS.BRANDS, updatedBrands, 10 * 60 * 1000);

      // إعادة تعيين النموذج
      setFormData({
        id: null,
        name: "",
        description: "",
        logo: "",
        website: "",
        country: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error saving brand:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand) => {
    setFormData({
      id: brand.id,
      name: brand.name,
      description: brand.description || "",
      logo: brand.logo || "",
      website: brand.website || "",
      country: brand.country || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذه العلامة التجارية؟")) return;
    try {
      await deleteDoc(doc(db, "brands", id));
      const updatedBrands = brands.filter((b) => b.id !== id);
      setBrands(updatedBrands);

      // Update cache
      CacheManager.set(CACHE_KEYS.BRANDS, updatedBrands, 10 * 60 * 1000);
    } catch (error) {
      console.error("Error deleting brand:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      id: null,
      name: "",
      description: "",
      logo: "",
      website: "",
      country: "",
    });
    setShowForm(false);
  };

  // Filter brands based on search term
  const filteredBrands = searchTerm
    ? brands.filter(
        (brand) =>
          brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          brand.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          brand.country?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : brands;

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBrands = filteredBrands.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <>
      <Navbar />
      <div className="manage-brands-page">
        <h1>إدارة العلامات التجارية</h1>

        {/* Add Brand Button */}
        {!showForm && (
          <div className="mb-add-section">
            <button className="mb-add-button" onClick={() => setShowForm(true)}>
              + إضافة علامة تجارية جديدة
            </button>
          </div>
        )}

        {/* Search Section */}
        {!showForm && (
          <div className="mb-search-bar">
            <input
              type="text"
              placeholder="ابحث عن علامة تجارية بالاسم، الوصف، أو بلد المنشأ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-search-input"
            />
            <div className="mb-brands-count">
              عرض {indexOfFirstItem + 1}-
              {Math.min(indexOfLastItem, filteredBrands.length)} من{" "}
              {filteredBrands.length} علامة تجارية
            </div>
          </div>
        )}

        {/* Brand Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-form">
            <h2>
              {formData.id
                ? "تعديل العلامة التجارية"
                : "إضافة علامة تجارية جديدة"}
            </h2>

            <div className="mb-form-group">
              <label>اسم العلامة التجارية:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                required
                onChange={handleChange}
                placeholder="مثال: لوريال"
              />
            </div>

            <div className="mb-form-group">
              <label>الوصف:</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="وصف مختصر عن العلامة التجارية"
              />
            </div>

            <div className="mb-form-group">
              <label>رابط الشعار:</label>
              <input
                type="url"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="mb-form-group">
              <label>الموقع الرسمي:</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="mb-form-group">
              <label>بلد المنشأ:</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="مثال: فرنسا"
              />
            </div>

            <button type="submit" className="mb-save-btn" disabled={loading}>
              {loading ? "جاري الحفظ..." : formData.id ? "تحديث" : "إضافة"}
            </button>
            <button
              type="button"
              className="mb-cancel-btn"
              onClick={handleCancel}
            >
              إلغاء
            </button>
          </form>
        )}

        {/* Brands Table */}
        <table className="mb-table">
          <thead>
            <tr>
              <th>الشعار</th>
              <th>الاسم</th>
              <th>الوصف</th>
              <th>بلد المنشأ</th>
              <th>الموقع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentBrands.map((brand) => (
              <tr key={brand.id}>
                <td data-label="الشعار">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="mb-brand-logo"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="mb-no-logo">🏷️</div>
                  )}
                </td>
                <td data-label="الاسم" className="mb-brand-name">
                  {brand.name}
                </td>
                <td data-label="الوصف" className="mb-brand-description">
                  {brand.description || "لا يوجد وصف"}
                </td>
                <td data-label="بلد المنشأ">{brand.country || "-"}</td>
                <td data-label="الموقع">
                  {brand.website ? (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-website-link"
                    >
                      زيارة الموقع
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td data-label="إجراءات">
                  <button
                    className="mb-edit-btn"
                    onClick={() => handleEdit(brand)}
                  >
                    تعديل
                  </button>
                  <button
                    className="mb-delete-btn"
                    onClick={() => handleDelete(brand.id)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && !showForm && (
          <div className="mb-pagination">
            <button
              className="mb-pagination-btn"
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
                  className={`mb-pagination-btn ${
                    currentPage === pageNumber ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              className="mb-pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              التالي
            </button>
          </div>
        )}

        {filteredBrands.length === 0 && !showForm && (
          <div className="mb-no-results">
            <p>لا توجد علامات تجارية {searchTerm ? "تطابق البحث" : ""}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default ManageBrands;
