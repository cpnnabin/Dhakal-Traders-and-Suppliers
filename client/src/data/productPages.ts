export interface ProductStat {
  icon: string;
  ne_num: string;
  en_num: string;
  ne_label: string;
  en_label: string;
}

export interface ProductPageData {
  id: string;
  bgImage: string;
  bgAlt: string;
  sectionLabelNe: string;
  sectionLabelEn: string;
  titleNe: string;
  titleEn: string;
  subtitleNe: string;
  subtitleEn: string;
  paragraphsNe: string[];
  paragraphsEn: string[];
  stats: ProductStat[];
}

export const productPagesData: Record<string, ProductPageData> = {
  timur: {
    id: 'timur',
    bgImage: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=1600&q=80',
    bgAlt: 'टिमुर / Timur',
    sectionLabelNe: 'हाम्रो विशेषता',
    sectionLabelEn: 'Our Specialty',
    titleNe: 'टिमुर व्यापार',
    titleEn: 'Timur Trade',
    subtitleNe: 'Zanthoxylum armatum — नेपालको बहुमूल्य जडीबुटी',
    subtitleEn: 'Zanthoxylum armatum — A Valuable Medicinal Herb of Nepal',
    paragraphsNe: [
      'टिमुर नेपालको पहाडी क्षेत्रमा पाइने बहुमूल्य मसला तथा औषधीय जडीबुटी हो। यसको बजार माग निरन्तर बढ्दो क्रममा रहेको सन्दर्भमा हामी स्थानीय स्तरमा संकलित उत्पादनलाई व्यवस्थित प्रक्रियामार्फत ग्राहकसम्म पुर्‍याउँदै आएका छौं। गुणस्तर, उचित मूल्य निर्धारण र समयमै आपूर्ति सुनिश्चित गर्दै विश्वासिलो तथा दिगो व्यापार प्रणाली विकास गर्नु हाम्रो मुख्य उद्देश्य हो।',
      'आवश्यकता अनुसार थोक आपूर्ति, व्यवस्थित ढुवानी तथा निरन्तर सेवा प्रदान गर्दै दीर्घकालीन व्यावसायिक सम्बन्ध र पारदर्शी कारोबार प्रणालीलाई सुदृढ बनाउन हामी निरन्तर क्रियाशील छौं। उत्पादन छनोटदेखि भण्डारण र वितरणसम्म प्रत्येक चरणमा गुणस्तर मापदण्डको पालना गर्दै कार्य गरिन्छ।'
    ],
    paragraphsEn: [
      'Timur is a valuable spice and medicinal herb found in the hilly regions of Nepal. With continuously growing market demand, we ensure that locally collected products are systematically delivered to customers. Our main objective is to build a reliable and sustainable trading system by ensuring quality, fair pricing, and timely supply.',
      'We provide wholesale supply, organized transportation, and continuous service based on demand while strengthening long-term business relationships. From product selection to storage and distribution, we maintain strict quality standards and offer flexible services according to market needs.'
    ],
    stats: [
      { icon: '🌿', ne_num: 'टिमुर', en_num: 'Timur', ne_label: 'प्रमुख उत्पादन', en_label: 'Main Product' },
      { icon: '⚖️', ne_num: '१५ टन', en_num: '15 Tons', ne_label: 'प्रति लट क्षमता', en_label: 'Per Batch Capacity' },
      { icon: '🚛', ne_num: 'ढुवानी', en_num: 'Transport', ne_label: 'सम्पूर्ण सेवा', en_label: 'Full Service' },
      { icon: '🏔️', ne_num: 'सल्यान', en_num: 'Salyan', ne_label: 'संकलन क्षेत्र', en_label: 'Collection Area' }
    ]
  },
  herbs: {
    id: 'herbs',
    bgImage: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1600&q=80',
    bgAlt: 'जडीबुटी / Medicinal herbs',
    sectionLabelNe: 'प्राकृतिक सम्पदा',
    sectionLabelEn: 'Natural Heritage',
    titleNe: 'जडीबुटी',
    titleEn: 'Medicinal Herbs',
    subtitleNe: 'नेपालका उच्च पहाडी तथा हिमाली भेगका शुद्ध जडीबुटीहरू',
    subtitleEn: 'Pure herbs from the high hills and Himalayas of Nepal',
    paragraphsNe: [
      'नेपाल बहुमूल्य तथा जीवनदायिनी जडीबुटीहरूको खानी हो। हामीले सल्यान तथा वरपरका पहाडी जिल्लाहरूबाट संकलित शुद्ध, प्राकृतिक र उच्च गुणस्तरका जडीबुटीहरू संकलन गरी राष्ट्रिय तथा अन्तर्राष्ट्रिय बजारसम्म पुर्‍याउने कार्य गर्दै आएका छौं।',
      'हाम्रो संकलन प्रक्रियामा जडीबुटीको दिगो उपयोग र स्थानीय संकलकहरूको आयस्तर वृद्धिमा विशेष ध्यान दिइन्छ। परम्परागत ज्ञान र आधुनिक प्रशोधन विधिको फ्युजन गर्दै हामीले जडीबुटीको वास्तविक मूल्य अभिवृद्धि गरिरहेका छौं।'
    ],
    paragraphsEn: [
      'Nepal is a treasure trove of valuable and life-saving medicinal herbs. We collect pure, natural, and high-quality herbs from Salyan and surrounding hilly districts to supply them to national and international markets.',
      'Our collection process focuses on the sustainable use of herbs and increasing the income level of local collectors. By fusing traditional knowledge with modern processing methods, we are adding real value to medicinal herbs.'
    ],
    stats: [
      { icon: '🌱', ne_num: 'प्राकृतिक', en_num: 'Natural', ne_label: '१००% शुद्ध', en_label: '100% Pure' },
      { icon: '🤝', ne_num: 'संकलक', en_num: 'Collectors', ne_label: 'स्थानीय किसान', en_label: 'Local Farmers' },
      { icon: '📦', ne_num: 'थोक', en_num: 'Wholesale', ne_label: 'आपूर्ति सुविधा', en_label: 'Supply Available' },
      { icon: '✨', ne_num: 'गुणस्तर', en_num: 'Quality', ne_label: 'सर्वोत्कृष्ट', en_label: 'Premium' }
    ]
  },
  ginger: {
    id: 'ginger',
    bgImage: 'https://baahrakhari.com/uploads/posts/ginger-1696219134.jpg',
    bgAlt: 'अदुवा / Fresh ginger',
    sectionLabelNe: 'कृषि उत्पादन',
    sectionLabelEn: 'Agricultural Product',
    titleNe: 'अदुवा',
    titleEn: 'Ginger',
    subtitleNe: 'ताजा, अर्गानिक र स्वादिलो सल्यानी अदुवा',
    subtitleEn: 'Fresh, organic, and flavorful Salyani Ginger',
    paragraphsNe: [
      'अदुवा सल्यान जिल्लाको एक प्रमुख नगदे बाली हो। यहाँको हावापानीमा उत्पादित अदुवा निकै गुणस्तरीय र स्वादिलो मानिन्छ। यसको प्रयोग भान्सामा मसलाको रूपमा र परम्परागत औषधिको रूपमा व्यापक छ।',
      'हामी स्थानीय किसानहरूबाट सिधै ताजा अदुवा खरिद गरी बजारमा पुर्‍याउँछौं। यसले गर्दा किसानले उचित मूल्य पाउँछन् र उपभोक्ताले गुणस्तरीय उत्पादन प्राप्त गर्छन्।'
    ],
    paragraphsEn: [
      'Ginger is a major cash crop in the Salyan district. Ginger produced in this climate is considered highly qualitative and flavorful. It is widely used as a spice in kitchens and in traditional medicine.',
      'We purchase fresh ginger directly from local farmers and supply it to the market. This ensures fair prices for farmers and quality products for consumers.'
    ],
    stats: [
      { icon: '🌿', ne_num: 'अदुवा', en_num: 'Ginger', ne_label: 'नगदे बाली', en_label: 'Cash Crop' },
      { icon: '🌱', ne_num: 'अर्गानिक', en_num: 'Organic', ne_label: 'उत्पादन', en_label: 'Farming' },
      { icon: '🍲', ne_num: 'मसला', en_num: 'Spice', ne_label: 'भान्सा', en_label: 'Kitchen' },
      { icon: '📈', ne_num: 'माग', en_num: 'Demand', ne_label: 'उच्च', en_label: 'High' }
    ]
  },
  'hemp-seeds': {
    id: 'hemp-seeds',
    bgImage: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=1600&q=80',
    bgAlt: 'भाङ्गो / Hemp seeds',
    sectionLabelNe: 'स्थानीय उत्पादन',
    sectionLabelEn: 'Local Produce',
    titleNe: 'भाङ्गो',
    titleEn: 'Hemp Seeds',
    subtitleNe: 'परम्परागत स्वाद र पोषणको भण्डार',
    subtitleEn: 'A treasure of traditional taste and nutrition',
    paragraphsNe: [
      'सल्यानको भाङ्गो आफ्नो विशिष्ट स्वाद र सुगन्धको लागि नेपालभर प्रसिद्ध छ। भाङ्गोको अचार नेपाली भान्साको एक लोकप्रिय परिकार हो, जुन स्वादिलो मात्र नभई स्वास्थ्यका लागि पनि निकै लाभदायक छ।',
      'हामीले सल्यानका पहाडी भेगबाट शुद्ध र उच्च गुणस्तरको भाङ्गो संकलन गरी प्याकेजिङ गर्दै आएका छौं।'
    ],
    paragraphsEn: [
      'Salyan\'s hemp seeds are famous all over Nepal for their distinct taste and aroma. Hemp seed pickle is a popular dish in the Nepali kitchen, which is not only tasty but also very beneficial for health.',
      'We collect pure and high-quality hemp seeds from the hilly regions of Salyan and package them carefully.'
    ],
    stats: [
      { icon: '🌰', ne_num: 'भाङ्गो', en_num: 'Hemp', ne_label: 'दाना', en_label: 'Seeds' },
      { icon: '😋', ne_num: 'स्वादिलो', en_num: 'Tasty', ne_label: 'अचार', en_label: 'Pickle' },
      { icon: '🛡️', ne_num: 'पोषण', en_num: 'Nutrition', ne_label: 'युक्त', en_label: 'Rich' },
      { icon: '✅', ne_num: 'शुद्ध', en_num: 'Pure', ne_label: 'गुणस्तर', en_label: 'Quality' }
    ]
  },
  garlic: {
    id: 'garlic',
    bgImage: 'https://sewapoint.com/image-1667270211031-garlic.jpeg',
    bgAlt: 'लसुन / Fresh garlic',
    sectionLabelNe: 'मसला बाली',
    sectionLabelEn: 'Spices',
    titleNe: 'लसुन',
    titleEn: 'Garlic',
    subtitleNe: 'उच्च गुणस्तरको स्थानीय लसुन',
    subtitleEn: 'High-quality local garlic',
    paragraphsNe: [
      'सल्यानको पहाडी हावापानीमा उत्पादित लसुन निकै कडा स्वाद र औषधीय गुणले युक्त हुन्छ। यसको सुगन्धले खानाको स्वाद बढाउनुका साथै स्वास्थ्यलाई पनि फाइदा पुर्‍याउँछ।',
      'हामी स्थानीय किसानहरूबाट सिधै लसुन संकलन गर्छौं र बजारको माग अनुसार थोक तथा खुद्रा रूपमा बिक्री वितरण गर्छौं।'
    ],
    paragraphsEn: [
      'Garlic produced in the hilly climate of Salyan has a strong flavor and medicinal properties. Its aroma enhances the taste of food and benefits health.',
      'We collect garlic directly from local farmers and distribute it wholesale and retail according to market demand.'
    ],
    stats: [
      { icon: '🧄', ne_num: 'लसुन', en_num: 'Garlic', ne_label: 'स्थानीय', en_label: 'Local' },
      { icon: '🌿', ne_num: 'औषधीय', en_num: 'Medicinal', ne_label: 'गुण', en_label: 'Value' },
      { icon: '🏥', ne_num: 'स्वास्थ्य', en_num: 'Health', ne_label: 'वर्धक', en_label: 'Benefits' },
      { icon: '📦', ne_num: 'थोक', en_num: 'Wholesale', ne_label: 'विक्रेता', en_label: 'Distributor' }
    ]
  },
  beans: {
    id: 'beans',
    bgImage: 'https://himalayancrops.org/wp-content/uploads/2015/11/Laxmi-Lama-IMG_0586-1024x520.jpg',
    bgAlt: 'सिमी / Beans',
    sectionLabelNe: 'गेडागुडी',
    sectionLabelEn: 'Pulses & Beans',
    titleNe: 'सिमी',
    titleEn: 'Beans',
    subtitleNe: 'प्रोटिनको उत्कृष्ट स्रोत, अर्गानिक सिमी',
    subtitleEn: 'An excellent source of protein, organic beans',
    paragraphsNe: [
      'सल्यानका पहाडहरूमा उत्पादन हुने अर्गानिक सिमी प्रोटिन र फाइबरको उत्कृष्ट स्रोत हो। स्थानीय सिमीको स्वाद अन्यत्रको भन्दा मीठो हुन्छ र छिटो पाक्ने विशेषता हुन्छ।',
      'हामी विभिन्न प्रकारका स्थानीय सिमीहरू संकलन गरी सफा गरेर उपभोक्तासम्म पुर्‍याउँछौं। स्वस्थकर आहारका लागि यो उत्तम विकल्प हो।'
    ],
    paragraphsEn: [
      'Organic beans produced in the hills of Salyan are an excellent source of protein and fiber. Local beans taste sweeter and cook faster than others.',
      'We collect various types of local beans, clean them, and deliver them to consumers. It is a perfect choice for a healthy diet.'
    ],
    stats: [
      { icon: '🫘', ne_num: 'सिमी', en_num: 'Beans', ne_label: 'गेडागुडी', en_label: 'Pulses' },
      { icon: '💪', ne_num: 'प्रोटिन', en_num: 'Protein', ne_label: 'युक्त', en_label: 'Rich' },
      { icon: '🌱', ne_num: 'अर्गानिक', en_num: 'Organic', ne_label: 'उत्पादन', en_label: 'Production' },
      { icon: '🌍', ne_num: 'स्थानीय', en_num: 'Local', ne_label: 'स्वाद', en_label: 'Taste' }
    ]
  },
  grains: {
    id: 'grains',
    bgImage: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1600&q=80',
    bgAlt: 'खाद्यान्न / Food grains',
    sectionLabelNe: 'दैनिक आवश्यकता',
    sectionLabelEn: 'Daily Needs',
    titleNe: 'खाद्यान्न',
    titleEn: 'Food Grains',
    subtitleNe: 'स्वस्थ र पौष्टिक खाद्यान्नको भरपर्दो स्रोत',
    subtitleEn: 'A reliable source of healthy and nutritious grains',
    paragraphsNe: [
      'ढकाल ट्रेडर्स एण्ड सप्लायर्सले स्थानीय उत्पादन र आयातित गुणस्तरीय खाद्यान्नहरूको थोक तथा खुद्रा बिक्री गर्दै आएको छ। चामल, दाल, गहुँ, पिठो, मकै लगायतका सम्पूर्ण दैनिक उपभोग्य खाद्यान्नहरू हामीकहाँ उपलब्ध छन्।',
      'स्थानीय किसानहरूबाट उत्पादित अर्गानिक खाद्यान्नलाई बजारसम्म पुर्‍याउने र उपभोक्ताहरूलाई सुपथ मूल्यमा स्वच्छ खाद्यान्न उपलब्ध गराउने हाम्रो मुख्य लक्ष्य हो। हामीले खाद्य सुरक्षा र गुणस्तरलाई सधैं प्राथमिकतामा राखेका छौं।'
    ],
    paragraphsEn: [
      'Dhakal Traders & Suppliers engages in the wholesale and retail sale of locally produced and imported high-quality food grains. Rice, lentils, wheat, flour, corn, and all other daily consumable grains are available with us.',
      'Our main goal is to bring organic grains produced by local farmers to the market and provide clean food grains to consumers at reasonable prices. We always prioritize food safety and quality.'
    ],
    stats: [
      { icon: '🌾', ne_num: 'चामल', en_num: 'Rice', ne_label: 'विभिन्न प्रकार', en_label: 'Various Types' },
      { icon: '🥣', ne_num: 'दाल', en_num: 'Lentils', ne_label: 'गेडागुडी', en_label: 'Pulses' },
      { icon: '💰', ne_num: 'सुपथ', en_num: 'Fair', ne_label: 'मूल्य', en_label: 'Price' },
      { icon: '✅', ne_num: 'गुणस्तर', en_num: 'Quality', ne_label: 'प्रमाणित', en_label: 'Certified' }
    ]
  },
  'agri-materials': {
    id: 'agri-materials',
    bgImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80',
    bgAlt: 'कृषि सामग्री / Agricultural supplies and farming equipment',
    sectionLabelNe: 'किसानको साथी',
    sectionLabelEn: 'Farmer\'s Friend',
    titleNe: 'कृषि सामग्री',
    titleEn: 'Agricultural Supplies',
    subtitleNe: 'आधुनिक र उन्नत कृषिको लागि आवश्यक सम्पूर्ण सामग्रीहरू',
    subtitleEn: 'All essential materials for modern and advanced agriculture',
    paragraphsNe: [
      'हामी स्थानीय किसानहरूको उत्पादन वृद्धि र कृषि प्रणालीलाई आधुनिकीकरण गर्न आवश्यक पर्ने सम्पूर्ण कृषि सामग्रीहरू उपलब्ध गराउँछौं। उन्नत बीउबिजन, जैविक तथा रासायनिक मल, कृषि औजारहरू र अन्य प्राविधिक सामग्रीहरू हाम्रो सप्लायर्सबाट प्राप्त गर्न सकिन्छ।',
      'हाम्रो उद्देश्य केवल सामग्री बेच्नु मात्र होइन, किसानहरूलाई सही समयमा सही सामग्री र परामर्श दिएर उनीहरूको उत्पादन र आयस्तर बढाउन सहयोग गर्नु पनि हो।'
    ],
    paragraphsEn: [
      'We provide all necessary agricultural materials required to increase production and modernize the farming system for local farmers. Improved seeds, organic and chemical fertilizers, agricultural tools, and other technical supplies are available from us.',
      'Our goal is not just to sell materials, but to assist farmers in increasing their production and income levels by providing the right materials and advice at the right time.'
    ],
    stats: [
      { icon: '🌱', ne_num: 'बीउ', en_num: 'Seeds', ne_label: 'उन्नत जात', en_label: 'Improved Variety' },
      { icon: '⛏️', ne_num: 'औजार', en_num: 'Tools', ne_label: 'कृषि सामग्री', en_label: 'Agri Eqpt' },
      { icon: '🧪', ne_num: 'मल', en_num: 'Fertilizer', ne_label: 'जैविक/रासायनिक', en_label: 'Organic/Chemical' },
      { icon: '👨‍🌾', ne_num: 'परामर्श', en_num: 'Advice', ne_label: 'निःशुल्क', en_label: 'Free' }
    ]
  },
  'daily-items': {
    id: 'daily-items',
    bgImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1600&q=80',
    bgAlt: 'दैनिक उपभोग्य वस्तुहरू / Daily goods and groceries',
    sectionLabelNe: 'सम्पूर्ण आवश्यकता',
    sectionLabelEn: 'Complete Needs',
    titleNe: 'दैनिक उपभोग्य वस्तुहरू',
    titleEn: 'Daily Consumables',
    subtitleNe: 'तपाईंको भान्सा र घरको लागि आवश्यक सबै कुरा एकै ठाउँमा',
    subtitleEn: 'Everything you need for your kitchen and home in one place',
    paragraphsNe: [
      'दैनिक जीवनमा आवश्यक पर्ने सम्पूर्ण घरायसी तथा उपभोग्य सामग्रीहरू (FMCG) ढकाल ट्रेडर्समा उपलब्ध छन्। खाने तेल, नुन, चिनी, चियापत्ती, मसला, सरसफाइका सामग्रीहरू लगायत अन्य सबै किराना सामानहरू हामी थोक तथा खुद्रा मूल्यमा बिक्री गर्दछौं।',
      'ग्राहकहरूको सुविधा र सन्तुष्टिलाई मध्यनजर गर्दै हामीले बजारका उत्कृष्ट र परिचित ब्रान्डका उत्पादनहरू मात्र बिक्री वितरण गर्दै आएका छौं। सहज र सुलभ किनमेलको लागि हामी प्रतिबद्ध छौं।'
    ],
    paragraphsEn: [
      'All household and fast-moving consumer goods (FMCG) required for daily life are available at Dhakal Traders. We sell edible oil, salt, sugar, tea leaves, spices, cleaning supplies, and all other grocery items at wholesale and retail prices.',
      'Keeping customer convenience and satisfaction in mind, we distribute only the best and well-known branded products in the market. We are committed to an easy and affordable shopping experience.'
    ],
    stats: [
      { icon: '🛒', ne_num: 'सम्पूर्ण', en_num: 'All', ne_label: 'किराना सामान', en_label: 'Groceries' },
      { icon: '🏷️', ne_num: 'ब्रान्ड', en_num: 'Brands', ne_label: 'उत्कृष्ट', en_label: 'Premium' },
      { icon: '💰', ne_num: 'थोक', en_num: 'Wholesale', ne_label: 'तथा खुद्रा', en_label: 'And Retail' },
      { icon: '⭐', ne_num: 'गुणस्तर', en_num: 'Quality', ne_label: 'ग्यारेन्टी', en_label: 'Guaranteed' }
    ]
  },
  'farmer-advice': {
    id: 'farmer-advice',
    bgImage: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?w=1600&q=80',
    bgAlt: 'Farmer Consulting',
    sectionLabelNe: 'तपाईंको सफलता',
    sectionLabelEn: 'Your Success',
    titleNe: 'किसान परामर्श सेवा',
    titleEn: 'Farmer Consulting',
    subtitleNe: 'स्थानीय किसानहरूको उत्पादन वृद्धि र बजारीकरणमा सहयोग',
    subtitleEn: 'Supporting local farmers in increasing production and marketing',
    paragraphsNe: [
      'हामी स्थानीय किसानहरूलाई उनीहरूको उत्पादन क्षमता बढाउन र सही बजार खोज्न मद्दत गर्दछौं। कुन मौसममा कुन बाली वा जडीबुटी लगाउँदा राम्रो आम्दानी हुन्छ भन्ने बारेमा हामी निःशुल्क सल्लाह दिन्छौं।',
      'किसानहरूको उत्पादनलाई हामी उचित मूल्यमा खरिद गरी बजारसम्म पुर्‍याउने ग्यारेन्टी दिन्छौं। हाम्रो उद्देश्य किसानहरूको आयस्तर उकास्नु र कृषि तथा जडीबुटी क्षेत्रलाई व्यावसायिक बनाउनु हो।'
    ],
    paragraphsEn: [
      'We assist local farmers in enhancing their production capacity and finding the right market. We provide free advice on which crops or herbs to plant in which season for maximum profit.',
      'We guarantee to purchase farmers\' produce at fair prices and deliver it to the market. Our goal is to raise the income level of farmers and professionalize the agriculture and herb sector.'
    ],
    stats: [
      { icon: '🤝', ne_num: 'परामर्श', en_num: 'Advice', ne_label: 'निःशुल्क', en_label: 'Free' },
      { icon: '📈', ne_num: 'आम्दानी', en_num: 'Income', ne_label: 'वृद्धि', en_label: 'Growth' },
      { icon: '🧑‍🌾', ne_num: 'किसान', en_num: 'Farmers', ne_label: 'सशक्तिकरण', en_label: 'Empowerment' },
      { icon: '✅', ne_num: 'बजार', en_num: 'Market', ne_label: 'ग्यारेन्टी', en_label: 'Guaranteed' }
    ]
  },
  'wholesale': {
    id: 'wholesale',
    bgImage: 'https://images.unsplash.com/photo-1586528116311-ad8ed7c800bc?w=1600&q=80',
    bgAlt: 'Wholesale and Retail Logistics',
    sectionLabelNe: 'भरपर्दो आपूर्ति',
    sectionLabelEn: 'Reliable Supply',
    titleNe: 'होलसेल तथा खुद्रा सेवा',
    titleEn: 'Wholesale & Retail',
    subtitleNe: 'थोक मात्रामा सामान तथा जडीबुटी उत्पादनहरूको आपूर्ति',
    subtitleEn: 'Supply of goods and herbal products in bulk quantities',
    paragraphsNe: [
      'ढकाल ट्रेडर्सले विभिन्न प्रकारका जडीबुटी, खाद्यान्न, र दैनिक उपभोग्य वस्तुहरूको होलसेल तथा खुद्रा बिक्री वितरण गर्दै आएको छ। हामी ठूला व्यापारिक घराना, उद्योगहरू र साना व्यापारीहरूलाई उनीहरूको माग अनुसार समयमै सामान उपलब्ध गराउँछौं।',
      'हाम्रो आफ्नै व्यवस्थित ढुवानी प्रणाली र भण्डारण सुविधा भएकोले गुणस्तरमा कुनै कमी आउन नदिई सुपथ मूल्यमा सामान आपूर्ति गर्न हामी सक्षम छौं। पारदर्शी कारोबार र दीर्घकालीन व्यावसायिक सम्बन्ध हाम्रो पहिचान हो।'
    ],
    paragraphsEn: [
      'Dhakal Traders distributes various types of herbs, food grains, and daily consumables on a wholesale and retail basis. We supply goods in a timely manner to large business houses, industries, and small traders according to their demand.',
      'Having our own organized logistics and storage facilities enables us to supply goods at reasonable prices without compromising on quality. Transparent transactions and long-term business relationships are our identity.'
    ],
    stats: [
      { icon: '📦', ne_num: 'होलसेल', en_num: 'Wholesale', ne_label: 'ठूलो मात्रा', en_label: 'Bulk Volume' },
      { icon: '🚚', ne_num: 'ढुवानी', en_num: 'Logistics', ne_label: 'व्यवस्थित', en_label: 'Organized' },
      { icon: '🤝', ne_num: 'सम्बन्ध', en_num: 'Relations', ne_label: 'दीर्घकालीन', en_label: 'Long-term' },
      { icon: '💰', ne_num: 'मूल्य', en_num: 'Price', ne_label: 'सुपथ', en_label: 'Fair' }
    ]
  }
};
