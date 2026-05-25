export interface ServiceGridItem {
  icon: string;
  accent: string;
  ne_title: string;
  en_title: string;
  ne_desc: string;
  en_desc: string;
  href: string;
}

export const servicesGrid: ServiceGridItem[] = [
  {
    icon: '🌿',
    accent: '#16a34a',
    ne_title: 'जडीबुटी संकलन र बजारीकरण',
    en_title: 'Herb Collection & Marketing',
    ne_desc: 'वन तथा कृषिजन्य जडीबुटीको संकलन, संरक्षण, प्रशोधन र राष्ट्रिय–अन्तर्राष्ट्रिय बजारमा विस्तार।',
    en_desc: 'Collection, preservation, processing, and expansion of forest and agricultural herbs into national and international markets.',
    href: '#herbs'
  },
  {
    icon: '🫚',
    accent: '#ea580c',
    ne_title: 'टिमुर खरिद बिक्री',
    en_title: 'Timur Trading',
    ne_desc: 'टिमुर (Zanthoxylum armatum) को व्यवस्थित खरिद, बिक्री र ढुवानी — प्रति लट १०–१५ टन।',
    en_desc: 'Systematic purchase, sale, and transportation of Timur — 10–15 tons per batch.',
    href: '#timur'
  },
  {
    icon: '👨‍🌾',
    accent: '#2563eb',
    ne_title: 'किसान सहयोग',
    en_title: 'Farmer Support',
    ne_desc: 'स्थानीय किसानको उत्पादन उचित मूल्यमा बजारसम्म पुर्‍याई आम्दानी वृद्धि गर्ने।',
    en_desc: 'Supporting local farmers by ensuring fair pricing and improving their market access and income.',
    href: '#farmer-advice'
  },
  {
    icon: '🛍️',
    accent: '#c8102e',
    ne_title: 'दैनिक उपभोग्य वस्तु',
    en_title: 'Daily Consumer Goods',
    ne_desc: 'खाद्यान्न, तेल (तोरी, सनफ्लावर, भटमास), मसला, नुन र अन्य आवश्यक सामग्री।',
    en_desc: 'Food grains, oils (mustard, sunflower, soybean), spices, salt, and other essential goods.',
    href: '#daily-items'
  },
  {
    icon: '📦',
    accent: '#d97706',
    ne_title: 'थोक आपूर्ति र ढुवानी',
    en_title: 'Wholesale Supply & Logistics',
    ne_desc: 'थोक मात्रामा सामान तथा जडीबुटी उत्पादनहरूको आपूर्ति र ढुवानी सेवा।',
    en_desc: 'Bulk supply and transportation services for goods and herbal products.',
    href: '#daily-items'
  },
  {
    icon: '🏭',
    accent: '#7c3aed',
    ne_title: 'उत्पादन र प्रसस्करण',
    en_title: 'Production & Processing',
    ne_desc: 'जडीबुटी, खाद्यान्न र कृषि उत्पादनको संग्रह, प्रसस्करण र मानक अनुरूप तयारी।',
    en_desc: 'Collection, processing, and standardized preparation of herbs, grains, and agricultural products.',
    href: '#products'
  }
];
