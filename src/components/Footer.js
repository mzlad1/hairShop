import React from "react";
import { Link } from "react-router-dom";
import "../css/Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="ft-footer">
      <div className="ft-container">
        <div className="ft-content">
          {/* Brand Section */}
          <div className="ft-brand">
            <div className="ft-logo">
              <img
                src="/images/logo.png"
                alt="متجر التجميل"
                className="ft-logo-img"
              />
              <span className="ft-logo-text">Unlock Your Curls</span>
            </div>
            <p className="ft-description">
              متجرك المتخصص في منتجات التجميل والعناية الطبيعية. نقدم أفضل
              المنتجات العالمية بجودة عالية وأسعار مناسبة.
            </p>
            <div className="ft-social">
              <a href="#" className="ft-social-link" aria-label="فيسبوك">
                <span>📘</span>
              </a>
              <a href="#" className="ft-social-link" aria-label="إنستغرام">
                <span>📷</span>
              </a>
              <a href="#" className="ft-social-link" aria-label="واتساب">
                <span>💬</span>
              </a>
              <a href="#" className="ft-social-link" aria-label="تويتر">
                <span>🐦</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="ft-section">
            <h3 className="ft-title">روابط سريعة</h3>
            <ul className="ft-links">
              <li>
                <Link to="/" className="ft-link">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link to="/products" className="ft-link">
                  المنتجات
                </Link>
              </li>
              <li>
                <Link to="/cart" className="ft-link">
                  سلة التسوق
                </Link>
              </li>
              <li>
                <Link to="/about" className="ft-link">
                  من نحن
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="ft-section">
            <h3 className="ft-title">الفئات</h3>
            <ul className="ft-links">
              <li>
                <span className="ft-link">منتجات الوجه</span>
              </li>
              <li>
                <span className="ft-link">منتجات الشعر</span>
              </li>
              <li>
                <span className="ft-link">منتجات الجسم</span>
              </li>
              <li>
                <span className="ft-link">مستحضرات التجميل</span>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="ft-section">
            <h3 className="ft-title">تواصل معنا</h3>
            <div className="ft-contact">
              <div className="ft-contact-item">
                <span className="ft-contact-icon">📍</span>
                <span>فلسطين</span>
              </div>
              <div className="ft-contact-item">
                <span className="ft-contact-icon">📞</span>
                <span>+970 123 456 789</span>
              </div>
              <div className="ft-contact-item">
                <span className="ft-contact-icon">✉️</span>
                <span>info@beautystore.ps</span>
              </div>
              <div className="ft-contact-item">
                <span className="ft-contact-icon">🕐</span>
                <span>السبت - الخميس: 9 صباحاً - 10 مساءً</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="ft-bottom">
          <div className="ft-bottom-content">
            <p className="ft-copyright">
              © {currentYear} متجر التجميل. جميع الحقوق محفوظة.
            </p>
            <div className="ft-bottom-links">
              <span className="ft-bottom-link">سياسة الخصوصية</span>
              <span className="ft-bottom-link">شروط الاستخدام</span>
              <span className="ft-bottom-link">سياسة الإرجاع</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
