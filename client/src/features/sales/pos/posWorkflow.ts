export type POSTab = 'dashboard' | 'billing' | 'entry' | 'purchase' | 'stock' | 'reports' | 'ledger' | 'users' | 'customers' | 'orders' | 'chats';

export type POSRole = 'owner' | 'admin' | 'cashier' | 'supplier' | 'customer' | string;

export type POSTabItem = {
  id: POSTab;
  icon: string;
  label: [string, string];
};

export const POS_NAV_ITEMS: POSTabItem[] = [
  { id: 'dashboard', icon: 'ri-dashboard-line',         label: ['ड्यासबोर्ड',       'Dashboard'] },
  { id: 'billing',   icon: 'ri-coins-line',             label: ['बिलिङ (POS)',      'Billing (POS)'] },
  { id: 'orders',    icon: 'ri-file-list-3-line',       label: ['अर्डर इतिहास',      'Order History'] },
  { id: 'customers', icon: 'ri-user-heart-line',        label: ['पार्टीहरू',        'Parties'] },
  { id: 'entry',     icon: 'ri-box-3-line',             label: ['उत्पादन व्यवस्थापन', 'Product Management'] },
  { id: 'purchase',  icon: 'ri-shopping-basket-2-line', label: ['खरिद',             'Purchase'] },
  { id: 'reports',   icon: 'ri-line-chart-line',        label: ['बिक्री',           'Sales'] },
  { id: 'ledger',    icon: 'ri-book-open-line',         label: ['लेजर / जर्नल',     'Ledger'] },
  { id: 'chats',     icon: 'ri-chat-3-line',            label: ['च्याट सपोर्ट',     'Chat Support'] },
  { id: 'users',     icon: 'ri-group-line',             label: ['कर्मचारी',         'Users'] },
];

export const POS_TAB_TITLES: Record<POSTab, [string, string]> = {
  dashboard: ['ड्यासबोर्ड — अवलोकन', 'Dashboard — Overview'],
  billing:   ['बिलिङ टर्मिनल (POS)', 'Billing Terminal (POS)'],
  orders:    ['अर्डर इतिहास विवरण',   'Order History'],
  customers: ['पार्टी स्टेटमेन्ट',     'Party Statement'],
  entry:     ['उत्पादन व्यवस्थापन',    'Product Management'],
  purchase:  ['कृषक थोक खरिद',         'Farmer Purchase'],
  stock:     ['स्टक / म्याद विवरण',    'Stock & Expiry'],
  reports:   ['बिक्री रिपोर्ट',        'Sales'],
  ledger:    ['लेजर तथा जर्नल खाता',   'Ledger & Journal'],
  chats:     ['ग्राहक च्याट',          'Customer Chats'],
  users:     ['कर्मचारी सेटिङ',        'Staff Accounts'],
};

export const POS_TAB_TITLES_SHORT: Record<POSTab, [string, string]> = {
  dashboard: ['ड्यासबोर्ड', 'Dashboard'],
  billing:   ['बिलिङ',      'Billing'],
  orders:    ['अर्डर',      'Orders'],
  customers: ['पार्टी',      'Parties'],
  entry:     ['उत्पादन',    'Products'],
  purchase:  ['खरिद',       'Purchase'],
  stock:     ['स्टक',       'Stock'],
  reports:   ['रिपोर्ट',     'Reports'],
  ledger:    ['लेजर',       'Ledger'],
  chats:     ['च्याट',       'Chats'],
  users:     ['कर्मचारी',   'Staff'],
};

export function getVisiblePosTabs(role: POSRole): POSTab[] {
  if (role === 'owner') return POS_NAV_ITEMS.map(item => item.id);
  if (role === 'admin') return ['dashboard', 'billing', 'entry', 'purchase', 'reports', 'ledger', 'users', 'customers', 'orders', 'chats'];
  if (role === 'cashier') return ['dashboard', 'billing', 'purchase', 'reports', 'ledger', 'customers', 'orders', 'chats'];
  if (role === 'supplier') return ['dashboard', 'orders', 'chats'];
  if (role === 'customer') return ['dashboard', 'billing', 'orders', 'chats', 'customers'];
  return [];
}

/** First screen after login — always Dashboard when the role can access it. */
export function getDefaultPosTab(role: POSRole): POSTab {
  const visible = getVisiblePosTabs(role);
  if (visible.includes('dashboard')) return 'dashboard';
  return visible[0] || 'dashboard';
}

export function isStaffRole(role: POSRole): boolean {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'owner' || normalized === 'cashier';
}
