import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/Contact.css";

// صفحة اتصل بنا
function Contact() {
  const contactInfo = [
    {
      icon: "📱",
      title: "واتساب",
      content: "تواصل معنا عبر واتساب",
      link: "https://wa.me/970590000000",
      linkText: "+970 59 000 0000",
      type: "whatsapp",
    },
    {
      icon: "📷",
      title: "إنستغرام",
      content: "تابعنا للحصول على آخر العروض",
      link: "https://www.instagram.com/unlock.your.curls",
      linkText: "@unlock.your.curls",
      type: "instagram",
    },
    {
      icon: "📘",
      title: "الفيسبوك",
      content: "انضم إلى مجتمعنا على فيسبوك",
      link: "https://www.facebook.com/yourfbpage",
      linkText: "متجر التجميل - نابلس",
      type: "facebook",
    },
    {
      icon: "📞",
      title: "رقم الهاتف",
      content: "اتصل بنا للاستفسارات",
      link: "tel:+970590000000",
      linkText: "+970 59 000 0000",
      type: "phone",
    },
  ];

  return (
    <>
      <Navbar />
      <div className="bp-contact-page">
        <div className="bp-contact-container">
          {/* Header Section */}
          <div className="bp-contact-header">
            <h1 className="bp-contact-title">💄 تواصل معنا</h1>
          </div>

          {/* Contact Content */}
          <div className="bp-contact-content">
            {/* Contact Information */}
            <div className="bp-contact-info-section">
              <div className="bp-contact-info-header">
                <h2>📞 معلومات التواصل</h2>
                <p>تواصل معنا بالطريقة الأنسب لك</p>
              </div>

              <div className="bp-contact-cards">
                {contactInfo.map((info, index) => (
                  <a
                    key={index}
                    href={info.link}
                    target={
                      info.type === "phone" || info.type === "email"
                        ? "_self"
                        : "_blank"
                    }
                    rel={
                      info.type === "phone" || info.type === "email"
                        ? ""
                        : "noopener noreferrer"
                    }
                    className={`bp-contact-card ${info.type}`}
                  >
                    <div className="bp-contact-card-icon">{info.icon}</div>
                    <div className="bp-contact-card-content">
                      <h3>{info.title}</h3>
                      <p>{info.content}</p>
                      <span className="bp-contact-link-text">
                        {info.linkText}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Contact;
