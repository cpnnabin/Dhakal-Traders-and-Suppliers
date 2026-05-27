const ownerBirthDate = new Date(1983, 0, 19);

const toNepaliDigits = (value: number | string) =>
  String(value).replace(/\d/g, (digit) => '०१२३४५६७८९'[Number(digit)]);

const calculateAge = (birthDate: Date, today = new Date()) => {
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

export const getOwnerContactDetails = () => {
  const age = calculateAge(ownerBirthDate);

  return [
    { labelNe: 'पूरा नाम', labelEn: 'Full Name', valueNe: 'दिपक शर्मा (@dipaksharma)', valueEn: 'Dipak Sharma (@dipaksharma)' },
    { labelNe: 'पद', labelEn: 'Position', valueNe: 'संस्थापक तथा प्रोपाइटर', valueEn: 'Founder & Proprietor' },
    { labelNe: 'संस्था', labelEn: 'Company', valueNe: 'ढकाल ट्रेडर्स एण्ड सप्लायर्स', valueEn: 'Dhakal Traders & Suppliers' },
    { labelNe: 'जन्म मिति', labelEn: 'Date of Birth', valueNe: 'वि.सं. २०३९ माघ ५ गते', valueEn: 'January 19, 1983' },
    { labelNe: 'उमेर', labelEn: 'Age', valueNe: `${toNepaliDigits(age)} वर्ष`, valueEn: `${age} years` },
    { labelNe: 'स्थायी ठेगाना', labelEn: 'Hometown', valueNe: 'बागचौर–९, बथान, सल्यान', valueEn: 'Bagchaur-9, Bathan, Salyan' },
  ];
};

export const ownerProfile = {
  hero: {
    nameNe: 'दिपक शर्मा',
    nameEn: 'Dipak Sharma',
    roleNe: 'संस्थापक तथा प्रबन्ध निर्देशक',
    roleEn: 'Founder & Managing Director',
    handle: '@dipaksharma',
    summaryNe:
      'दिपक शर्मा वि.सं. २०३९ साल माघ ५ गते सल्यान जिल्लाको बागचौर नगरपालिका–९, बथानमा जन्मनुभएको एक सफल व्यवसायी, समाजसेवी, कृषि उद्यमी तथा प्रेरणादायी व्यक्तित्व हुनुहुन्छ।',
    summaryEn:
      'Dipak Sharma was born on January 19, 1983 in Bathan, Bagchaur Municipality–9, Salyan District, and is a successful businessman, social worker, agricultural entrepreneur, and inspirational personality.',
  },
  bio: {
    opening: {
      ne: [
        'दिपक शर्मा वि.सं. २०३९ साल माघ ५ गते सल्यान जिल्लाको बागचौर नगरपालिका–९, बथानमा जन्मनुभएको एक सफल व्यवसायी, समाजसेवी, कृषि उद्यमी तथा प्रेरणादायी व्यक्तित्व हुनुहुन्छ। ग्रामीण परिवेशमा हुर्किनुभएका उहाँले बाल्यकालदेखि नै कृषि, पशुपालन र स्थानीय उत्पादनसँग प्रत्यक्ष सम्बन्ध राख्नुभएको थियो। सानैदेखि मेहनती, जिम्मेवार र दूरदर्शी स्वभावका उहाँले परिवार तथा समाजबाट प्राप्त अनुशासन, नैतिकता र इमान्दारितालाई आफ्नो जीवनको आधार बनाउँदै अघि बढ्नुभएको हो। आज उहाँ स्थानीय समुदायका लागि सफल उद्यमशीलता, सामाजिक उत्तरदायित्व र नेतृत्व क्षमताको उत्कृष्ट उदाहरणका रूपमा परिचित हुनुहुन्छ।',
      ],
      en: [
        'Dipak Sharma, born on January 19, 1983 in Bagchaur Municipality–9, Bathan, Salyan, is a successful businessman, social worker, agricultural entrepreneur, and an inspirational figure. Growing up in a rural setting, he was closely connected to agriculture, livestock, and local production from an early age. Known for his hardworking, responsible, and farsighted nature, he built his life on discipline, ethics, and honesty instilled by family and community. Today he is recognized as an exemplar of entrepreneurship, social responsibility, and leadership in the local community.',
      ],
    },
    biography: [
      {
        ne: 'ग्रामीण क्षेत्रमा किसानहरूले उत्पादन गरे भी उचित बजारको अभावमा आफ्नो उत्पादनको सही मूल्य प्राप्त गर्न नसकेको अवस्था देखेर उहाँले व्यापारमार्फत समाधान खोज्ने दृढ संकल्प गर्नुभयो।',
        en: 'Seeing that farmers in rural areas could not obtain fair prices for their produce due to lack of proper markets, he resolved to seek a solution through trade and commerce.',
      },
      {
        ne: 'यसै सोचका साथ उहाँले वि.सं. २०६२ सालमा ढकाल ट्रेडर्स एण्ड सप्लायर्स नामक सानो पसल स्थापना गर्नुभयो। सुरुवाती दिनमा सीमित पूँजी, सामान्य स्रोतसाधन र अनेक चुनौती भए पनि उहाँको अथक मेहनत, इमान्दारिता र दृढ इच्छाशक्तिले उक्त पसललाई आज सल्यान जिल्लाकै विश्वसनीय र प्रतिष्ठित व्यापारिक केन्द्रका रूपमा स्थापित गरेको छ। उहाँको विश्वास छ कि व्यवसायको दीर्घकालीन सफलता ग्राहकको विश्वास र सेवाको गुणस्तरमा निर्भर हुन्छ।',
        en: 'With this vision, he founded a small shop named Dhakal Traders & Suppliers in 2062 B.S. Despite limited capital, modest resources, and many early challenges, his tireless effort, honesty, and determination have established the shop as a trusted and respected business center in Salyan. He firmly believes that long-term business success depends on customer trust and the quality of service.',
      },
      {
        ne: 'ढकाल ट्रेडर्स एण्ड सप्लायर्समार्फत उहाँले दैनिक उपभोग्य सामग्री, कृषि सामग्री तथा बहुमूल्य जडीबुटीहरूको खरिद–बिक्री गर्दै स्थानीय किसानहरूलाई उचित मूल्य दिलाउन महत्त्वपूर्ण भूमिका निर्वाह गर्दै आउनुभएको छ। अदुवा, भाङ्गो, लसुन, बेसार, टिमुर लगायतका उत्पादन तथा जडीबुटीहरूलाई राष्ट्रिय तथा अन्तर्राष्ट्रिय बजारसम्म पुर्‍याउन उहाँ निरन्तर प्रयासरत हुनुहुन्छ। विगत दुई दशकमा उहाँले व्यवसायिक वित्त, आपूर्ति सञ्जाल, बजार विकास तथा ग्राहक सेवा व्यवस्थापनमा गहिरो अनुभव हासिल गर्नुभएको छ। यस प्रयासले गाउँ-गाउँका किसान तथा संकलकहरूको आयआर्जन वृद्धि गर्न र स्थानीय उत्पादनको मूल्य अभिवृद्धि गर्न उल्लेखनीय योगदान पुर्‍याएको छ।',
        en: 'Through Dhakal Traders & Suppliers he has played a key role in procuring and trading daily essentials, agricultural inputs, and valuable herbs, ensuring fair prices for local farmers. He has actively worked to bring products like ginger, hemp, garlic, turmeric, and timur to national and international markets. Over the past two decades he has gained deep experience in business finance, supply chains, market development, and customer service management. These efforts have significantly contributed to increasing incomes for farmers and collectors and adding value to local produce.',
      },
      {
        ne: 'गुणस्तर, पारदर्शिता, विश्वसनीयता र ग्राहक सन्तुष्टिलाई आफ्नो प्रमुख सिद्धान्त मान्दै उहाँले सल्यान र आसपासका जिल्लाका हजारौं किसान तथा उपभोक्ताहरूको विश्वास जित्न सफल हुनुभएको छ। कृषि आधुनिकीकरण, किसान सशक्तिकरण तथा युवा रोजगारी सिर्जना उहाँका प्रमुख लक्ष्यहरू हुन्। स्थानीय युवाहरूलाई उद्यमशीलतामा प्रेरित गर्दै सीप विकास, आत्मनिर्भरता र स्वदेशमै अवसर सिर्जना गर्न उहाँ निरन्तर सक्रिय रहनुभएको छ। व्यवसायसँगै समाजसेवामा पनि उत्तिकै समर्पित उहाँ शिक्षा, कृषि विकास, विपद् राहत तथा समुदाय उन्नयनका विविध कार्यहरूमा सक्रिय योगदान पुर्‍याउँदै आउनुभएको छ।',
        en: 'By prioritizing quality, transparency, reliability, and customer satisfaction, he has earned the trust of thousands of farmers and consumers across Salyan and nearby districts. His main goals include agricultural modernization, farmer empowerment, and creating employment for youth. He actively encourages local youth toward entrepreneurship, skill development, and self-reliance, creating opportunities within the country. Alongside business, he is equally dedicated to social service and contributes actively to education, agricultural development, disaster relief, and community upliftment.',
      },
    ],
    inspiration: {
      intro: {
        ne: [
          'दिपक शर्मा युवापुस्ताका लागि प्रेरणाका स्रोत हुनुहुन्छ। उहाँको जीवन यात्रा आफैंमा एउटा सशक्त सन्देश हो—सफलता ठूलो पूँजीबाट होइन, स्पष्ट सोच, अथक मेहनत र इमान्दारिताबाट प्राप्त हुन्छ। ग्रामीण परिवेशबाट सुरु गरिएको सानो पसललाई निरन्तर परिश्रम, दूरदृष्टि र दृढ आत्मविश्वासका माध्यमबाट सफल र विश्वसनीय व्यापारमा रूपान्तरण गर्दै उहाँले युवाहरूलाई स्वदेशमै अवसर सिर्जना गर्न सकिन्छ भन्ने उदाहरण प्रस्तुत गर्नुभएको छ।',
          'उहाँको विचारमा नेपालमा सम्भावनाको कमी छैन; आवश्यकता केवल सही सोच, साहस र निरन्तर प्रयासको हो। युवा शक्तिलाई उत्पादन, कृषि, व्यापार र सेवामूलक क्षेत्रमा सक्रिय बनाउँदै आत्मनिर्भर बन्न उहाँ निरन्तर प्रेरित गर्नुहुन्छ।',
        ],
        en: [
          'Dipak Sharma is a source of inspiration for the younger generation. His life journey itself is a powerful message—success comes not from large capital, but from clear thinking, relentless hard work, and honesty.',
          'In his view, Nepal lacks nothing in terms of possibility; what is needed is the right mindset, courage, and continuous effort. He consistently inspires young people to become self-reliant by engaging in production, agriculture, trade, and service-oriented sectors.',
        ],
      },
      quoteBullets: [
        { ne: 'सानो सुरुवातलाई कम नठान्नु।', en: 'Never underestimate a small beginning.' },
        { ne: 'इमान्दारिता नै सबैभन्दा ठूलो पूँजी हो।', en: 'Honesty is the greatest capital.' },
        { ne: 'निरन्तरता सफलता प्राप्त गर्ने मुख्य उपाय हो।', en: 'Consistency is the key to success.' },
        { ne: 'असफलता सिकाइको आधार हो।', en: 'Failure is the foundation of learning.' },
        { ne: 'स्वदेशमै अवसर खोज्ने सोच नै सफलताको पहिलो कदम हो।', en: 'Looking for opportunities at home is the first step to success.' },
        { ne: 'कडा परिश्रम र सकारात्मक सोचले असम्भवलाई सम्भव बनाउँछ।', en: 'Hard work and positive thinking can make the impossible possible.' },
      ],
    },
    service: {
      ne: 'दिपक शर्मा स्थानीय समुदायमा सक्रिय रहँदै विभिन्न सामाजिक, शैक्षिक तथा राहत कार्यक्रमहरूमा योगदान पुर्‍याउँदै आउनुभएको छ। उहाँले कृषि विकास, किसान सशक्तिकरण, शिक्षा सहयोग तथा विपद् राहतमा विशेष ध्यान दिनुभएको छ।',
      en: 'Dipak Sharma remains active in the local community and contributes to various social, educational, and relief programs. He pays special attention to agricultural development, farmer empowerment, educational support, and disaster relief.',
    },
    honors: [
      { ne: 'स्थानीय सामाजिक योगदान पुरस्कार', en: 'Local Social Contribution Award' },
      { ne: 'कृषि व्यापारमा उत्कृष्टता सम्मान', en: 'Excellence in Agricultural Trade' },
      { ne: 'समुदाय नेतृत्व सम्मान', en: 'Community Leadership Award' },
      { ne: 'ग्राहक विश्वास तथा सेवा सम्मान', en: 'Customer Trust and Service Award' },
    ],
    vision: {
      quoteNe: '“ढकाल ट्रेडर्स एण्ड सप्लायर्सलाई किसानमैत्री, गुणस्तरीय र विश्वसनीय व्यापारिक पहिचानका रूपमा राष्ट्रिय स्तरमा स्थापित गर्ने।”',
      quoteEn: '“To establish Dhakal Traders & Suppliers nationally as a farmer-friendly, high-quality, and trustworthy business identity.”',
      missionNe: 'उहाँको लक्ष्य स्थानीय उत्पादनलाई उचित बजार उपलब्ध गराउने, किसानलाई उचित मूल्य सुनिश्चित गर्ने, गुणस्तरीय दैनिक तथा कृषि सामग्री उपलब्ध गराउने, युवाहरूलाई उद्यमशीलतामा प्रेरित गर्ने, र व्यापारलाई आधुनिक, व्यवस्थित र दिगो बनाउने हो।',
      missionEn: 'His mission is to provide a proper market for local produce, ensure fair prices for farmers, supply quality daily and agricultural goods, inspire youth toward entrepreneurship, and make the business modern, organized, and sustainable.',
      missionPoints: [
        { ne: 'स्थानीय उत्पादनलाई उचित बजार उपलब्ध गराउने।', en: 'Provide a proper market for local production.' },
        { ne: 'किसानलाई उचित मूल्य सुनिश्चित गर्ने।', en: 'Ensure fair prices for farmers.' },
        { ne: 'गुणस्तरीय दैनिक तथा कृषि सामग्री उपलब्ध गराउने।', en: 'Provide quality daily and agricultural goods.' },
        { ne: 'युवाहरूलाई उद्यमशीलतामा प्रेरित गर्ने।', en: 'Inspire youth toward entrepreneurship.' },
        { ne: 'व्यापारलाई आधुनिक, व्यवस्थित र दिगो बनाउने।', en: 'Make the business modern, organized, and sustainable.' },
      ],
    },
    conclusion: {
      ne: 'दिपक शर्मा केवल सफल व्यवसायी मात्र नभई समाज परिवर्तनका संवाहक, किसानका भरोसायोग्य सहयात्री र युवापुस्ताका प्रेरणादायी मार्गदर्शक हुनुहुन्छ। उहाँको जीवनले स्पष्ट सन्देश दिन्छ—दृढ संकल्प, इमान्दारिता र निरन्तर मेहनतले साधारण सुरुवातलाई असाधारण सफलतामा रूपान्तरण गर्न सकिन्छ।',
      en: 'Dipak Sharma is not only a successful businessman but also a driver of social change, a trusted companion of farmers, and an inspiring guide for the younger generation. His life clearly shows that determination, honesty, and continuous hard work can transform a modest beginning into extraordinary success.',
    },
  },
  contact: {
    phone: '+977-9857823400',
    email: 'dipak.sharma@dhakaltradersandsuppliers.com.np',
    // profilePhoto can be a URL served from MinIO or another CDN. Update when owner image is uploaded.
    profilePhoto: 'http://127.0.0.1:9000/images/1779810387017-resized.jpg',
    website: 'https://dhakaltradersandsuppliers.com.np',
    details: getOwnerContactDetails(),
    currentLocation: {
      ne: 'बागचौर नगरपालिका–९, बथान, सल्यान, नेपाल',
      en: 'Bagchaur Municipality–9, Bathan, Salyan, Nepal',
    },
  },
  actions: [
    { className: 'owner-action owner-action--call', href: 'tel:+9779857823400', icon: '☎', labelNe: 'कल गर्नुहोस्: +977-9857823400', labelEn: 'Call: +977-9857823400' },
    { className: 'owner-action owner-action--mail', href: 'mailto:dipak.sharma@dhakaltradersandsuppliers.com.np', icon: '✉', labelNe: 'इमेल पठाउनुहोस्', labelEn: 'Email Me' },
    { className: 'owner-action owner-action--web', href: 'https://dhakaltradersandsuppliers.com.np', icon: '☷', labelNe: 'वेबसाइट हेर्नुहोस्', labelEn: 'Visit Website' },
  ],
};

export const leadershipItems = [
  {
    icon: '♔',
    ne_title: 'रणनीतिक नेतृत्व',
    en_title: 'Strategic Leadership',
    ne_desc: 'व्यापारको दीर्घकालीन योजना, दिशा र विकास रणनीति तय गर्नु।',
    en_desc: 'Setting the long-term plan, direction, and growth strategy for the business.',
  },
  {
    icon: '⚙',
    ne_title: 'सञ्चालन व्यवस्थापन',
    en_title: 'Operations Management',
    ne_desc: 'दैनिक कारोबार, आपूर्ति व्यवस्थापन र गुणस्तर नियन्त्रणलाई प्रभावकारी बनाउनु।',
    en_desc: 'Making daily operations, supply management, and quality control effective.',
  },
  {
    icon: '👥',
    ne_title: 'टिम विकास',
    en_title: 'Team Development',
    ne_desc: 'कर्मचारीहरूको सीप विकास, तालिम र जिम्मेवारी वितरणमा ध्यान दिनु।',
    en_desc: 'Focusing on staff skill development, training, and responsibility distribution.',
  },
  {
    icon: '🌍',
    ne_title: 'समुदाय र वृद्धि',
    en_title: 'Community Growth',
    ne_desc: 'स्थानीय बजार, किसान र समुदायसँगको सम्बन्ध सुदृढ गर्दै व्यापार विस्तार गर्नु।',
    en_desc: 'Expanding the business by strengthening ties with local markets, farmers, and the community.',
  },
];

export const exploreLinks = [
  { href: '#about', icon: '🏢', ne: 'हाम्रो बारेमा', en: 'About Us', noteNe: 'ढकाल ट्रेडर्सको परिचय', noteEn: 'Know the company story' },
  { href: '#services', icon: '💼', ne: 'सेवाहरू', en: 'Services', noteNe: 'हामी के-के गर्छौं', noteEn: 'See what we offer' },
  { href: '#products', icon: '🌾', ne: 'उत्पादन', en: 'Products', noteNe: 'मुख्य उत्पादनहरू', noteEn: 'Browse our products' },
];
