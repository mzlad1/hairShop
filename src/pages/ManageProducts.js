import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/ManageProducts.css";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, db } from "../firebase";
import { CacheManager, CACHE_KEYS } from "../utils/cache";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// صفحة إدارة المنتجات
function ManageProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    price: "",
    description: "",
    images: [],
    categories: [],
    brand: "",
    stock: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Add search functionality
  const [currentPage, setCurrentPage] = useState(1); // Add pagination
  const [itemsPerPage] = useState(10); // 10 products per page
  const [stockFilter, setStockFilter] = useState(""); // Add stock filter

  // جلب المنتجات والفئات والعلامات التجارية من قاعدة البيانات
  useEffect(() => {
    async function fetchData() {
      try {
        // Check caches first
        const cachedProducts = CacheManager.get(CACHE_KEYS.PRODUCTS);
        const cachedCategories = CacheManager.get(CACHE_KEYS.CATEGORIES);
        const cachedBrands = CacheManager.get(CACHE_KEYS.BRANDS);

        let fetchPromises = [];

        if (cachedProducts) {
          console.log("Loading products from cache");
          setProducts(cachedProducts);
        } else {
          fetchPromises.push(
            getDocs(collection(db, "products")).then((snapshot) => {
              const data = [];
              snapshot.forEach((doc) =>
                data.push({ id: doc.id, ...doc.data() })
              );
              setProducts(data);
              CacheManager.set(CACHE_KEYS.PRODUCTS, data, 5 * 60 * 1000);
              return data;
            })
          );
        }

        if (cachedCategories) {
          console.log("Loading categories from cache");
          setCategories(cachedCategories);
        } else {
          fetchPromises.push(
            getDocs(collection(db, "categories")).then((snapshot) => {
              const data = [];
              snapshot.forEach((doc) =>
                data.push({ id: doc.id, ...doc.data() })
              );
              setCategories(data);
              CacheManager.set(CACHE_KEYS.CATEGORIES, data, 10 * 60 * 1000);
              return data;
            })
          );
        }

        if (cachedBrands) {
          console.log("Loading brands from cache");
          setBrands(cachedBrands);
        } else {
          fetchPromises.push(
            getDocs(collection(db, "brands")).then((snapshot) => {
              const data = [];
              snapshot.forEach((doc) =>
                data.push({ id: doc.id, ...doc.data() })
              );
              setBrands(data);
              CacheManager.set(CACHE_KEYS.BRANDS, data, 10 * 60 * 1000);
              return data;
            })
          );
        }

        if (fetchPromises.length > 0) {
          await Promise.all(fetchPromises);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // بيانات تجريبية في حال عدم جلب البيانات
        setProducts([
          {
            id: "1",
            name: "شامبو للشعر الجاف",
            price: 50,
            description: "شامبو مخصص للشعر الجاف والمتضرر بتركيبة مرطبة عميقة.",
            images: ["/images/sample1.jpg"],
            categories: ["الشعر"],
            brand: "لوريال",
            stock: 15,
          },
        ]);
        setCategories([
          { id: "cat1", name: "شامبو" },
          { id: "cat2", name: "بلسم" },
          { id: "cat3", name: "ماسك الشعر" },
          { id: "cat4", name: "كريمات التصفيف" },
        ]);
        setBrands([
          { id: "brand1", name: "لوريال" },
          { id: "brand2", name: "بانتين" },
          { id: "brand3", name: "هيد آند شولدرز" },
        ]);
      }
    }
    fetchData();
  }, []);

  // التعامل مع تغيير مدخلات النموذج
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // التعامل مع تحديد الفئات (متعدد)
  const handleCategoryToggle = (catName) => {
    setFormData((prev) => {
      // Handle "None" option
      if (catName === "بدون فئة") {
        if (prev.categories.includes("بدون فئة")) {
          // Remove "None" option
          return {
            ...prev,
            categories: prev.categories.filter((c) => c !== "بدون فئة"),
          };
        } else {
          // Select only "None" option (clear other selections)
          return { ...prev, categories: ["بدون فئة"] };
        }
      }

      // Handle regular categories
      const isSelected = prev.categories.includes(catName);
      let newCategories;

      if (isSelected) {
        newCategories = prev.categories.filter((c) => c !== catName);
      } else {
        // Remove "None" option when selecting a regular category
        newCategories = prev.categories.filter((c) => c !== "بدون فئة");
        newCategories = [...newCategories, catName];
      }

      return { ...prev, categories: newCategories };
    });
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 9) {
      alert("يمكنك اختيار حد أقصى 9 صور");
      return;
    }

    // Validate file types
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const invalidFiles = files.filter(
      (file) => !validTypes.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      alert("يُسمح فقط بملفات الصور (JPG, PNG, WEBP)");
      return;
    }

    // Validate file sizes (max 5MB per file)
    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setSelectedFiles(files);
  };

  // Upload images to Firebase Storage
  const uploadImages = async (files, productId) => {
    if (!files || files.length === 0) return [];

    setUploading(true);
    const uploadPromises = files.map(async (file, index) => {
      const fileName = `products/${productId}/${Date.now()}_${index}_${
        file.name
      }`;
      const storageRef = ref(storage, fileName);

      setUploadProgress((prev) => ({ ...prev, [index]: 0 }));

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        setUploadProgress((prev) => ({ ...prev, [index]: 100 }));
        return downloadURL;
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setUploadProgress((prev) => ({ ...prev, [index]: -1 }));
        throw error;
      }
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setUploading(false);
      setUploadProgress({});
      return urls;
    } catch (error) {
      setUploading(false);
      setUploadProgress({});
      throw error;
    }
  };

  // Delete old images from storage
  const deleteOldImages = async (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return;

    const deletePromises = imageUrls.map(async (url) => {
      try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    });

    await Promise.all(deletePromises);
  };

  // إضافة أو تحديث منتج
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrls = formData.images || [];

      // Upload new images if files are selected
      if (selectedFiles.length > 0) {
        const productId = formData.id || `temp_${Date.now()}`;
        const newImageUrls = await uploadImages(selectedFiles, productId);

        // If editing, delete old images first
        if (formData.id && formData.images?.length > 0) {
          await deleteOldImages(formData.images);
        }

        imageUrls = newImageUrls;
      }

      const data = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        images: imageUrls,
        categories: formData.categories,
        brand: formData.brand,
        stock: parseInt(formData.stock) || 0,
      };

      let updatedProducts;
      if (formData.id) {
        // تحديث
        const docRef = doc(db, "products", formData.id);
        await updateDoc(docRef, data);
        updatedProducts = products.map((p) =>
          p.id === formData.id ? { id: p.id, ...data } : p
        );
      } else {
        // إضافة
        const docRef = await addDoc(collection(db, "products"), data);
        updatedProducts = [...products, { id: docRef.id, ...data }];
      }

      setProducts(updatedProducts);

      // Update cache
      CacheManager.set(CACHE_KEYS.PRODUCTS, updatedProducts, 5 * 60 * 1000);

      // إعادة تعيين النموذج
      setFormData({
        id: null,
        name: "",
        price: "",
        description: "",
        images: [],
        categories: [],
        brand: "",
        stock: "",
      });
      setSelectedFiles([]);
      setShowForm(false);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("حدث خطأ في حفظ المنتج. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  // تعديل منتج
  const handleEdit = (product) => {
    setFormData({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      images: product.images || [],
      categories: product.categories || [],
      brand: product.brand || "",
      stock: product.stock || 0,
    });
    setSelectedFiles([]);
    setShowForm(true);
  };

  // حذف منتج
  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذا المنتج؟")) return;
    try {
      const product = products.find((p) => p.id === id);

      // Delete images from storage
      if (product?.images?.length > 0) {
        await deleteOldImages(product.images);
      }

      await deleteDoc(doc(db, "products", id));
      const updatedProducts = products.filter((p) => p.id !== id);
      setProducts(updatedProducts);

      // Update cache
      CacheManager.set(CACHE_KEYS.PRODUCTS, updatedProducts, 5 * 60 * 1000);
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("حدث خطأ في حذف المنتج. يرجى المحاولة مرة أخرى.");
    }
  };

  const handleCancel = () => {
    setFormData({
      id: null,
      name: "",
      price: "",
      description: "",
      images: [],
      categories: [],
      brand: "",
      stock: "",
    });
    setSelectedFiles([]);
    setShowForm(false);
  };

  // Enhanced filtering function for products
  const getFilteredProducts = () => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          product.categories?.some((cat) =>
            cat.toLowerCase().includes(searchLower)
          )
      );
    }

    // Filter by stock status
    if (stockFilter) {
      filtered = filtered.filter((product) => {
        const stock = product.stock || 0;
        switch (stockFilter) {
          case "in-stock":
            return stock > 5;
          case "low-stock":
            return stock > 0 && stock <= 5;
          case "out-of-stock":
            return stock === 0;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter]);

  return (
    <>
      <Navbar />
      <div className="manage-products-page">
        <h1>إدارة منتجات العناية بالشعر</h1>

        {/* Add Product Button */}
        {!showForm && (
          <div className="mp-add-section">
            <button className="mp-add-button" onClick={() => setShowForm(true)}>
              + إضافة منتج جديد
            </button>
          </div>
        )}

        {/* Search and Filter Section */}
        {!showForm && (
          <div className="mp-controls">
            <div className="mp-search">
              <input
                type="text"
                placeholder="ابحث عن منتج بالاسم، العلامة التجارية، أو الفئة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mp-search-input"
              />
            </div>

            <div className="mp-stock-filter">
              <label>تصفية حسب المخزون:</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="mp-stock-select"
              >
                <option value="">كل المنتجات</option>
                <option value="in-stock">متوفر (أكثر من 5)</option>
                <option value="low-stock">مخزون قليل (1-5)</option>
                <option value="out-of-stock">نفدت الكمية (0)</option>
              </select>
            </div>

            <div className="mp-products-count">
              عرض {indexOfFirstItem + 1}-
              {Math.min(indexOfLastItem, filteredProducts.length)} من{" "}
              {filteredProducts.length} منتج
            </div>
          </div>
        )}

        {/* Product Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mp-form">
            <h2>{formData.id ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>

            <div className="mp-form-group">
              <label>اسم المنتج:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                required
                onChange={handleChange}
                placeholder="مثال: شامبو للشعر الجاف"
              />
            </div>

            <div className="mp-form-group">
              <label>العلامة التجارية:</label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="mp-brand-select"
              >
                <option value="">بدون علامة تجارية</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.name}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mp-form-group">
              <label>السعر (شيكل):</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                required
                min="0"
                step="0.01"
                onChange={handleChange}
              />
            </div>

            <div className="mp-form-group">
              <label>الكمية المتوفرة:</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                required
                min="0"
                onChange={handleChange}
                placeholder="عدد القطع المتوفرة"
              />
            </div>

            <div className="mp-form-group">
              <label>الوصف:</label>
              <textarea
                name="description"
                value={formData.description}
                required
                onChange={handleChange}
                placeholder="وصف تفصيلي للمنتج وفوائده"
              />
            </div>

            <div className="mp-form-group">
              <label>صور المنتج (حد أقصى 9 صور):</label>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="mp-file-input"
              />
              <div className="mp-file-info">
                <small>
                  يُسمح بملفات JPG, PNG, WEBP فقط. حد أقصى 5 ميجابايت لكل صورة.
                </small>
              </div>

              {/* Show selected files */}
              {selectedFiles.length > 0 && (
                <div className="mp-selected-files">
                  <h4>الصور المختارة:</h4>
                  <div className="mp-file-list">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="mp-file-item">
                        <span>{file.name}</span>
                        <span className="mp-file-size">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        {uploadProgress[index] !== undefined && (
                          <div className="mp-upload-progress">
                            {uploadProgress[index] === -1 ? (
                              <span className="mp-error">فشل الرفع</span>
                            ) : (
                              <span>{uploadProgress[index]}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show existing images when editing */}
              {formData.id && formData.images?.length > 0 && (
                <div className="mp-existing-images">
                  <h4>الصور الحالية:</h4>
                  <div className="mp-image-grid">
                    {formData.images.map((imageUrl, index) => (
                      <div key={index} className="mp-image-item">
                        <img
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="mp-image-preview"
                        />
                      </div>
                    ))}
                  </div>
                  <small>
                    سيتم استبدال الصور الحالية بالصور الجديدة عند اختيارها.
                  </small>
                </div>
              )}
            </div>

            <div className="mp-form-group">
              <label>الفئات:</label>
              <div className="mp-categories">
                <label className="mp-category">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes("بدون فئة")}
                    onChange={() => handleCategoryToggle("بدون فئة")}
                  />
                  بدون فئة
                </label>
                {categories.map((cat) => (
                  <label key={cat.id} className="mp-category">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(cat.name)}
                      onChange={() => handleCategoryToggle(cat.name)}
                      disabled={formData.categories.includes("بدون فئة")}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
              <small className="mp-category-note">
                اختر "بدون فئة" أو اختر فئة أو أكثر من الفئات المتاحة
              </small>
            </div>

            <button
              type="submit"
              className="mp-save-btn"
              disabled={loading || uploading}
            >
              {uploading
                ? "جاري رفع الصور..."
                : loading
                ? "جاري الحفظ..."
                : formData.id
                ? "تحديث"
                : "إضافة"}
            </button>
            <button
              type="button"
              className="mp-cancel-btn"
              onClick={handleCancel}
              disabled={loading || uploading}
            >
              إلغاء
            </button>
          </form>
        )}

        {/* Products Table */}
        <table className="mp-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>العلامة التجارية</th>
              <th>السعر</th>
              <th>المخزون</th>
              <th>الفئات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product) => (
              <tr key={product.id}>
                <td data-label="الاسم">{product.name}</td>
                <td data-label="العلامة التجارية">
                  <span className="mp-brand-tag">
                    {product.brand || "بدون علامة تجارية"}
                  </span>
                </td>
                <td data-label="السعر">{product.price} شيكل</td>
                <td data-label="المخزون">
                  {(() => {
                    const stock = product.stock || 0;
                    const badgeClass =
                      stock <= 0
                        ? "mp-out-of-stock"
                        : stock <= 5
                        ? "mp-low-stock"
                        : "mp-in-stock";
                    return (
                      <span className={`mp-stock-badge ${badgeClass}`}>
                        {stock} قطعة
                      </span>
                    );
                  })()}
                </td>
                <td data-label="الفئات">
                  {product.categories && product.categories.length > 0
                    ? product.categories.join(", ")
                    : "بدون فئة"}
                </td>
                <td data-label="إجراءات">
                  <button
                    className="mp-edit-btn"
                    onClick={() => handleEdit(product)}
                  >
                    تعديل
                  </button>
                  <button
                    className="mp-delete-btn"
                    onClick={() => handleDelete(product.id)}
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
          <div className="mp-pagination">
            <button
              className="mp-pagination-btn"
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
                  className={`mp-pagination-btn ${
                    currentPage === pageNumber ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              className="mp-pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              التالي
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && !showForm && (
          <div className="mp-no-results">
            <p>
              لا توجد منتجات{" "}
              {searchTerm || stockFilter ? "تطابق معايير البحث" : ""}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default ManageProducts;
