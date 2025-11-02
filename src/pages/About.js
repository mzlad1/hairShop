import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
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
      description: "منتجاتنا خالية من المواد الكيميائية الضارة والمواد المصنعة",
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

  const [featuredFeedbacks, setFeaturedFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  // Fetch featured feedbacks
  useEffect(() => {
    const fetchFeaturedFeedbacks = async () => {
      try {
        const q = query(
          collection(db, "feedbacks"),
          where("status", "==", "approved"),
          where("isFeatured", "==", true),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const feedbacks = [];
        querySnapshot.forEach((doc) => {
          feedbacks.push({ id: doc.id, ...doc.data() });
        });
        setFeaturedFeedbacks(feedbacks);
      } catch (error) {
        console.error("Error fetching featured feedbacks:", error);
        // Fallback to empty array
        setFeaturedFeedbacks([]);
      } finally {
        setLoadingFeedbacks(false);
      }
    };

    fetchFeaturedFeedbacks();
  }, []);

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

          {/* Our Story Section */}
          <div className="bp-about-story-section">
            <div className="bp-about-section-header">
              <h2>📖 قصتنا</h2>
            </div>

            <div className="bp-about-story-content">
              <div className="bp-about-story-text">
                <div className="bp-about-story-paragraph">
                  <h2>🌟 مين احنا</h2>
                  <h3>
                    <p>
                    فكرتنا بلشت من بنت شعرها كيرلي، كانت تواجه صعوبة في فهم شعرها وكيف تعتني فيه. بعد سنين من التجارب والكثير من المنتجات ، قدرت تكتشف الطرق الصحيحة للاهتمام بشعرها وتبرز جماله. ومن هون، قررت تساعد كل بنت بتمر بنفس التجربة.
                    <br /><br />
                    هدفنا هو نشر ثقافة العناية بالشعر الكيرلي والويفي، ونثبت إن الشعر الطبيعي مو لازم يتغيّر أو يتخبّى، بالعكس هو جزء من جمالك وتميّزك! ✨
                    <br /><br />
                    في موقعنا رح تلاقي منتجات مجربة و مختارة بعناية رح تساعدك تبرزي جمال كيرلياتك!💕
                    </p>
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features Section */}
          <div className="bp-about-features-section">
            <div className="bp-about-section-header">
              <h2>🚀 مميزاتنا الأساسية</h2>
              <p>ثلاثة أسباب تجعل عملائنا يختاروننا</p>
            </div>

            <div className="bp-about-features-grid">
              <div className="bp-about-feature-card bp-about-feature-quality">
                <div className="bp-about-feature-icon">✨</div>
                <h3 className="bp-about-feature-title">الجودة العالية</h3>
                <p className="bp-about-feature-description">
                  نختار منتجاتنا بعناية فائقة من أفضل العلامات التجارية
                  العالمية. كل منتج يخضع لاختبارات الجودة لضمان الفعالية
                  والأمان. نؤمن بأن الجودة هي الأساس الذي نبني عليه ثقة عملائنا.
                </p>
                <div className="bp-about-feature-benefits">
                  <span className="bp-about-feature-benefit">
                    ✓ منتجات معتمدة
                  </span>
                  <span className="bp-about-feature-benefit">
                    ✓ مكونات آمنة
                  </span>
                  <span className="bp-about-feature-benefit">
                    ✓ نتائج مضمونة
                  </span>
                </div>
              </div>

              <div className="bp-about-feature-card bp-about-feature-delivery">
                <div className="bp-about-feature-icon">🚚</div>
                <h3 className="bp-about-feature-title">التوصيل السريع</h3>
                <p className="bp-about-feature-description">
                  نضمن وصول منتجاتك بسرعة وأمان إلى باب منزلك. نقدم خيارات توصيل
                  مرنة تناسب جميع احتياجاتك، مع تتبع مباشر لطلبك من لحظة التأكيد
                  حتى الوصول.
                </p>
                <div className="bp-about-feature-benefits">
                  <span className="bp-about-feature-benefit">✓ توصيل سريع</span>
                  <span className="bp-about-feature-benefit">✓ تغليف آمن</span>
                </div>
              </div>

              <div className="bp-about-feature-card bp-about-feature-service">
                <div className="bp-about-feature-icon">💝</div>
                <h3 className="bp-about-feature-title">خدمة العملاء</h3>
                <p className="bp-about-feature-description">
                  فريق خدمة العملاء لدينا متاح على مدار الساعة لمساعدتك. نقدم
                  نصائح شخصية لاختيار المنتجات المناسبة، مع ضمان رضاك التام عن
                  تجربتك معنا.
                </p>
                <div className="bp-about-feature-benefits">
                  <span className="bp-about-feature-benefit">✓ دعم 24/7</span>
                  <span className="bp-about-feature-benefit">✓ ضمان الرضا</span>
                  <span className="bp-about-feature-benefit">✓ المتابعة مع العملاء</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="bp-about-testimonials-section">
            <div className="bp-about-section-header">
              <h2>💬 ماذا يقول عملاؤنا</h2>
              <p>تجارب حقيقية من عملائنا الكرام</p>
            </div>

            <div className="bp-about-testimonials-grid">
              {loadingFeedbacks ? (
                <div className="bp-about-loading">
                  جاري تحميل التقييمات المميزة...
                </div>
              ) : featuredFeedbacks.length > 0 ? (
                featuredFeedbacks.map((feedback) => (
                  <div key={feedback.id} className="bp-about-testimonial-card">
                    <div className="bp-about-testimonial-header">
                      <div className="bp-about-customer-avatar">👤</div>
                      <div className="bp-about-customer-info">
                        <h4 className="bp-about-customer-name">
                          {feedback.name}
                        </h4>
                        <div className="bp-about-rating">
                          {feedback.rating &&
                            [...Array(feedback.rating)].map((_, r) => (
                              <span key={r} className="bp-about-star">
                                ⭐
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                    <p className="bp-about-testimonial-text">
                      "{feedback.comment}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="bp-about-no-feedbacks">
                  <p>لا توجد تقييمات مميزة حالياً</p>
                  <p>
                    سيتم عرض التقييمات المميزة هنا بعد إضافتها من قبل الإدارة
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="bp-about-cta-section">
            <div className="bp-about-cta-content">
              <h2>🛍️ ابدأي رحلتك الكيرلية</h2>
              <p>تواصلي معنا حتى نساعدك</p>
              <div className="bp-about-cta-buttons">
                <a href="/products" className="bp-about-cta-btn primary">
                  <span>💄</span>
                  تصفحي المنتجات
                </a>
                <a href="/contact" className="bp-about-cta-btn secondary">
                  <span>📞</span>
                  تواصلي معنا
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
