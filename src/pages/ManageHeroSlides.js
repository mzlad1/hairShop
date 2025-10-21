import React, { useState, useEffect } from "react";
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
import { db, storage } from "../firebase";
import Navbar from "../components/Navbar";
import "../css/ManageHeroSlides.css";

function ManageHeroSlides() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    buttonText: "",
    buttonLink: "/",
    order: 1,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Available pages for customers
  const availablePages = [
    { value: "/", label: "الصفحة الرئيسية" },
    { value: "/products", label: "المنتجات" },
    { value: "/about", label: "من نحن" },
    { value: "/contact", label: "اتصل بنا" },
    { value: "/cart", label: "سلة المشتريات" },
  ];

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "heroSlides"));
      const slidesData = [];
      querySnapshot.forEach((doc) => {
        slidesData.push({ id: doc.id, ...doc.data() });
      });
      // Sort by order
      slidesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSlides(slidesData);
    } catch (error) {
      console.error("Error fetching slides:", error);
      alert("حدث خطأ أثناء تحميل الشرائح");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    const timestamp = Date.now();
    const imageName = `hero-${timestamp}-${file.name}`;
    const storageRef = ref(storage, `hero-slides/${imageName}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const orderNumber = parseInt(formData.order) || 1;

      // Check if order already exists (excluding current slide when editing)
      const orderExists = slides.some(
        (slide) =>
          slide.order === orderNumber &&
          (!editingSlide || slide.id !== editingSlide.id)
      );

      if (orderExists) {
        alert(`الترتيب ${orderNumber} مستخدم بالفعل. الرجاء اختيار ترتيب آخر.`);
        setUploading(false);
        return;
      }

      let imageUrl = editingSlide?.imageUrl || "";

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const slideData = {
        ...formData,
        imageUrl,
        order: orderNumber,
        updatedAt: new Date(),
      };

      if (editingSlide) {
        // Update existing slide
        await updateDoc(doc(db, "heroSlides", editingSlide.id), slideData);
        alert("تم تحديث الشريحة بنجاح");
      } else {
        // Add new slide
        slideData.createdAt = new Date();
        await addDoc(collection(db, "heroSlides"), slideData);
        alert("تم إضافة الشريحة بنجاح");
      }

      fetchSlides();
      closeModal();
    } catch (error) {
      console.error("Error saving slide:", error);
      alert("حدث خطأ أثناء حفظ الشريحة");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (slide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      buttonText: slide.buttonText || "",
      buttonLink: slide.buttonLink || "",
      order: slide.order || 1,
      isActive: slide.isActive !== false,
    });
    setImagePreview(slide.imageUrl || null);
    setShowModal(true);
  };

  const handleDelete = async (slide) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الشريحة؟")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "heroSlides", slide.id));
      alert("تم حذف الشريحة بنجاح");
      fetchSlides();
    } catch (error) {
      console.error("Error deleting slide:", error);
      alert("حدث خطأ أثناء حذف الشريحة");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSlide(null);
    setFormData({
      title: "",
      subtitle: "",
      buttonText: "",
      buttonLink: "/",
      order: 1,
      isActive: true,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <>
      <Navbar />
      <div className="manage-hero-slides">
        <div className="mhs-header">
          <h1>إدارة شرائح الصفحة الرئيسية</h1>
          <button
            className="mhs-btn primary"
            onClick={() => setShowModal(true)}
          >
            + إضافة شريحة جديدة
          </button>
        </div>

        {loading ? (
          <div className="mhs-loading">
            <div className="spinner"></div>
            <p>جاري التحميل...</p>
          </div>
        ) : (
          <div className="mhs-slides-grid">
            {slides.map((slide) => (
              <div key={slide.id} className="mhs-slide-card">
                <div className="mhs-slide-image">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title} />
                  ) : (
                    <div className="mhs-no-image">لا توجد صورة</div>
                  )}
                  {!slide.isActive && (
                    <div className="mhs-inactive-badge">غير نشط</div>
                  )}
                </div>
                <div className="mhs-slide-content">
                  <h3>{slide.title || "بدون عنوان"}</h3>
                  <p>{slide.subtitle || "بدون نص فرعي"}</p>
                  <div className="mhs-slide-meta">
                    <span className="mhs-order">الترتيب: {slide.order}</span>
                    {slide.buttonText && (
                      <span className="mhs-button-text">
                        زر: {slide.buttonText}
                      </span>
                    )}
                  </div>
                  <div className="mhs-slide-actions">
                    <button
                      className="mhs-btn edit"
                      onClick={() => handleEdit(slide)}
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      className="mhs-btn delete"
                      onClick={() => handleDelete(slide)}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {slides.length === 0 && (
              <div className="mhs-empty">
                <p>لا توجد شرائح. قم بإضافة شريحة جديدة للبدء.</p>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="mhs-modal-overlay" onClick={closeModal}>
            <div className="mhs-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mhs-modal-header">
                <h2>{editingSlide ? "تعديل الشريحة" : "إضافة شريحة جديدة"}</h2>
                <button className="mhs-close-btn" onClick={closeModal}>
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="mhs-form">
                <div className="mhs-form-group">
                  <label>العنوان الرئيسي *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="مثال: أحدث منتجات العناية بالشعر"
                  />
                </div>

                <div className="mhs-form-group">
                  <label>النص الفرعي</label>
                  <textarea
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    placeholder="مثال: اكتشف مجموعتنا المميزة من منتجات العناية"
                    rows="3"
                  />
                </div>

                <div className="mhs-form-row">
                  <div className="mhs-form-group">
                    <label>نص الزر</label>
                    <input
                      type="text"
                      name="buttonText"
                      value={formData.buttonText}
                      onChange={handleInputChange}
                      placeholder="مثال: تسوق الآن"
                    />
                  </div>

                  <div className="mhs-form-group">
                    <label>رابط الزر</label>
                    <select
                      name="buttonLink"
                      value={formData.buttonLink}
                      onChange={handleInputChange}
                      className="mhs-select"
                    >
                      {availablePages.map((page) => (
                        <option key={page.value} value={page.value}>
                          {page.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mhs-form-row">
                  <div className="mhs-form-group">
                    <label>الترتيب *</label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      required
                      min="1"
                    />
                  </div>

                  <div className="mhs-form-group">
                    <label>إظهار الشريحة</label>
                    <label className="mhs-checkbox-label">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      <span>نشط</span>
                    </label>
                  </div>
                </div>

                <div className="mhs-form-group">
                  <label>صورة الشريحة *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingSlide}
                  />
                  {imagePreview && (
                    <div className="mhs-image-preview">
                      <img src={imagePreview} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="mhs-form-actions">
                  <button
                    type="button"
                    className="mhs-btn cancel"
                    onClick={closeModal}
                    disabled={uploading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="mhs-btn primary"
                    disabled={uploading}
                  >
                    {uploading
                      ? "جاري الحفظ..."
                      : editingSlide
                      ? "تحديث الشريحة"
                      : "إضافة الشريحة"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ManageHeroSlides;
