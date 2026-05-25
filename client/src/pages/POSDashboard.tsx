// ─── POS Layout Shell ─────────────────────────────────────────────────────────
// Sidebar + header wrapper. Each sidebar item renders its own dedicated page.

import React, { useEffect, useState, useRef } from 'react';
import { POSProvider, usePOS } from './pos/POSContext';
import { getPOSSession } from './POSLogin';
import POSDashboardPage from './pos/Dashboard';
import BillingPage      from './pos/Billing';
import ProductEntryPage from './pos/ProductEntry';
import PurchasePage     from './pos/Purchase';
import StockPage        from './pos/Stock';
import ReportsPage      from './pos/Reports';
import LedgerPage       from './pos/Ledger';
import UsersPage        from './pos/Users';
import PartiesPage      from './pos/Parties';
import OrdersPage       from './pos/Orders';
import AdminChatsPage   from './pos/AdminChats';
import CustomerChatsPage from './pos/CustomerChats';
import ReceiptModal     from './pos/ReceiptModal';
import logoImg          from '../image/Dhakal Traders Logo .png';
import { connectWithToken, joinRoom } from '../sockets/socket';
import NotificationsCenter from '../components/NotificationsCenter';
import { useLanguage }  from '../LanguageContext';

type Tab = 'dashboard' | 'billing' | 'entry' | 'purchase' | 'stock' | 'reports' | 'ledger' | 'users' | 'customers' | 'orders' | 'chats';

interface Props { onLogout: () => void; }

