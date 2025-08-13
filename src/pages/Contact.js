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
      link: "https://www.instagram.com/yourinstapage",
      linkText: "@beautyshoppe_nablus",
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
    {
      icon: "✉️",
      title: "البريد الإلكتروني",
      content: "راسلنا عبر البريد الإلكتروني",
      link: "mailto:info@beautyshoppe.ps",
      linkText: "info@beautyshoppe.ps",
      type: "email",
    },
    {
      icon: "📍",
      title: "العنوان",
      content: "زورنا في موقعنا",
      link: "https://maps.google.com/?q=Nablus,Palestine",
      linkText: "نابلس، فلسطين - شارع الحرم",
      type: "location",
    },
  ];

  const businessHours = [
    { day: "الأحد - الخميس", hours: "9:00 ص - 8:00 م" },
    { day: "الجمعة", hours: "2:00 م - 8:00 م" },
    { day: "السبت", hours: "9:00 ص - 6:00 م" },
  ];

  return (
    <>
      <Navbar />
      <div className="bp-contact-page">
        <div className="bp-contact-container">
          {/* Header Section */}
          <div className="bp-contact-header">
            <h1 className="bp-contact-title">💄 تواصل معنا</h1>
            <p className="bp-contact-subtitle">
              نحن هنا لمساعدتك! تواصل معنا بأي طريقة تناسبك
            </p>
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
                  <div key={index} className={`bp-contact-card ${info.type}`}>
                    <div className="bp-contact-card-icon">{info.icon}</div>
                    <div className="bp-contact-card-content">
                      <h3>{info.title}</h3>
                      <p>{info.content}</p>
                      <a
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
                        className="bp-contact-link"
                      >
                        {info.linkText}
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Business Hours */}
              <div className="bp-contact-business-hours">
                <h3>🕐 أوقات العمل</h3>
                <div className="bp-contact-hours-list">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className="bp-contact-hour-item">
                      <span className="bp-contact-day">{schedule.day}</span>
                      <span className="bp-contact-hours">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bp-contact-quick-actions">
                <h3>⚡ إجراءات سريعة</h3>
                <div className="bp-contact-action-buttons">
                  <a
                    href="https://wa.me/970590000000?text=مرحباً، أريد الاستفسار عن منتجاتكم"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bp-contact-action-btn bp-contact-whatsapp-btn"
                  >
                    <span>💬</span>
                    محادثة واتساب
                  </a>
                  <a
                    href="tel:+970590000000"
                    className="bp-contact-action-btn bp-contact-call-btn"
                  >
                    <span>📞</span>
                    اتصال مباشر
                  </a>
                  <a
                    href="/products"
                    className="bp-contact-action-btn bp-contact-products-btn"
                  >
                    <span>🛍️</span>
                    تصفح المنتجات
                  </a>
                </div>
              </div>

              {/* Customer Service Notice */}
              <div className="bp-contact-service-notice">
                <h4>💡 نصائح للحصول على أفضل خدمة</h4>
                <ul>
                  <li>تأكد من كتابة رقم الهاتف بشكل صحيح</li>
                  <li>وضح نوع البشرة عند الاستفسار عن المنتجات</li>
                  <li>اذكر أي حساسية لديك من مكونات معينة</li>
                  <li>نحن نقدم استشارات مجانية لاختيار المنتج المناسب</li>
                </ul>
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
