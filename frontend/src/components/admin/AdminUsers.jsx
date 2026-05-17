import React, { useState, useEffect } from 'react';
import { Users, Plus, X, User, Shield, GraduationCap, Search } from 'lucide-react';
import api from '../../api.js';

const roleIcons = { 
  student: GraduationCap, 
  tutor: User, 
  admin: Shield 
};

const roleColors = {
  student: 'bg-fern/10 text-fern border-fern/20',
  tutor: 'bg-hunter/10 text-hunter border-hunter/20',
  admin: 'bg-amber-100 text-amber-700 border-amber-200'
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ 
    email: '', password: '', full_name: '', role: 'student', roll_number: '', phone: '' 
  });
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = () => {
    setLoading(true);
    const params = roleFilter !== 'all' ? { role: roleFilter } : {};
    api.get('/admin/users', { params })
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const filtered = users.filter(u =>
    !search || 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/admin/users', form);
      showToast('✅ User created successfully!');
      setShowAdd(false);
      setForm({ email: '', password: '', full_name: '', role: 'student', roll_number: '', phone: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create user.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto page-enter">
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-forest">Manage Users</h1>
          <p className="text-sage/70">{filtered.length} users</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3 p-4 items-center">
        <div className="flex gap-2 flex-wrap">
          {['all', 'student', 'tutor', 'admin'].map(r => (
            <button 
              key={r} 
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${roleFilter === r 
                  ? 'bg-fern text-white border-fern' 
                  : 'border-sage/30 hover:border-fern bg-white'}`}
            >
              {r === 'all' ? 'All Users' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/60" />
          <input 
            className="form-input pl-9" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by name, email or roll number..." 
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-forest/5 border-b border-sage/20">
                  {['Name', 'Email', 'Role', 'Roll No', 'Programme', 'Joined', 'Last Login'].map(h => (
                    <th key={h} className="text-left px-4 py-4 text-xs font-semibold text-hunter/60 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {filtered.map((u, i) => {
                  const RoleIcon = roleIcons[u.role] || User;
                  return (
                    <tr key={u.user_id} className="hover:bg-fern/5 transition-colors">
                      <td className="px-4 py-4 font-semibold text-forest">{u.full_name}</td>
                      <td className="px-4 py-4 text-xs text-hunter/70 font-mono">{u.email}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 badge border text-xs ${roleColors[u.role]}`}>
                          <RoleIcon className="w-3.5 h-3.5" /> {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-sage/70">{u.roll_number || '—'}</td>
                      <td className="px-4 py-4 text-xs text-hunter/60 max-w-40 truncate">{u.programme || '—'}</td>
                      <td className="px-4 py-4 text-xs text-sage/60">
                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-xs text-sage/60">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-IN') : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="font-bold text-xl text-forest">Create New User</h3>
              <button onClick={() => setShowAdd(false)} className="text-sage hover:text-forest">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-5">
              {/* Form fields - same as before but cleaner */}
              {[
                { label: 'Full Name *', key: 'full_name', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Password *', key: 'password', type: 'password' },
                { label: 'Roll Number', key: 'roll_number', type: 'text' },
                { label: 'Phone', key: 'phone', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input 
                    type={f.type} 
                    className="form-input" 
                    value={form[f.key]} 
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.key === 'email' ? 'student@psgtech.ac.in' : ''}
                    required={f.label.includes('*')} 
                  />
                </div>
              ))}

              <div>
                <label className="form-label">Role *</label>
                <select 
                  className="form-input" 
                  value={form.role} 
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading} className="btn-primary flex-1">
                  {addLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;