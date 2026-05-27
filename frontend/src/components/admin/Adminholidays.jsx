import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarX, AlertCircle } from 'lucide-react';
import api from '../../api.js';

const AdminHolidays = () => {
  const [holidays, setHolidays]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState({ date: '', description: '' });
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/holidays');
      setHolidays(data);
    } catch {
      showToast('Failed to load holidays', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const handleAdd = async () => {
    if (!form.date)        return showToast('Please select a date', 'error');
    if (!form.description.trim()) return showToast('Please enter a description', 'error');

    setSaving(true);
    try {
      await api.post('/admin/holidays', form);
      showToast('Holiday added successfully');
      setForm({ date: '', description: '' });
      fetchHolidays();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add holiday', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this holiday?')) return;
    try {
      await api.delete(`/admin/holidays/${id}`);
      showToast('Holiday removed');
      fetchHolidays();
    } catch {
      showToast('Failed to remove holiday', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest flex items-center gap-2">
          <CalendarX className="w-6 h-6 text-fern" /> Emergency / College Holidays
        </h1>
        <p className="text-sage/70 text-sm mt-1">
          Dates added here will be excluded from student attendance calculations automatically.
          Public holidays (Republic Day, Pongal, etc.) are already excluded via the government API.
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl mb-6 text-sm text-blue-800">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong>How it works:</strong> When a student fills the internship form, the system fetches India's public holidays automatically from the government API. Any dates you add here (emergency closures, college events) are also excluded on top of that.
        </div>
      </div>

      {/* Add Holiday Form */}
      <div className="card border border-sage/20 p-6 mb-6">
        <h2 className="font-semibold text-forest mb-4">Add Emergency Holiday</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-sage mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="form-input w-full"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs font-medium text-sage mb-1">Description / Reason</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. College Annual Day, Bandh, Emergency Closure"
              className="form-input w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="btn-primary px-5 py-2.5 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adding...' : 'Add Holiday'}
            </button>
          </div>
        </div>
      </div>

      {/* Holiday List */}
      <div className="card border border-sage/20 overflow-hidden">
        <div className="px-5 py-3 bg-bone border-b border-sage/20">
          <span className="text-xs font-medium uppercase tracking-wide text-sage">
            {holidays.length} Emergency Holiday{holidays.length !== 1 ? 's' : ''} Configured
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-8 h-8 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-12 text-sage/50 text-sm">
            No emergency holidays added yet.
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-sage/80 bg-bone border-b border-sage/20">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Day</th>
                <th className="px-5 py-3 text-left font-medium">Description</th>
                <th className="px-5 py-3 text-left font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map(h => {
                const d = new Date(h.date);
                const isPast = d < new Date();
                return (
                  <tr key={h.id} className={`border-b border-sage/10 last:border-0 hover:bg-bone/40 transition-colors ${isPast ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">
                      {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {isPast && <span className="ml-2 text-sage/50">(past)</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-sage whitespace-nowrap">
                      {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                    </td>
                    <td className="px-5 py-3 text-forest">
                      {h.description}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="btn-secondary text-xs px-3 py-1.5 text-red-600 hover:text-red-700"
                        title="Remove holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminHolidays;