import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/About.css";

// صفحة من نحن
function About() {
  const values = [
    {
      icon: "✨",
      title: "الجودة العالية",
      description:
        "نختار منتجاتنا بعناية فائقة لضمان أعلى معايير الجودة والفعالية",
    },
    {
      icon: "🌿",
      title: "المكونات الطبيعية",
      description: "نركز على المنتجات الطبيعية والآمنة للبشرة والشعر",
    },
    {
      icon: "💝",
      title: "خدمة العملاء",
      description: "نقدم استشارات مجانية ودعم مستمر لجميع عملائنا",
    },
    {
      icon: "🚚",
      title: "التوصيل السريع",
      description: "نوصل منتجاتك بسرعة وأمان إلى باب منزلك",
    },
    {
      icon: "💰",
      title: "أسعار منافسة",
      description: "نوفر أفضل المنتجات بأسعار عادلة ومناسبة للجميع",
    },
    {
      icon: "🎯",
      title: "التخصص",
      description: "فريق متخصص في مجال التجميل والعناية بالبشرة",
    },
  ];

  const achievements = [
    {
      number: "5000+",
      label: "عميل راضٍ",
      icon: "👥",
    },
    {
      number: "200+",
      label: "منتج متميز",
      icon: "💄",
    },
    {
      number: "3",
      label: "سنوات خبرة",
      icon: "📅",
    },
    {
      number: "24/7",
      label: "دعم العملاء",
      icon: "🎧",
    },
  ];

  const testimonials = [
    {
      name: "سارة أحمد",
      text: "منتجات رائعة وخدمة ممتازة! أنصح الجميع بالتسوق من هنا",
      rating: 5,
      image: "👩‍💼",
    },
    {
      name: "ليلى محمد",
      text: "وجدت كل ما أحتاجه للعناية ببشرتي، والأسعار مناسبة جداً",
      rating: 5,
      image: "👩‍🎨",
    },
    {
      name: "نور خالد",
      text: "التوصيل سريع والمنتجات أصلية 100%. متجر موثوق",
      rating: 5,
      image: "👩‍💻",
    },
  ];

  const milestones = [
    {
      year: "2022",
      title: "البداية",
      description: "تأسيس المتجر برؤية تقديم أفضل منتجات التجميل",
    },
    {
      year: "2023",
      title: "التوسع",
      description: "إضافة مئات المنتجات الجديدة وتطوير الموقع الإلكتروني",
    },
    {
      year: "2024",
      title: "النجاح",
      description: "وصولنا لآلاف العملاء الراضين عبر فلسطين",
    },
    {
      year: "2025",
      title: "المستقبل",
      description: "خطط للتوسع وإضافة خطوط منتجات جديدة",
    },
  ];

  return (
    <>
      <Navbar />
      <div className="bp-about-page">
        <div className="bp-about-container">
          {/* Hero Section */}
          <div className="bp-about-hero">
            <div className="bp-about-hero-content">
              <h1 className="bp-about-hero-title">💄 من نحن</h1>
              <p className="bp-about-hero-subtitle">
                رحلتنا في عالم الجمال والعناية بدأت بحلم بسيط: جعل كل امرأة تشعر
                بجمالها الطبيعي
              </p>
              <div className="bp-about-hero-image">
                <div className="bp-about-image-placeholder">
                  <span className="bp-about-placeholder-icon">🌸</span>
                  <p>صورة المتجر أو الفريق</p>
                </div>
              </div>
            </div>
          </div>

          {/* Our Story Section */}
          <div className="bp-about-story-section">
            <div className="bp-about-section-header">
              <h2>📖 قصتنا</h2>
              <p>كيف بدأت رحلتنا في عالم الجمال</p>
            </div>

            <div className="bp-about-story-content">
              <div className="bp-about-story-text">
                <div className="bp-about-story-paragraph">
                  <h3>🌟 البداية</h3>
                  <p>
                    نحن شركة محلية فلسطينية متخصصة في بيع منتجات التجميل
                    والعناية بالبشرة والشعر. بدأت رحلتنا من نابلس بشغف كبير
                    للجمال والرغبة في تقديم أفضل المنتجات لنساء فلسطين.
                  </p>
                </div>

                <div className="bp-about-story-paragraph">
                  <h3>💎 النمو والتطور</h3>
                  <p>
                    مع مرور الوقت، توسعت عائلتنا لتشمل آلاف العملاء الراضين عن
                    منتجاتنا وخدماتنا. نحرص على اختيار كل منتج بعناية فائقة
                    لضمان رضا عملائنا وجمالهم الدائم.
                  </p>
                </div>

                <div className="bp-about-story-paragraph">
                  <h3>🎯 رؤيتنا</h3>
                  <p>
                    نسعى لنكون الخيار الأول لكل امرأة تبحث عن منتجات تجميل عالية
                    الجودة بأسعار مناسبة. نؤمن بأن كل امرأة تستحق أن تشعر بالثقة
                    والجمال كل يوم.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="bp-about-values-section">
            <div className="bp-about-section-header">
              <h2>💝 قيمنا ومبادئنا</h2>
              <p>ما يميزنا ويجعلنا مختلفين</p>
            </div>

            <div className="bp-about-values-grid">
              {values.map((value, i) => (
                <div key={i} className="bp-about-value-card">
                  <div className="bp-about-value-icon">{value.icon}</div>
                  <h3 className="bp-about-value-title">{value.title}</h3>
                  <p className="bp-about-value-description">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements Section */}
          <div className="bp-about-achievements-section">
            <div className="bp-about-section-header">
              <h2>🏆 إنجازاتنا بالأرقام</h2>
              <p>أرقام تتحدث عن نجاحنا وثقة عملائنا</p>
            </div>

            <div className="bp-about-achievements-grid">
              {achievements.map((a, i) => (
                <div key={i} className="bp-about-achievement-card">
                  <div className="bp-about-achievement-icon">{a.icon}</div>
                  <div className="bp-about-achievement-number">{a.number}</div>
                  <div className="bp-about-achievement-label">{a.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bp-about-timeline-section">
            <div className="bp-about-section-header">
              <h2>📅 رحلتنا عبر الزمن</h2>
              <p>المحطات المهمة في تاريخ متجرنا</p>
            </div>

            <div className="bp-about-timeline">
              {milestones.map((m, i) => (
                <div key={i} className="bp-about-timeline-item">
                  <div className="bp-about-timeline-year">{m.year}</div>
                  <div className="bp-about-timeline-content">
                    <h3 className="bp-about-timeline-title">{m.title}</h3>
                    <p className="bp-about-timeline-description">
                      {m.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="bp-about-testimonials-section">
            <div className="bp-about-section-header">
              <h2>💬 ماذا يقول عملاؤنا</h2>
              <p>تجارب حقيقية من عملائنا الكرام</p>
            </div>

            <div className="bp-about-testimonials-grid">
              {testimonials.map((t, i) => (
                <div key={i} className="bp-about-testimonial-card">
                  <div className="bp-about-testimonial-header">
                    <div className="bp-about-customer-avatar">{t.image}</div>
                    <div className="bp-about-customer-info">
                      <h4 className="bp-about-customer-name">{t.name}</h4>
                      <div className="bp-about-rating">
                        {[...Array(t.rating)].map((_, r) => (
                          <span key={r} className="bp-about-star">
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="bp-about-testimonial-text">"{t.text}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Section */}
          <div className="bp-about-team-section">
            <div className="bp-about-section-header">
              <h2>👥 فريق العمل</h2>
              <p>الأشخاص المتميزون وراء نجاحنا</p>
            </div>

            <div className="bp-about-team-content">
              <div className="bp-about-team-message">
                <h3>🌟 فريق متخصص ومتفاني</h3>
                <p>
                  يتكون فريقنا من خبراء في مجال التجميل والعناية بالبشرة، يعملون
                  بشغف لتقديم أفضل الخدمات والمنتجات. نحن نؤمن بأن الجمال
                  الحقيقي يأتي من الثقة بالنفس، ونسعى لمساعدة كل عميلة على
                  اكتشاف جمالها الطبيعي.
                </p>
                <div className="bp-about-team-qualities">
                  <div className="bp-about-quality">
                    <span className="bp-about-quality-icon">🎓</span>
                    <span>خبرة متخصصة</span>
                  </div>
                  <div className="bp-about-quality">
                    <span className="bp-about-quality-icon">❤️</span>
                    <span>شغف بالجمال</span>
                  </div>
                  <div className="bp-about-quality">
                    <span className="bp-about-quality-icon">🤝</span>
                    <span>خدمة مميزة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bp-about-cta-section">
            <div className="bp-about-cta-content">
              <h2>🛍️ ابدأ رحلتك مع الجمال</h2>
              <p>اكتشف مجموعتنا المتنوعة من منتجات التجميل والعناية</p>
              <div className="bp-about-cta-buttons">
                <a href="/products" className="bp-about-cta-btn primary">
                  <span>💄</span>
                  تصفح المنتجات
                </a>
                <a href="/contact" className="bp-about-cta-btn secondary">
                  <span>📞</span>
                  تواصل معنا
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default About;
