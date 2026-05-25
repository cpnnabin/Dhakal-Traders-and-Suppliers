import React from 'react';
import { useLanguage } from '../LanguageContext';

const Hero: React.FC = () => {
  const { lang } = useLanguage();
  return (
    <section className="hero" id="hero">
      <div className="hero-bg"></div>
      <div className="hero-pattern"></div>
      <div className="hero-red-accent"></div>
      <div className="hero-circle hc1"></div>
      <div className="hero-circle hc2"></div>
      <div className="hero-circle hc3"></div>
      <div className="hero-circle hc4"></div>
      <div className="hero-est">
        {lang === 'ne'
          ? '✦ वि.सं. २०६२ देखि — दुई दशकको अनुभव ✦'
          : '✦ Since 2062 B.S. (2005 A.D.) — Two Decades of Trust ✦'}
      </div>
      <div className="hero-badge">
        {lang === 'ne' ? '✦ बागचौर · सल्यान · नेपाल ✦' : '✦ Bagchaur · Salyan · Nepal ✦'}
      </div>
      <h1 className="hero-title">
        {lang === 'ne' ? (
          <>
            ढकाल&nbsp;ट्रेडर्स<br />एण्ड&nbsp;सप्लायर्स
          </>
        ) : (
          <>
            Dhakal&nbsp;Traders<br />&amp;&nbsp;Suppliers
          </>
        )}
      </h1>
      <p className="hero-en-title">
        {lang === 'ne' ? 'Dhakal Traders & Suppliers' : 'ढकाल ट्रेडर्स एण्ड सप्लायर्स'}
      </p>
      <div className="hero-line"></div>
      <p className="hero-tagline">
        {lang === 'ne'
          ? 'विभिन्न दैनिक उपभोग्य सामानहरू पाइन्छन् साथै विभिन्न जडीबुटी खरिद बिक्री गरिन्छ। वि.सं. २०६२ देखि स्थानीय किसान र ग्राहकहरूको भरोसाको साथी।'
          : 'We offer various daily consumer goods and trade in various medicinal herbs. Your trusted partner for farmers and customers since 2062 B.S.'}
      </p>
      <div className="hero-btns">
        <a href="#products" className="btn-primary">
          {lang === 'ne' ? 'हाम्रा उत्पादनहरू हेर्नुहोस्' : 'View Our Products'}
        </a>
        <a href="#contact" className="btn-outline">
          {lang === 'ne' ? 'कोटेशन प्राप्त गर्नुहोस्' : 'Get a Quote'}
        </a>
      </div>
    </section>
  );
};

export default Hero;
