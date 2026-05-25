export interface GalleryItem {
  id: string;
  type: 'photo' | 'video';
  src: string;
  altNe: string;
  altEn: string;
}

export const galleryData: GalleryItem[] = [
  {
    id: 'g1',
    type: 'photo',
    src: 'https://images.unsplash.com/photo-1611735341450-74d61e660ad2?w=800&q=80',
    altNe: 'सल्यान जिल्लाका रमणीय पहाडी परिदृश्यहरू',
    altEn: 'Beautiful hilly landscapes of Salyan District'
  },
  {
    id: 'g2',
    type: 'photo',
    src: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80',
    altNe: 'परम्परागत रूपमा सुकाइएका शुद्ध सल्यानी टिमुर',
    altEn: 'Traditionally dried pure Salyani Timur (Sichuan Pepper)'
  },
  {
    id: 'g3',
    type: 'photo',
    src: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',
    altNe: 'ताजा र अर्गानिक अदुवा संकलन र प्रशोधन',
    altEn: 'Fresh and organic ginger harvesting and sorting'
  },
  {
    id: 'g4',
    type: 'photo',
    src: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&q=80',
    altNe: 'सल्यानका पहाडी भेगबाट संकलित शुद्ध जडीबुटीहरू',
    altEn: 'Pure medicinal herbs collected from Salyan hilly regions'
  },
  {
    id: 'g5',
    type: 'photo',
    src: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=800&q=80',
    altNe: 'परम्परागत सल्यानी भाङ्गो (भाङका दानाहरू)',
    altEn: 'Traditional Salyani Hemp Seeds (Bhango)'
  },
  {
    id: 'g6',
    type: 'photo',
    src: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    altNe: 'किसानहरूका लागि आवश्यक उन्नत कृषि सामग्रीहरू',
    altEn: 'Advanced organic agricultural farming supplies for farmers'
  },
  {
    id: 'v1',
    type: 'video',
    src: 'https://www.youtube.com/embed/P72ZlW99h-U',
    altNe: 'नेपालमा अर्गानिक कृषि प्रणाली र जडीबुटी खेती वृत्तचित्र',
    altEn: 'Organic Agriculture and Herb Farming in Nepal Documentary'
  },
  {
    id: 'v2',
    type: 'video',
    src: 'https://www.youtube.com/embed/rPqA1tNfK3A',
    altNe: 'सल्यानी टिमुर संकलन तथा वैज्ञानिक प्रशोधन विधि',
    altEn: 'Harvesting and Scientific Processing of Salyani Timur'
  },
  {
    id: 'v3',
    type: 'video',
    src: 'https://www.youtube.com/embed/G6gEipQ-w90',
    altNe: 'नेपालका बहुमूल्य जडीबुटीहरू र तिनको व्यावसायिक महत्त्व',
    altEn: 'Valuable Medicinal Herbs of Nepal and Commercial Importance'
  }
];
