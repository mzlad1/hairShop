import React from "react";
import "../css/Footer.css";

function Footer() {
  return (
    <footer className="ft-footer">
      <div className="ft-container">
        <div className="ft-content">
          {/* Brand Section */}
          <div className="ft-brand">
            <div className="ft-logo">
              <span className="ft-logo-text">Unlock Your Curls</span>
            </div>
          </div>

          {/* Contact Section */}
          <div className="ft-contact-section">
            <h3 className="ft-contact-title">تواصل معنا</h3>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ft-instagram-logo"
              aria-label="تابعنا على إنستغرام"
            >
              <img
                src="/images/instagram.png"
                alt="Instagram"
                className="ft-instagram-icon"
              />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="ft-copyright">
          <p>© 2025 Unlock Your Curls. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
