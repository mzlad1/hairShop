import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/ManageCategories.css";
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

// صفحة إدارة الفئات
function ManageCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formName, setFormName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Add search functionality
  const [currentPage, setCurrentPage] = useState(1); // Add pagination
  const [itemsPerPage] = useState(8); // 8 categories per page

  useEffect(() => {
    async function fetchCategories() {
      try {
        // Check cache first
        const cachedCategories = CacheManager.get(CACHE_KEYS.CATEGORIES);
        if (cachedCategories) {
          console.log("Loading categories from cache");
          setCategories(cachedCategories);
          return;
        }

        console.log("Fetching categories from Firestore...");
        const snapshot = await getDocs(collection(db, "categories"));
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setCategories(data);

        // Cache for 10 minutes
        CacheManager.set(CACHE_KEYS.CATEGORIES, data, 10 * 60 * 1000);

        console.log("Categories fetched successfully:", data);
      } catch (error) {
        console.error("Error fetching categories:", error);
        // بيانات تجريبية
        setCategories([
          { id: "cat1", name: "الوجه" },
          { id: "cat2", name: "الشعر" },
          { id: "cat3", name: "الجسم" },
        ]);
      }
    }
    fetchCategories();
  }, []);

  const handleEdit = (cat) => {
    setFormName(cat.name);
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormName("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName) return;
    setLoading(true);
    try {
      let updatedCategories;
      if (editingId) {
        const docRef = doc(db, "categories", editingId);
        await updateDoc(docRef, { name: formName });
        updatedCategories = categories.map((c) =>
          c.id === editingId ? { ...c, name: formName } : c
        );
      } else {
        const docRef = await addDoc(collection(db, "categories"), {
          name: formName,
        });
        updatedCategories = [...categories, { id: docRef.id, name: formName }];
      }

      setCategories(updatedCategories);

      // Update cache
      CacheManager.set(
        CACHE_KEYS.CATEGORIES,
        updatedCategories,
        10 * 60 * 1000
      );

      setFormName("");
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذه الفئة؟")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      const updatedCategories = categories.filter((c) => c.id !== id);
      setCategories(updatedCategories);

      // Update cache
      CacheManager.set(
        CACHE_KEYS.CATEGORIES,
        updatedCategories,
        10 * 60 * 1000
      );
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Filter categories based on search term
  const filteredCategories = searchTerm
    ? categories.filter((category) =>
        category.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : categories;

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = filteredCategories.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Initialize session management
  useEffect(() => {
    const handleSessionExpired = async () => {
      try {
        await signOut(auth);
        CacheManager.clearAll();
        navigate("/admin");
      } catch (error) {
        console.error("Error during session expiration:", error);
        navigate("/admin");
      }
    };

    return () => {};
  }, [navigate]);

  return (
    <>
      <Navbar />
      <div className="manage-categories-page">
        <h1>إدارة الفئات</h1>

        {/* Add Category Button */}
        {!showForm && (
          <div className="mc-add-section">
            <button className="mc-add-button" onClick={() => setShowForm(true)}>
              + إضافة فئة جديدة
            </button>
          </div>
        )}

        {/* Search Section */}
        {!showForm && (
          <div className="mc-search-bar">
            <input
              type="text"
              placeholder="ابحث عن فئة بالاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mc-search-input"
            />
            <div className="mc-categories-count">
              عرض {indexOfFirstItem + 1}-
              {Math.min(indexOfLastItem, filteredCategories.length)} من{" "}
              {filteredCategories.length} فئة
            </div>
          </div>
        )}

        {/* Category Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mc-form">
            <h2>{editingId ? "تعديل الفئة" : "إضافة فئة جديدة"}</h2>
            <div className="mc-form-group">
              <label>اسم الفئة:</label>
              <input
                type="text"
                value={formName}
                required
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <button type="submit" className="mc-save-btn" disabled={loading}>
              {loading ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}
            </button>
            <button
              type="button"
              className="mc-cancel-btn"
              onClick={handleCancel}
            >
              إلغاء
            </button>
          </form>
        )}

        <table className="mc-table">
          <thead>
            <tr>
              <th>اسم الفئة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentCategories.map((cat) => (
              <tr key={cat.id}>
                <td data-label="اسم الفئة">{cat.name}</td>
                <td data-label="إجراءات">
                  <button
                    className="mc-edit-btn"
                    onClick={() => handleEdit(cat)}
                  >
                    تعديل
                  </button>{" "}
                  <button
                    className="mc-delete-btn"
                    onClick={() => handleDelete(cat.id)}
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
          <div className="mc-pagination">
            <button
              className="mc-pagination-btn"
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
                  className={`mc-pagination-btn ${
                    currentPage === pageNumber ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              className="mc-pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              التالي
            </button>
          </div>
        )}

        {filteredCategories.length === 0 && !showForm && (
          <div className="mc-no-results">
            <p>لا توجد فئات {searchTerm ? "تطابق البحث" : ""}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default ManageCategories;
