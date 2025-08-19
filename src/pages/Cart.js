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
  const [stockIssues, setStockIssues] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);

  const totalPrice = cartItems.reduce((total, item) => {
    let itemPrice = item.price;

    // If item has a selected variant, use variant price
    if (item.selectedVariant && item.selectedVariant.price) {
      itemPrice = parseFloat(item.selectedVariant.price) || 0;
    }

    return total + itemPrice * item.quantity;
  }, 0);

  // Check stock availability before checkout
  const checkStockAvailability = async () => {
    const issues = [];

    try {
      for (const item of cartItems) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          issues.push({
            ...item,
            issue: "المنتج غير متوفر",
            availableStock: 0,
          });
        } else {
          const productData = productSnap.data();
          let currentStock = 0;

          if (productData.hasVariants && item.selectedVariant) {
            // For variant products, check the specific variant stock
            const variant = productData.variants?.find(
              (v) =>
                v.size === item.selectedVariant.size &&
                v.color === item.selectedVariant.color
            );
            currentStock = variant ? parseInt(variant.stock) || 0 : 0;
          } else {
            // For regular products, check product stock
            currentStock = productData.stock || 0;
          }

          if (currentStock < item.quantity) {
            issues.push({
              ...item,
              issue: "الكمية المطلوبة أكبر من المتوفر",
              availableStock: currentStock,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking stock:", error);
    }

    return issues;
  };

  // Handle checkout button click - check stock first
  const handleCheckoutClick = async () => {
    const issues = await checkStockAvailability();

    if (issues.length > 0) {
      setStockIssues(issues);
      setShowStockModal(true);
    } else {
      setShowCheckout(true);
    }
  };

  // Adjust quantities to available stock
  const adjustQuantities = () => {
    stockIssues.forEach((issue) => {
      if (issue.availableStock > 0) {
        updateQuantity(issue.cartItemId || issue.id, issue.availableStock);
      } else {
        removeFromCart(issue.cartItemId || issue.id);
      }
    });
    setShowStockModal(false);
    setStockIssues([]);
  };

  // Contact support (you can modify this to open WhatsApp, email, etc.)
  const contactSupport = () => {
    // Example: Open WhatsApp or email
    const message = `مرحبا، أحتاج مساعدة بخصوص المنتجات التالية:\n\n${stockIssues
      .map(
        (issue) =>
          `- ${issue.name}: طلبت ${issue.quantity} والمتوفر ${issue.availableStock}`
      )
      .join("\n")}\n\nهل يمكنكم اقتراح بدائل مشابهة؟`;

    // Replace 972XXXXXXXXX with your actual WhatsApp number (with country code, no + sign)
    // Example: 972501234567 for Israel, 966501234567 for Saudi Arabia
    const whatsappUrl = `https://wa.me/972XXXXXXXXX?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");

    setShowStockModal(false);
    setStockIssues([]);
  };

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

          const productData = productSnap.data();
          let currentStock = 0;
          let stockUpdateData = {};

          if (productData.hasVariants && item.selectedVariant) {
            // For variant products, check and update specific variant stock
            const variant = productData.variants?.find(
              (v) =>
                v.size === item.selectedVariant.size &&
                v.color === item.selectedVariant.color
            );

            if (!variant) {
              throw new Error(
                `المتغير ${item.selectedVariant.size} - ${item.selectedVariant.color} غير متوفر للمنتج ${item.name}`
              );
            }

            currentStock = parseInt(variant.stock) || 0;
            if (currentStock < item.quantity) {
              throw new Error(
                `المخزون المتاح للمنتج ${item.name} (${item.selectedVariant.size} - ${item.selectedVariant.color}) هو ${currentStock} فقط، ولكن طلبت ${item.quantity}`
              );
            }

            // Update the specific variant stock
            const updatedVariants = productData.variants.map((v) => {
              if (
                v.size === item.selectedVariant.size &&
                v.color === item.selectedVariant.color
              ) {
                return {
                  ...v,
                  stock: Math.max(0, parseInt(v.stock) - item.quantity),
                };
              }
              return v;
            });

            stockUpdateData = { variants: updatedVariants };
          } else {
            // For regular products, check and update product stock
            currentStock = productData.stock || 0;
            if (currentStock < item.quantity) {
              throw new Error(
                `المخزون المتاح للمنتج ${item.name} هو ${currentStock} فقط، ولكن طلبت ${item.quantity}`
              );
            }
            stockUpdateData = {
              stock: Math.max(0, currentStock - item.quantity),
            };
          }

          stockChecks.push({
            ref: productRef,
            updateData: stockUpdateData,
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
        stockChecks.forEach(({ ref, updateData }) => {
          transaction.update(ref, updateData);
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
                <tr key={item.cartItemId || item.id}>
                  <td data-label="المنتج">{item.name}</td>
                  <td data-label="السعر">
                    {item.selectedVariant && item.selectedVariant.price
                      ? `${parseFloat(item.selectedVariant.price)} شيكل`
                      : `${item.price} شيكل`}
                    {item.selectedVariant && (
                      <div className="ct-variant-info">
                        <small>
                          {item.selectedVariant.size} -{" "}
                          {item.selectedVariant.color}
                        </small>
                      </div>
                    )}
                  </td>
                  <td data-label="الكمية">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      className="ct-qty-input"
                      onChange={(e) =>
                        updateQuantity(
                          item.cartItemId || item.id,
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </td>
                  <td data-label="المجموع">
                    {(() => {
                      const itemPrice =
                        item.selectedVariant && item.selectedVariant.price
                          ? parseFloat(item.selectedVariant.price)
                          : item.price;
                      return `${itemPrice * item.quantity} شيكل`;
                    })()}
                  </td>
                  <td data-label="إزالة">
                    <button
                      className="ct-remove-btn"
                      onClick={() => removeFromCart(item.cartItemId || item.id)}
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
            onClick={handleCheckoutClick}
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

        {/* Stock Issues Modal */}
        {showStockModal && (
          <div
            className="ct-modal-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("ct-modal-overlay")) {
                setShowStockModal(false);
              }
            }}
          >
            <div className="ct-modal" role="dialog" aria-modal="true">
              <button
                className="ct-modal-close"
                onClick={() => setShowStockModal(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
              <h2>مشكلة في المخزون</h2>

              <div className="ct-stock-issues">
                <p className="ct-stock-warning">
                  ⚠️ بعض المنتجات في سلتك غير متوفرة بالكمية المطلوبة:
                </p>

                {stockIssues.map((issue) => (
                  <div key={issue.id} className="ct-stock-issue-item">
                    <div className="ct-issue-info">
                      <h4>{issue.name}</h4>
                      <p>
                        الكمية المطلوبة:{" "}
                        <span className="ct-requested">{issue.quantity}</span>
                      </p>
                      <p>
                        المتوفر في المخزون:{" "}
                        <span className="ct-available">
                          {issue.availableStock}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}

                <div className="ct-stock-options">
                  <p>يمكنك اختيار إحدى الخيارات التالية:</p>

                  <div className="ct-stock-buttons">
                    <button
                      className="ct-adjust-btn"
                      onClick={adjustQuantities}
                    >
                      تعديل الكميات حسب المتوفر
                    </button>

                    <button className="ct-contact-btn" onClick={contactSupport}>
                      تواصل معنا لاقتراح بدائل
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
