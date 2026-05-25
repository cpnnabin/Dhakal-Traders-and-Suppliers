export interface ProductGridItem {
  nameEn: string;
  nameNe: string;
  subEn: string;
  subNe: string;
  img: string;
  highlight?: boolean;
  href: string;
}

export const productsGrid: ProductGridItem[] = [
  {
    nameEn: 'Medicinal Herbs',
    nameNe: 'जडीबुटी',
    subEn: 'Herbs',
    subNe: 'जडीबुटी',
    img: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&q=80',
    highlight: true,
    href: '#herbs'
  },
  {
    nameEn: 'Timur',
    nameNe: 'टिमुर',
    subEn: 'Herb / Spice',
    subNe: 'जडीबुटी / मसला',
    img: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&q=80',
    href: '#timur'
  },
  {
    nameEn: 'Ginger',
    nameNe: 'अदुवा',
    subEn: 'Fresh Ginger',
    subNe: 'ताजा अदुवा',
    img: 'https://baahrakhari.com/uploads/posts/ginger-1696219134.jpg',
    href: '#ginger'
  },
  {
    nameEn: 'Hemp Seeds',
    nameNe: 'भाङ्गो',
    subEn: 'Traditional Seeds',
    subNe: 'परम्परागत बीउ',
    img: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=600&q=80',
    href: '#hemp-seeds'
  },
  {
    nameEn: 'Garlic',
    nameNe: 'लसुन',
    subEn: 'Fresh Garlic',
    subNe: 'ताजा लसुन',
    img: 'https://sewapoint.com/image-1667270211031-garlic.jpeg',
    href: '#garlic'
  },
  {
    nameEn: 'Beans',
    nameNe: 'सिमी',
    subEn: 'Beans',
    subNe: 'सिमी',
    img: 'https://himalayancrops.org/wp-content/uploads/2015/11/Laxmi-Lama-IMG_0586-1024x520.jpg',
    href: '#beans'
  },
  {
    nameEn: 'Food Grains',
    nameNe: 'खाद्यान्न',
    subEn: 'Grains',
    subNe: 'खाद्यान्न',
    img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80',
    href: '#grains'
  },
  {
    nameEn: 'Agricultural Supplies',
    nameNe: 'कृषि सामग्री',
    subEn: 'Agri Materials',
    subNe: 'कृषि सामग्री',
    img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    href: '#agri-materials'
  },
  {
    nameEn: 'Daily Consumables',
    nameNe: 'दैनिक उपभोग्य वस्तुहरू',
    subEn: 'Daily Goods',
    subNe: 'दैनिक वस्तुहरू',
    img: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80',
    href: '#daily-items'
  }
];
