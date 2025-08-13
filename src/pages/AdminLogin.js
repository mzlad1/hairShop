import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import "../css/AdminLogin.css";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

// صفحة تسجيل دخول المشرف
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // Session timeout configuration (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Check if user is already logged in and handle session timeout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check if session has expired
        const loginTime = localStorage.getItem("adminLoginTime");
        const currentTime = new Date().getTime();

        if (loginTime && currentTime - parseInt(loginTime) > SESSION_TIMEOUT) {
          // Session expired, log out user
          console.log("Session expired, logging out user");
          handleSessionExpired();
        } else {
          // User is logged in and session is valid, redirect to dashboard
          navigate("/admin/dashboard");
        }
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle session expiration
  const handleSessionExpired = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("adminLoginTime");
      setError("انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.");
      setCheckingAuth(false);
    } catch (error) {
      console.error("Error signing out:", error);
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Store login time for session management
      localStorage.setItem("adminLoginTime", new Date().getTime().toString());
      navigate("/admin/dashboard"); // Redirect to dashboard after login
    } catch (error) {
      console.error("Login error:", error);
      setError("خطأ في البريد الإلكتروني أو كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication status
  if (checkingAuth) {
    return (
      <>
        <Navbar />
        <div className="admin-login-page">
          <div className="al-form">
            <div className="al-checking">
              <div className="al-spinner"></div>
              <p>جاري التحقق من حالة تسجيل الدخول...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="admin-login-page">
        <div className="al-security-badge">منطقة محمية</div>

        <h1>تسجيل دخول المسؤول</h1>

        <form onSubmit={handleLogin} className="al-form">
          {error && <p className="al-error">{error}</p>}

          <div className="al-form-group">
            <label>البريد الإلكتروني:</label>
            <input
              type="email"
              value={email}
              required
              placeholder="أدخل البريد الإلكتروني"
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="al-form-group">
            <label>كلمة المرور:</label>
            <input
              type="password"
              value={password}
              required
              placeholder="أدخل كلمة المرور"
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="al-login-btn" disabled={loading}>
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="al-footer">
          <p>© 2025 Unlock Your Curls</p>
        </div>
      </div>
    </>
  );
}

export default AdminLogin;
