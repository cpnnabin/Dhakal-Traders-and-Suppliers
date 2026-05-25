// ─── POS Page: Unified User Management — All Roles in One Panel ───────────────
import React from 'react';
import { usePOS } from './POSContext';

const ROLES = [
  { value: 'owner',    label: 'Owner',    icon: '👑', color: 'purple', desc: 'Full system access' },
  { value: 'admin',    label: 'Admin',    icon: '🛡️', color: 'blue',   desc: 'Manage reports, users & chats' },
  { value: 'cashier',  label: 'Cashier',  icon: '💰', color: 'green',  desc: 'POS billing & sales' },
  { value: 'supplier', label: 'Supplier', icon: '🚛', color: 'yellow', desc: 'View purchase orders' },
  { value: 'customer', label: 'Customer', icon: '🛍️', color: 'orange', desc: 'Order history & chat' },
];

export default function UsersPage() {
  const { users, setUsers, apiCall, t } = usePOS();
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [activeRole, setActiveRole] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '', username: '', email: '', phone: '', role: 'cashier', status: 'active', password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiCall('/users', 'POST', { ...formData, _id: editingUser?._id });
    if (res.success) {
      const uRes = await apiCall('/users');
      if (uRes.success) setUsers(uRes.users);
      alert(t('प्रयोगकर्ता सुरक्षित गरियो!', 'User saved!'));
      resetForm();
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setShowForm(false);
    setFormData({ name: '', username: '', email: '', phone: '', role: 'cashier', status: 'active', password: '' });
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setFormData({ name: u.name || '', username: u.username || '', email: u.email || '', phone: u.phone || '', role: u.role || 'cashier', status: u.status || 'active', password: '' });
    setShowForm(true);
  };

  const filteredUsers = (users || []).filter((u: any) => {
    const q = search.toLowerCase();
    const matchRole = activeRole === 'all' || u.role === activeRole;
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || { icon: '👤', color: 'blue', label: role, desc: '' };

  return (
    <div className="users-wrap">
      {/* Role filter tabs */}
      <div className="users-toolbar">
        <div className="role-tabs">
          <button className={`role-tab ${activeRole === 'all' ? 'active' : ''}`} onClick={() => setActiveRole('all')}>
            {t('सबै', 'All')} <span className="tab-count">{(users || []).length}</span>
          </button>
          {ROLES.map(r => (
            <button key={r.value} className={`role-tab role-tab--${r.color} ${activeRole === r.value ? 'active' : ''}`} onClick={() => setActiveRole(r.value)}>
              {r.icon} {r.label} <span className="tab-count">{(users || []).filter((u: any) => u.role === r.value).length}</span>
            </button>
          ))}
        </div>
        <div className="users-search-wrap">
          <i className="ri-search-line" />
          <input type="text" placeholder={t('नाम वा प्रयोगकर्ता नाम खोज्नुहोस्...', 'Search by name or username...')} value={search} onChange={e => setSearch(e.target.value)} className="users-search" />
        </div>
        <button className="pos-primary-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          <i className="ri-user-add-line" /> {t('नयाँ प्रयोगकर्ता', 'Add User')}
        </button>
      </div>

      {/* Role Permission Cards */}
      <div className="role-permission-cards">
        {ROLES.map(r => (
          <div key={r.value} className={`rpc rpc--${r.color}`}>
            <span className="rpc-icon">{r.icon}</span>
            <div>
              <strong>{r.label}</strong>
              <p>{r.desc}</p>
            </div>
            <span className="rpc-count">{(users || []).filter((u: any) => u.role === r.value).length}</span>
          </div>
        ))}
      </div>

      {/* User List */}
      <div className="pos-panel">
        <div className="pos-panel-header">
          <h3><i className="ri-group-line" /> {t('प्रयोगकर्ता सूची', 'User List')}</h3>
          <span className="pos-badge blue">{filteredUsers.length} {t('प्रयोगकर्ताहरू', 'users')}</span>
        </div>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--pos-text-muted)' }}>
            <i className="ri-user-line" style={{ fontSize: 32 }} /><br />{t('कुनै प्रयोगकर्ता भेटिएन', 'No users found')}
          </div>
        ) : (
          <div className="users-grid">
            {filteredUsers.map((u: any) => {
              const role = getRoleInfo(u.role);
              return (
                <div key={u._id} className={`user-card user-card--${role.color}`}>
                  <div className="uc-avatar">{u.avatar || role.icon}</div>
                  <div className="uc-info">
                    <strong className="uc-name">{u.name}</strong>
                    <span className="uc-username">@{u.username}</span>
                    {u.email && <span className="uc-email"><i className="ri-mail-line" /> {u.email}</span>}
                    {u.phone && <span className="uc-phone"><i className="ri-phone-line" /> {u.phone}</span>}
                  </div>
                  <div className="uc-meta">
                    <span className={`pos-badge ${role.color}`}>{role.icon} {u.role}</span>
                    <span className={`pos-badge ${u.status === 'active' ? 'green' : 'red'}`}>{u.status || 'active'}</span>
                  </div>
                  <button className="pos-sec-btn small" onClick={() => handleEdit(u)}><i className="ri-edit-line" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="party-modal-overlay" onClick={resetForm}>
          <div className="party-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="ri-user-add-line" /> {editingUser ? t('प्रयोगकर्ता सम्पादन', 'Edit User') : t('नयाँ प्रयोगकर्ता थप्नुहोस्', 'Add New User')}</h3>
              <button onClick={resetForm} className="modal-close"><i className="ri-close-line" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="pos-input-group">
                  <label>{t('पुरा नाम', 'Full Name')} *</label>
                  <input type="text" className="pos-form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="pos-input-group">
                  <label>{t('प्रयोगकर्ता नाम', 'Username')} *</label>
                  <input type="text" className="pos-form-input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                </div>
                <div className="pos-input-group">
                  <label>{t('इमेल', 'Email')}</label>
                  <input type="email" className="pos-form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="pos-input-group">
                  <label>{t('फोन', 'Phone')}</label>
                  <input type="text" className="pos-form-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="pos-input-group">
                  <label>{t('भूमिका', 'Role')}</label>
                  <div className="role-select-grid">
                    {ROLES.map(r => (
                      <button type="button" key={r.value} className={`role-select-btn role-select-btn--${r.color} ${formData.role === r.value ? 'active' : ''}`} onClick={() => setFormData({ ...formData, role: r.value })}>
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pos-input-group">
                  <label>{t('अवस्था', 'Status')}</label>
                  <select className="pos-form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">{t('सक्रिय', 'Active')}</option>
                    <option value="inactive">{t('निष्क्रिय', 'Inactive')}</option>
                  </select>
                </div>
                <div className="pos-input-group" style={{ gridColumn: '1/-1' }}>
                  <label>{editingUser ? t('नयाँ पासवर्ड (खाली छाड्नुस् परिवर्तन नगर्न)', 'New Password (leave blank to keep)') : t('पासवर्ड *', 'Password *')}</label>
                  <input type="password" className="pos-form-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="pos-sec-btn" onClick={resetForm}>{t('रद्द', 'Cancel')}</button>
                <button type="submit" className="pos-form-submit"><i className="ri-save-line" /> {t('सुरक्षित गर्नुहोस्', 'Save User')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
