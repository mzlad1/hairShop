import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../css/Cart.css";
import { useCart } from "../contexts/CartContext";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import Footer from "../components/Footer";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

// صفحة سلة المشتريات والدفع
function Cart() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // التعامل مع إرسال الطلب وتحديث المخزون
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setLoading(true);
    setError("");
    try {
      // Use Firestore transaction to ensure data consistency
      const result = await runTransaction(db, async (transaction) => {
        // First, check stock availability for all items
        const stockChecks = [];
        for (const item of cartItems) {
          const productRef = doc(db, "products", item.id);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists()) {
            throw new Error(`المنتج ${item.name} غير موجود`);
          }

          const currentStock = productSnap.data().stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(
              `المخزون المتاح للمنتج ${item.name} هو ${currentStock} فقط، ولكن طلبت ${item.quantity}`
            );
          }

          stockChecks.push({
            ref: productRef,
            currentStock,
            orderedQuantity: item.quantity,
            newStock: currentStock - item.quantity,
          });
        }

        // If all stock checks pass, create the order
        const orderData = {
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          customerAddress: address,
          items: cartItems,
          total: totalPrice,
          status: "قيد الانتظار",
          createdAt: Timestamp.now(),
        };

        const orderRef = doc(collection(db, "orders"));
        transaction.set(orderRef, orderData);

        // Update stock for all products
        stockChecks.forEach(({ ref, newStock }) => {
          transaction.update(ref, { stock: newStock });
        });

        return orderRef.id;
      });

      // Transaction successful
      setOrderId(result);
      setShowCheckout(false);
      clearCart();
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
    } catch (error) {
      console.error("Error processing order:", error);
      setError(error.message || "حدث خطأ أثناء معالجة الطلب");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  // Check if user is admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Redirect admin users away from cart
    if (isAdmin) {
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 3000);
    }
  }, [isAdmin, navigate]);

  // Show admin access denied message
  if (isAdmin) {
    return (
      <>
        <Navbar />
        <div className="cart-page">
          <div className="ct-container">
            <div className="ct-error">
              <span>🔒</span>
              <span>
                المديرون لا يمكنهم الوصول لصفحة السلة. سيتم توجيهك للوحة
                التحكم...
              </span>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="cart-page">
        <h1>سلة المشتريات</h1>

        {error && (
          <div className="ct-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {cartItems.length === 0 ? (
          <p className="ct-empty">عربة التسوق فارغة.</p>
        ) : (
          <table className="ct-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>الكمية</th>
                <th>المجموع</th>
                <th>إزالة</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="المنتج">{item.name}</td>
                  <td data-label="السعر">{item.price} شيكل</td>
                  <td data-label="الكمية">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      className="ct-qty-input"
                      onChange={(e) =>
                        updateQuantity(item.id, parseInt(e.target.value))
                      }
                    />
                  </td>
                  <td data-label="المجموع">
                    {item.price * item.quantity} شيكل
                  </td>
                  <td data-label="إزالة">
                    <button
                      className="ct-remove-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="ct-summary">
          <p>
            <strong>الإجمالي:</strong> {totalPrice} شيكل
          </p>
          <button
            className="ct-open-checkout-btn"
            onClick={() => setShowCheckout(true)}
            disabled={cartItems.length === 0}
          >
            إتمام الشراء
          </button>
        </div>

        {/* Success message */}
        {orderId && (
          <div className="ct-success">
            <p>
              تم إرسال طلبك بنجاح! رقم الطلب:
              <span className="ct-order-code">#{orderId}</span>
            </p>
            <button
              type="button"
              className="ct-copy-btn"
              onClick={handleCopyOrderId}
              aria-label="نسخ رقم الطلب"
            >
              {copied ? "تم النسخ" : "نسخ"}
            </button>
          </div>
        )}

        {/* Modal checkout */}
        {showCheckout && (
          <div
            className="ct-modal-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("ct-modal-overlay")) {
                setShowCheckout(false);
              }
            }}
          >
            <div
              className="ct-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkoutTitle"
            >
              <button
                className="ct-modal-close"
                onClick={() => setShowCheckout(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
              <h2 id="checkoutTitle">معلومات الدفع</h2>

              {error && (
                <div className="ct-error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="ct-form-group">
                  <label>الاسم الكامل:</label>
                  <input
                    type="text"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="ct-form-group">
                  <label>البريد الإلكتروني:</label>
                  <input
                    type="email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="ct-form-group">
                  <label>رقم الهاتف:</label>
                  <input
                    type="tel"
                    value={phone}
                    required
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="ct-form-group">
                  <label>العنوان:</label>
                  <textarea
                    value={address}
                    required
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="ct-checkout-btn"
                  disabled={loading || cartItems.length === 0}
                >
                  {loading ? "... جاري الإرسال" : "إرسال الطلب"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default Cart;
