import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Search, Globe, MapPin } from 'lucide-react';
import api from '../../api.js';

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', country: 'India', website: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const load = () => {
    setLoading(true);
    api.get('/admin/companies').then(({ data }) => setCompanies(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = companies.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.state?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/admin/companies', form);
      showToast('Company added successfully!');
      setShowAdd(false);
      setForm({ name: '', address: '', city: '', state: '', country: 'India', website: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add company.', 'error');
    } finally { setAddLoading(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto page-enter">
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-forest">Companies</h1>
          <p className="text-sage/80 text-sm mt-0.5">{filtered.length} companies in database</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      <div className="card mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/60" />
          <input className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search company name, city, state..." />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <div key={c.company_id} className="card-hover animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-fern/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-fern" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-forest text-sm truncate">{c.name}</h3>
                  {(c.city || c.state) && (
                    <p className="text-xs text-sage/70 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {[c.city, c.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-fern hover:text-hunter flex items-center gap-1 mt-1 truncate transition-colors">
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{c.website.replace('https://', '').replace('http://', '')}</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-sage/10 flex items-center justify-between text-xs text-sage/50">
                <span>ID #{c.company_id}</span>
                <span className={`px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-sage/20">
              <h3 className="font-bold text-forest text-lg">Add Company</h3>
              <button onClick={() => setShowAdd(false)} className="text-sage hover:text-forest transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {[
                { label: 'Company Name *', key: 'name', placeholder: 'Full company name' },
                { label: 'City', key: 'city', placeholder: 'e.g. Chennai' },
                { label: 'State', key: 'state', placeholder: 'e.g. Tamil Nadu' },
                { label: 'Country', key: 'country', placeholder: 'India' },
                { label: 'Website', key: 'website', placeholder: 'https://company.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} required={f.label.includes('*')} />
                </div>
              ))}
              <div>
                <label className="form-label">Address</label>
                <textarea className="form-input resize-none" rows={2} value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={addLoading} className="btn-primary flex-1 justify-center">
                  {addLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;
