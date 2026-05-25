export interface AboutCardItem {
  icon: string;
  ne_title: string;
  en_title: string;
  ne_desc: string;
  en_desc: string;
}

export const aboutCards: AboutCardItem[] = [
  {
    icon: '🏛️',
    ne_title: 'दुई दशकको अनुभव',
    en_title: 'Two Decades of Experience',
    ne_desc: 'वि.सं. २०६२ देखि दर्ता भई सञ्चालनमा रहेको भरपर्दो प्रतिष्ठान।',
    en_desc: 'Trusted institution registered and operating since 2062 B.S.',
  },
  {
    icon: '🌿',
    ne_title: 'जडीबुटी संकलन र बजारीकरण',
    en_title: 'Herb Collection & Marketing',
    ne_desc: 'वन तथा कृषिजन्य जडीबुटीको संकलन, संरक्षण, प्रशोधन र व्यवस्थित बजारीकरण।',
    en_desc: 'Collection, preservation, processing and systematic marketing of herbs.',
  },
  {
    icon: '👨‍🌾',
    ne_title: 'किसानमैत्री व्यापार',
    en_title: 'Farmer-Friendly Trade',
    ne_desc: 'किसानको उत्पादन उचित मूल्यमा बजारसम्म पुर्‍याउने र आम्दानी वृद्धि गर्ने लक्ष्य।',
    en_desc: 'Aim to deliver farmer products to markets at fair prices and increase their income.',
  },
  {
    icon: '🌐',
    ne_title: 'राष्ट्रिय र अन्तर्राष्ट्रिय विस्तार',
    en_title: 'National & International Reach',
    ne_desc: 'स्थानीय उत्पादनलाई राष्ट्रिय तथा अन्तर्राष्ट्रिय बजारमा विस्तार।',
    en_desc: 'Expanding local products to national and international markets.',
  },
];
