import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "../components/Navbar";
import "../css/FeedbackManager.css";

function FeedbackManager() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]); // Store all feedbacks for stats
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending, approved, rejected, all
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "feedbacks"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const allFeedbackList = [];

      for (const docSnap of querySnapshot.docs) {
        const feedbackData = { id: docSnap.id, ...docSnap.data() };

        // Get product name
        try {
          const productDoc = await getDoc(
            doc(db, "products", feedbackData.productId)
          );
          if (productDoc.exists()) {
            feedbackData.productName = productDoc.data().name;
          } else {
            feedbackData.productName = "منتج محذوف";
          }
        } catch (error) {
          feedbackData.productName = "خطأ في تحميل اسم المنتج";
        }

        allFeedbackList.push(feedbackData);
      }

      // Store all feedbacks for statistics
      setAllFeedbacks(allFeedbackList);

      // Filter feedbacks for display
      const filteredFeedbacks =
        filter === "all"
          ? allFeedbackList
          : allFeedbackList.filter((feedback) => feedback.status === filter);

      setFeedbacks(filteredFeedbacks);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [feedbackId]: true }));
    try {
      await updateDoc(doc(db, "feedbacks", feedbackId), {
        status: newStatus,
        reviewedAt: new Date(),
      });

      // Update both allFeedbacks and feedbacks arrays
      const updateFunction = (feedback) =>
        feedback.id === feedbackId
          ? { ...feedback, status: newStatus, reviewedAt: new Date() }
          : feedback;

      setAllFeedbacks((prev) => prev.map(updateFunction));
      setFeedbacks((prev) => prev.map(updateFunction));

      // If we're filtering and the new status doesn't match, remove from view
      if (filter !== "all" && newStatus !== filter) {
        setFeedbacks((prev) =>
          prev.filter((feedback) => feedback.id !== feedbackId)
        );
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
      alert("حدث خطأ في تحديث حالة التقييم");
    } finally {
      setUpdating((prev) => ({ ...prev, [feedbackId]: false }));
    }
  };

  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;

    setUpdating((prev) => ({ ...prev, [feedbackId]: true }));
    try {
      await deleteDoc(doc(db, "feedbacks", feedbackId));
      // Remove from both arrays
      setAllFeedbacks((prev) =>
        prev.filter((feedback) => feedback.id !== feedbackId)
      );
      setFeedbacks((prev) =>
        prev.filter((feedback) => feedback.id !== feedbackId)
      );
    } catch (error) {
      console.error("Error deleting feedback:", error);
      alert("حدث خطأ في حذف التقييم");
    } finally {
      setUpdating((prev) => ({ ...prev, [feedbackId]: false }));
    }
  };

  const formatDate = (date) => {
    if (date && date.toDate) {
      return date.toDate().toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "approved":
        return "fm-status-approved";
      case "rejected":
        return "fm-status-rejected";
      case "pending":
        return "fm-status-pending";
      default:
        return "fm-status-pending";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "موافق عليه";
      case "rejected":
        return "مرفوض";
      case "pending":
        return "في الانتظار";
      default:
        return "غير معروف";
    }
  };

  // Calculate statistics from allFeedbacks, not filtered feedbacks
  const pendingCount = allFeedbacks.filter(
    (f) => f.status === "pending"
  ).length;
  const approvedCount = allFeedbacks.filter(
    (f) => f.status === "approved"
  ).length;
  const rejectedCount = allFeedbacks.filter(
    (f) => f.status === "rejected"
  ).length;

  return (
    <>
      <Navbar />
      <div className="fm-container">
        <div className="fm-header">
          <h1 className="fm-title">إدارة تقييمات المنتجات</h1>

          {/* Stats */}
          <div className="fm-stats">
            <div className="fm-stat">
              <span className="fm-stat-number">{pendingCount}</span>
              <span className="fm-stat-label">في الانتظار</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat-number">{approvedCount}</span>
              <span className="fm-stat-label">موافق عليه</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat-number">{rejectedCount}</span>
              <span className="fm-stat-label">مرفوض</span>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="fm-filters">
          <button
            className={`fm-filter-btn ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            في الانتظار ({pendingCount})
          </button>
          <button
            className={`fm-filter-btn ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            موافق عليه ({approvedCount})
          </button>
          <button
            className={`fm-filter-btn ${filter === "rejected" ? "active" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            مرفوض ({rejectedCount})
          </button>
          <button
            className={`fm-filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            الكل ({allFeedbacks.length})
          </button>
        </div>

        {/* Feedbacks List */}
        {loading ? (
          <div className="fm-loading">جاري تحميل التقييمات...</div>
        ) : feedbacks.length === 0 ? (
          <div className="fm-no-data">لا توجد تقييمات في هذه الفئة</div>
        ) : (
          <div className="fm-feedbacks">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="fm-feedback-card">
                <div className="fm-feedback-header">
                  <div className="fm-feedback-info">
                    <h3 className="fm-customer-name">{feedback.name}</h3>
                    <div className="fm-feedback-meta">
                      <span className="fm-product-name">
                        المنتج: {feedback.productName}
                      </span>
                      <span className="fm-feedback-date">
                        {formatDate(feedback.createdAt)}
                      </span>
                    </div>
                    {feedback.email && (
                      <div className="fm-contact-info">
                        <span>📧 {feedback.email}</span>
                      </div>
                    )}
                    {feedback.phone && (
                      <div className="fm-contact-info">
                        <span>📱 {feedback.phone}</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`fm-status-badge ${getStatusBadgeClass(
                      feedback.status
                    )}`}
                  >
                    {getStatusText(feedback.status)}
                  </div>
                </div>

                <div className="fm-feedback-comment">{feedback.comment}</div>

                {feedback.images && feedback.images.length > 0 && (
                  <div className="fm-feedback-images">
                    <div className="fm-images-label">الصور المرفقة:</div>
                    <div className="fm-images-grid">
                      {feedback.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Feedback ${index + 1}`}
                          className="fm-feedback-image"
                          onClick={() => window.open(image, "_blank")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="fm-feedback-actions">
                  {feedback.status !== "approved" && (
                    <button
                      className="fm-approve-btn"
                      onClick={() =>
                        updateFeedbackStatus(feedback.id, "approved")
                      }
                      disabled={updating[feedback.id]}
                    >
                      {updating[feedback.id] ? "..." : "✓ موافقة"}
                    </button>
                  )}
                  {feedback.status !== "rejected" && (
                    <button
                      className="fm-reject-btn"
                      onClick={() =>
                        updateFeedbackStatus(feedback.id, "rejected")
                      }
                      disabled={updating[feedback.id]}
                    >
                      {updating[feedback.id] ? "..." : "✗ رفض"}
                    </button>
                  )}
                  <button
                    className="fm-delete-btn"
                    onClick={() => deleteFeedback(feedback.id)}
                    disabled={updating[feedback.id]}
                  >
                    {updating[feedback.id] ? "..." : "🗑️ حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default FeedbackManager;