function POSShell({ onLogout }: Props) {
  const { lang, setLang } = useLanguage();
  const { t, cashier, users, apiCall, setCashier, setUsers, setSales, setReceiptData } = usePOS();
  const [tab,       setTab]       = useState<Tab>(() => {
    const role = getPOSSession().role;
    if (role === 'admin') return 'reports';
    if (role === 'customer') return 'orders';
    return 'billing';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [time,      setTime]      = useState(new Date().toLocaleTimeString());

  // Edit profile states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAlternativePhone, setEditAlternativePhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('👤');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'profile' | 'password'>('profile');
  const [editPanNo, setEditPanNo] = useState('');
  const [editProfilePhoto, setEditProfilePhoto] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Resolved active user — hoisted so both header badge and profile modal can use it
  const activeUser = React.useMemo(() => {
    if (!Array.isArray(users) || users.length === 0) return null;

    const session = getPOSSession();
    const normalizedCashierId = cashier?.id ? String(cashier.id) : '';
    const normalizedCashierUsername = String(cashier?.username || session.username || '').toLowerCase().trim();
    const normalizedCashierName = String(cashier?.name || '').toLowerCase().trim();

    const byId = normalizedCashierId
      ? users.find((u: any) => String(u?._id || '') === normalizedCashierId)
      : null;
    if (byId) return byId;

    const byUsername = normalizedCashierUsername
      ? users.find((u: any) => String(u?.username || '').toLowerCase().trim() === normalizedCashierUsername)
      : null;
    if (byUsername) return byUsername;

    if (normalizedCashierName) {
      const matchesByName = users.filter(
        (u: any) => String(u?.name || '').toLowerCase().trim() === normalizedCashierName
      );
      if (matchesByName.length === 1) return matchesByName[0];
    }

    return null;
  }, [users, cashier?.id, cashier?.username, cashier?.name]);

  const openProfileEditor = (tabToOpen: 'profile' | 'password') => {
    const profileUser = activeUser;

    setEditName(profileUser?.name || cashier?.name || '');
    setEditPhone(profileUser?.phone || '');
    setEditAddress(profileUser?.address || '');
    setEditAlternativePhone(profileUser?.alternativePhone || '');
    setEditBio(profileUser?.bio || '');
    setEditAvatar(profileUser?.avatar || '👤');
    setEditPanNo(profileUser?.panNo || '');
    setEditProfilePhoto(profileUser?.profilePhoto || '');
    setEditPassword('');
    setEditConfirmPassword('');
    setEditError('');
    setEditSuccess('');
    setActiveModalTab(tabToOpen);
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModalTab === 'profile') {
      if (!editName.trim()) {
        setEditError(t('कृपया पुरा नाम भर्नुहोस्!', 'Full name is required.'));
        return;
      }
    } else if (activeModalTab === 'password') {
      if (!editPassword.trim()) {
        setEditError(t('कृपया नयाँ पासवर्ड भर्नुहोस्!', 'New password is required.'));
        return;
      }
      if (editPassword !== editConfirmPassword) {
        setEditError(t('पासवर्ड र पुष्टि पासवर्ड मिलेन!', 'Passwords do not match.'));
        return;
      }
    }

    setUpdatingProfile(true);
    setEditError('');
    setEditSuccess('');

    try {
      const targetUser = activeUser;

      const payload: any = {
        _id: targetUser?._id || cashier?.id,
        name: activeModalTab === 'profile' ? editName.trim() : (targetUser?.name || cashier?.name || ''),
        username: targetUser?.username || cashier?.username || getPOSSession().username,
        role: targetUser?.role || cashier?.role,
        phone: activeModalTab === 'profile' ? editPhone.trim() : (targetUser?.phone || ''),
        address: activeModalTab === 'profile' ? editAddress.trim() : (targetUser?.address || ''),
        alternativePhone: activeModalTab === 'profile' ? editAlternativePhone.trim() : (targetUser?.alternativePhone || ''),
        bio: activeModalTab === 'profile' ? editBio.trim() : (targetUser?.bio || ''),
        avatar: activeModalTab === 'profile' ? editAvatar : (targetUser?.avatar || '👤'),
        panNo: activeModalTab === 'profile' ? editPanNo.trim() : (targetUser?.panNo || ''),
        profilePhoto: activeModalTab === 'profile' ? editProfilePhoto : (targetUser?.profilePhoto || ''),
      };

      if (activeModalTab === 'password') {
        payload.password = editPassword.trim();
      }

      const res = await apiCall('/users', 'POST', payload);

      if (res.success) {
        setEditSuccess(activeModalTab === 'password' 
          ? t('पासवर्ड सफलतापूर्वक परिवर्तन भयो!', 'Password updated successfully!')
          : t('विवरण सफलतापूर्वक परिवर्तन भयो!', 'Profile details updated successfully!')
        );
        
        if (activeModalTab === 'profile') {
          // Update cashier context
          setCashier((prev: any) => prev ? { ...prev, name: editName.trim() } : null);
          // Update sessionStorage
          sessionStorage.setItem('dt_pos_cashier', editName.trim());
        } else {
          setEditPassword('');
          setEditConfirmPassword('');
        }
        
        // Reload all users list in the context so the table displays correct values
        const uRes = await apiCall('/users');
        if (uRes.success) setUsers(uRes.users);

        // Keep the success message visible a bit longer so the owner/operator can read it.
        // Previously this closed the modal too quickly (1.5s) and cleared messages which
        // caused users (notably owners) to miss the confirmation. Increase to 4s and
        // only close the modal — message state will be reset when the modal is opened again.
        setTimeout(() => {
          setEditProfileOpen(false);
        }, 4000);
      } else {
        setEditError(res.error || t('त्रुटि देखा पर्यो।', 'An error occurred.'));
      }
    } catch (err: any) {
      setEditError(err.message || t('जडान विफल भयो।', 'Connection failed.'));
    } finally {
      setUpdatingProfile(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // connect socket automatically when POS shell is mounted
  useEffect(() => {
    try {
      const token = getPOSSession().token;
      connectWithToken(token);
      const role = (cashier && cashier.role) || getPOSSession().role || 'cashier';
      joinRoom(role);
    } catch (e) {}
  }, [cashier?.role]);

  useEffect(() => {
    document.body.classList.toggle('pos-nav-open', mobileNavOpen);
    return () => document.body.classList.remove('pos-nav-open');
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!profileDropdownOpen) return;
    const closeProfile = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeProfile);
    return () => document.removeEventListener('mousedown', closeProfile);
  }, [profileDropdownOpen]);

  const selectTab = (id: Tab) => {
    setTab(id);
    setMobileNavOpen(false);
  };

  // URL query helpers let us deep-link into a useful POS tab.
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const customerId = url.searchParams.get('customerId');
      const tabParam = url.searchParams.get('tab');

      if (tabParam && ['dashboard', 'billing', 'entry', 'purchase', 'stock', 'reports', 'ledger', 'users', 'customers', 'orders', 'chats'].includes(tabParam)) {
        setTab(tabParam as Tab);
      }

      if (customerId) setTab('billing');
    } catch {}
  }, []);

  const navItems: { id: Tab; icon: string; label: [string, string] }[] = [
    { id: 'dashboard', icon: 'ri-dashboard-line',         label: ['ड्यासबोर्ड',       'Dashboard']      },
    { id: 'billing',   icon: 'ri-coins-line',             label: ['बिलिङ (POS)',        'Billing (POS)']  },
    { id: 'orders',    icon: 'ri-file-list-3-line',       label: ['अर्डर इतिहास',        'Order History']  },
    { id: 'customers', icon: 'ri-user-heart-line',        label: ['पार्टीहरू',          'Parties']      },
    { id: 'entry',     icon: 'ri-box-3-line',             label: ['उत्पादन / स्टक', 'Products / Stock']  },
    { id: 'purchase',  icon: 'ri-shopping-basket-2-line', label: ['खरिद',               'Purchase']       },
    { id: 'stock',     icon: 'ri-database-2-line',        label: ['स्टक', 'Stock'] },
    { id: 'reports',   icon: 'ri-line-chart-line',        label: ['बिक्री',             'Sales']          },
    { id: 'ledger',    icon: 'ri-book-open-line',         label: ['लेजर / जर्नल',       'Ledger']         },
    { id: 'chats',     icon: 'ri-chat-3-line',            label: ['च्याट सपोर्ट',       'Chat Support']   },
    { id: 'users',     icon: 'ri-group-line',             label: ['कर्मचारी',           'Users']          },
  ];

  const tabTitles: Record<Tab, [string, string]> = {
    dashboard: ['ड्यासबोर्ड — अवलोकन',              'Dashboard — Overview'],
    billing:   ['बिलिङ टर्मिनल (POS)',               'Billing Terminal (POS)'],
    orders:    ['अर्डर इतिहास विवरण',                 'Order History'],
    customers: ['पार्टी स्टेटमेन्ट',                   'Party Statement'],
    entry:     ['उत्पादन प्रविष्टि',                 'Product Entry'],
    purchase:  ['कृषक थोक खरिद',                     'Farmer Purchase'],
    stock:     ['स्टक / म्याद विवरण',                'Stock & Expiry'],
    reports:   ['बिक्री रिपोर्ट',                    'Sales'],
    ledger:    ['लेजर तथा जर्नल खाता',               'Ledger & Journal'],
    chats:     ['ग्राहक च्याट',                      'Customer Chats'],
    users:     ['कर्मचारी सेटिङ',                    'Staff Accounts'],
  };

  const tabTitlesShort: Record<Tab, [string, string]> = {
    dashboard: ['ड्यासबोर्ड', 'Dashboard'],
    billing:   ['बिलिङ', 'Billing'],
    orders:    ['अर्डर', 'Orders'],
    customers: ['पार्टी', 'Parties'],
    entry:     ['उत्पादन', 'Products'],
    purchase:  ['खरिद', 'Purchase'],
    stock:     ['स्टक', 'Stock'],
    reports:   ['रिपोर्ट', 'Reports'],
    ledger:    ['लेजर', 'Ledger'],
    chats:     ['च्याट', 'Chats'],
    users:     ['कर्मचारी', 'Staff'],
  };

  return (
    <div className="pos-container">
      <div className="pos-glow-accent" />
      <div className="pos-glow-accent-2" />

      {mobileNavOpen && (
        <button
          type="button"
          className="pos-sidebar-backdrop"
          aria-label={t('मेनु बन्द गर्नुहोस्', 'Close menu')}
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`pos-sidebar${collapsed ? ' collapsed' : ''}${mobileNavOpen ? ' mobile-open' : ''}`}>
        <div className="pos-sidebar-header">
          <div className="pos-sidebar-logo" style={{ width: 44, height: 44, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#fff' }}>
            <img src={logoImg} alt="Dhakal Traders Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="pos-sidebar-title">
            <span className="pos-sidebar-brand" style={{ color: '#FBBF24' }}>{t('ढकाल ट्रेडर्स', 'Dhakal Traders')}</span>
            <span className="pos-sidebar-sub" style={{ color: '#FCD34D' }}>{t('POS प्रणाली', 'POS System')}</span>
          </div>
        </div>

        <ul className="pos-sidebar-menu">
          {navItems.filter(item => {
            const role = (cashier && cashier.role) || getPOSSession().role || 'owner';
            if (role === 'owner') return true;
            if (role === 'admin') {
              return ['dashboard', 'billing', 'entry', 'purchase', 'reports', 'ledger', 'stock', 'users', 'customers', 'orders', 'chats'].includes(item.id);
            }
            if (role === 'cashier') {
              return ['billing', 'purchase', 'reports', 'ledger', 'customers', 'stock', 'orders', 'chats'].includes(item.id);
            }
            if (role === 'supplier') {
              return ['orders', 'chats'];
            }
            if (role === 'customer') {
              // Allow customers to access Billing (POS) as well
              return ['billing', 'orders', 'chats', 'customers'].includes(item.id);
            }
            return false;
          }).map(item => (
            <li
              key={item.id}
              className={`pos-menu-item${tab === item.id ? ' active' : ''}`}
              onClick={() => selectTab(item.id)}
            >
              <i className={item.icon} />
              <span className="pos-menu-text">{t(item.label[0], item.label[1])}</span>
            </li>
          ))}

          {/* Logout */}
          <li className="pos-menu-item pos-menu-item--logout" onClick={onLogout}>
            <i className="ri-logout-box-r-line" />
            <span className="pos-menu-text">{t('लगआउट', 'Logout')}</span>
          </li>
        </ul>

        {/* Weather + clock */}
        <div className="pos-sidebar-footer">
          <div className="pos-weather-card">
            <i className="ri-sun-fill" />
            <div className="pos-weather-info">
              <span className="pos-weather-temp">18°C Sunny</span>
              <span className="pos-weather-desc">Bagchaur, Salyan</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', fontFamily: 'monospace', marginTop: 6 }}>
            {time}
          </div>
        </div>
      </aside>

      {/* ══════════ MAIN WORKSPACE ══════════ */}
      <main className={`pos-workspace${tab === 'billing' ? ' pos-workspace--billing' : ''}`}>
        {/* Header */}
        <header className="pos-workspace-header">
          <div className="pos-header-left">
            <button
              type="button"
              className="pos-mobile-menu-btn"
              aria-label={t('मेनु खोल्नुहोस्', 'Open menu')}
              onClick={() => setMobileNavOpen(true)}
            >
              <i className="ri-menu-line" />
            </button>
            <button type="button" className="pos-collapse-btn pos-desktop-only" onClick={() => setCollapsed(c => !c)}>
              <i className={collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'} />
            </button>
            <div className="pos-header-titles">
              <h1 className="pos-workspace-title">
                <span className="pos-title-full">{t(tabTitles[tab][0], tabTitles[tab][1])}</span>
                <span className="pos-title-short">{t(tabTitlesShort[tab][0], tabTitlesShort[tab][1])}</span>
              </h1>
              <span className="pos-header-subtitle" aria-hidden="true">{time}</span>
            </div>
          </div>

          <div className="pos-header-search pos-desktop-only">
            <i className="ri-search-line" />
            <input type="search" placeholder={t('खोज्नुहोस्...', 'Search...')} aria-label={t('खोज', 'Search')} />
          </div>

          <div className="pos-header-right">
            <button
              type="button"
              className="pos-lang-btn"
              onClick={() => setLang(lang === 'ne' ? 'en' : 'ne')}
            >
              <i className="ri-translate-2" />
              <span className="pos-lang-label">{lang === 'ne' ? 'ने' : 'EN'}</span>
            </button>

            <NotificationsCenter />

            {(() => {
              return (
                <div
                  ref={profileRef}
                  className="pos-cashier-badge"
                  onClick={(e) => { e.stopPropagation(); setProfileDropdownOpen(o => !o); }}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div className="pos-cashier-avatar" style={{ fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: 28, height: 28, borderRadius: '50%' }}>
                    {activeUser?.profilePhoto ? (
                      <img src={activeUser.profilePhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      activeUser?.avatar || '👤'
                    )}
                  </div>
                  <span className="pos-cashier-name">{activeUser?.name || cashier?.name || 'Cashier'}</span>
                  <i className="ri-arrow-down-s-line pos-cashier-caret" />
                  
                  {profileDropdownOpen && (
                    <div className="pos-profile-dropdown" style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 8,
                      width: 250,
                      background: 'rgba(30, 41, 59, 0.98)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12,
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(10px)',
                      zIndex: 100,
                      padding: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
                        <div style={{ fontSize: 28, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '50%', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {activeUser?.profilePhoto ? (
                            <img src={activeUser.profilePhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            activeUser?.avatar || '👤'
                          )}
                        </div>
                        <div>
                          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 13 }}>{activeUser?.name || cashier?.name}</div>
                          <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'capitalize', marginTop: 2 }}>{activeUser?.role || cashier?.role || 'Operator'}</div>
                          <div style={{ color: '#64748B', fontSize: 11, marginTop: 2, fontFamily: 'monospace' }}>{activeUser?.username || cashier?.username}</div>
                        </div>
                      </div>

                      {/* Extra Profile Details */}
                      <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, padding: '6px 8px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: 8 }}>
                        {activeUser?.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="ri-phone-line" style={{ color: 'var(--pos-primary)' }} />
                            <span>{activeUser.phone}</span>
                          </div>
                        )}
                        {activeUser?.alternativePhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="ri-phone-fill" style={{ color: 'var(--pos-success)' }} />
                            <span>{activeUser.alternativePhone} ({t('वैकल्पिक', 'Alt')})</span>
                          </div>
                        )}
                        {activeUser?.address && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="ri-map-pin-line" style={{ color: 'var(--pos-warning)' }} />
                            <span>{activeUser.address}</span>
                          </div>
                        )}
                        {activeUser?.panNo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="ri-government-line" style={{ color: '#A78BFA' }} />
                            <span>PAN: {activeUser.panNo}</span>
                          </div>
                        )}
                        {activeUser?.bio && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: 4 }}>
                            <span style={{ color: '#64748B', fontSize: 9 }}>{t('बायो / विवरण', 'Bio')}</span>
                            <span style={{ fontStyle: 'italic', color: '#CBD5E1' }}>"{activeUser.bio}"</span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileDropdownOpen(false);
                          openProfileEditor('profile');
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderRadius: 8,
                          color: '#E2E8F0',
                          textAlign: 'left',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <i className="ri-user-settings-line" /> {t('विवरण परिवर्तन', 'Edit Profile')}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileDropdownOpen(false);
                          openProfileEditor('password');
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderRadius: 8,
                          color: '#E2E8F0',
                          textAlign: 'left',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 4
                        }}
                      >
                        <i className="ri-lock-password-line" style={{ color: 'var(--pos-primary, #3B82F6)' }} /> {t('पासवर्ड परिवर्तन', 'Change Password')}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileDropdownOpen(false);
                          onLogout();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderRadius: 8,
                          color: '#EF4444',
                          textAlign: 'left',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 4
                        }}
                      >
                        <i className="ri-logout-box-r-line" /> {t('लगआउट', 'Logout')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="pos-page-content">
          {tab === 'dashboard' && <POSDashboardPage />}
          {tab === 'billing'   && <BillingPage />}
          {tab === 'orders'    && <OrdersPage />}
          {tab === 'customers' && <PartiesPage />}
          {tab === 'entry'     && <ProductEntryPage />}
          {tab === 'purchase'  && <PurchasePage />}
          {tab === 'stock'     && <StockPage />}
          {tab === 'reports'   && <ReportsPage />}
          {tab === 'ledger'    && <LedgerPage />}
          {tab === 'chats'     && (
            (() => {
              const r = (cashier && cashier.role) || getPOSSession().role || 'owner';
              return (r === 'customer') ? <CustomerChatsPage /> : <AdminChatsPage />;
            })()
          )}
          {tab === 'users'     && <UsersPage />}
        </div>
      </main>

      {/* Global receipt modal (shown from Billing checkout) */}
      <ReceiptModal />

      {/* ══════════ EDIT PROFILE MODAL ══════════ */}
      {editProfileOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--pos-bg-card, #1E293B)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            width: '100%',
            maxWidth: activeModalTab === 'profile' ? 580 : 460,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            color: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pos-text)' }}>
                {activeModalTab === 'profile' 
                  ? t('प्रोफाइल विवरण', 'Profile Details')
                  : t('पासवर्ड परिवर्तन गर्नुहोस्', 'Change Password')}
              </h2>
              <button 
                onClick={() => setEditProfileOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 20, cursor: 'pointer' }}
              >
                <i className="ri-close-line" />
              </button>
            </div>

            {editError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                {editError}
              </div>
            )}
            {editSuccess && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#86EFAC', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                {editSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {activeModalTab === 'profile' ? (
                <>
                  {/* Photo & Avatar Section */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div 
                      onClick={() => document.getElementById('pos-profile-photo-input')?.click()}
                      style={{ 
                        position: 'relative', 
                        width: 90, 
                        height: 90, 
                        borderRadius: '50%', 
                        background: 'rgba(15, 23, 42, 0.4)', 
                        border: '2px dashed rgba(255, 255, 255, 0.15)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        overflow: 'hidden', 
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pos-primary, #3B82F6)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                    >
                      {editProfilePhoto ? (
                        <img src={editProfilePhoto} alt="Upload Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 36 }}>{editAvatar}</span>
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.75)',
                        padding: '2px 0',
                        fontSize: 10,
                        color: '#94A3B8',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2
                      }}>
                        <i className="ri-camera-line" /> {t('अपलोड', 'Upload')}
                      </div>
                    </div>
                    <input 
                      type="file" 
                      id="pos-profile-photo-input" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditProfilePhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, color: 'var(--pos-text-muted)', fontWeight: 600 }}>
                          {t('अवतार वा फोटो छनौट गर्नुहोस्', 'Choose Avatar or Upload Photo')}
                        </label>
                        {editProfilePhoto && (
                          <button 
                            type="button" 
                            onClick={() => setEditProfilePhoto('')} 
                            style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <i className="ri-delete-bin-line" /> {t('फोटो हटाउनुहोस्', 'Remove Photo')}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['👤', '🧑‍🌾', '👨‍💻', '👩‍💼', '🧔', '🦊', '🦁', '🍀', '💼'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setEditAvatar(emoji);
                              setEditProfilePhoto('');
                            }}
                            style={{
                              fontSize: 18,
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              border: (!editProfilePhoto && editAvatar === emoji) ? '2px solid var(--pos-primary, #3B82F6)' : '1px solid rgba(255, 255, 255, 0.08)',
                              background: (!editProfilePhoto && editAvatar === emoji) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.4)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', margin: '14px 0' }} />

                  {/* Grid Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        {t('पुरा नाम', 'Full Name')} <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      {activeUser?.name && (<span style={{ color: '#94A3B8', fontSize: 10, marginBottom: 4, display: 'block' }}>Current: {activeUser.name}</span>)}
                      <input 
                        type="text" 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        {t('फोन नम्बर', 'Phone Number')}
                      </label>
                      {activeUser?.phone && (<span style={{ color: '#94A3B8', fontSize: 10, marginBottom: 4, display: 'block' }}>Current: {activeUser.phone}</span>)}
                      <input 
                        type="text" 
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        {t('वैकल्पिक फोन नम्बर', 'Alternative Phone Number')}
                      </label>
                      {activeUser?.alternativePhone && (<span style={{ color: '#94A3B8', fontSize: 10, marginBottom: 4, display: 'block' }}>Current: {activeUser.alternativePhone}</span>)}
                      <input 
                        type="text" 
                        value={editAlternativePhone}
                        onChange={e => setEditAlternativePhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        {t('ठेगाना', 'Address')}
                      </label>
                      {activeUser?.address && (<span style={{ color: '#94A3B8', fontSize: 10, marginBottom: 4, display: 'block' }}>Current: {activeUser.address}</span>)}
                      <input 
                        type="text" 
                        value={editAddress}
                        onChange={e => setEditAddress(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        {t('प्यान नम्बर', 'PAN Number')}
                      </label>
                      {activeUser?.panNo && (<span style={{ color: '#94A3B8', fontSize: 10, marginBottom: 4, display: 'block' }}>Current: {activeUser.panNo}</span>)}
                      <input 
                        type="text" 
                        value={editPanNo}
                        onChange={e => setEditPanNo(e.target.value)}
                        placeholder="e.g. 123456789"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                        {t('बायो / संक्षिप्त विवरण', 'Short Bio / Notes')}
                      </label>
                      {activeUser?.bio && (<span style={{ color: '#94A3B8', fontSize: 10, marginBottom: 4, display: 'block' }}>Current: {activeUser.bio}</span>)}
                      <textarea 
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    color: '#FCD34D',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 11,
                    marginBottom: 16,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start'
                  }}>
                    <i className="ri-information-line" style={{ fontSize: 14, marginTop: 1 }} />
                    <div>
                      {t(
                        'सुरक्षाका लागि, नयाँ पासवर्ड बलियो र सजिलै अनुमान गर्न नसकिने राख्नुहोला।',
                        'For security, choose a strong password that is difficult for others to guess.'
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6 }}>
                      {t('नयाँ पासवर्ड', 'New Password')} <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(s => !s)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <i className={showPassword ? "ri-eye-line" : "ri-eye-off-line"} style={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--pos-text-muted)', marginBottom: 6 }}>
                      {t('पासवर्ड पुष्टि गर्नुहोस्', 'Confirm Password')} <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        value={editConfirmPassword}
                        onChange={e => setEditConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 12px',
                          background: 'rgba(15, 23, 42, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 13
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(s => !s)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <i className={showConfirmPassword ? "ri-eye-line" : "ri-eye-off-line"} style={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button 
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    color: '#E2E8F0',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('रद्द गर्नुहोस्', 'Cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={updatingProfile}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--pos-accent, #3B82F6)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: updatingProfile ? 0.7 : 1
                  }}
                >
                  {updatingProfile ? t('अपडेट हुँदै...', 'Saving...') : t('बचत गर्नुहोस्', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap shell in the shared state provider
export default function POSDashboard({ onLogout }: Props) {
  return (
    <POSProvider>
      <POSShell onLogout={onLogout} />
    </POSProvider>
  );
}
