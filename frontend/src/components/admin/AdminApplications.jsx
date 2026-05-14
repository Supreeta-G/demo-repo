import React, { useState, useEffect } from 'react';
import { Search, Filter, FileDown, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import api from '../../api.js';
import { generateInternshipPDF } from '../student/pdfGenerator.js';

const STATUSES = ['all', 'draft', 'pending_tutor', 'approved', 'rejected'];

const AdminApplications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pdfLoading, setPdfLoading] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;
    api.get('/admin/applications', { params })
      .then(({ data }) => setApps(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);
  const handleSearch = (e) => { e.preventDefault(); load(); };

  const handlePDF = async (appId) => {
    setPdfLoading(appId);
    try {
      const { data } = await api.get(`/applications/${appId}`);
      await generateInternshipPDF(data, true);
    } catch (e) { console.error(e); }
    finally { setPdfLoading(null); }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-forest">All Applications</h1>
        <p className="text-sage/80 text-sm mt-1">{apps.length} applications{statusFilter !== 'all' ? ` · ${statusFilter}` : ''}</p>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/60" />
              <input className="form-input pl-9" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Student name, roll no, company..." />
            </div>
          </div>
          <div className="min-w-40">
            <label className="form-label">Status</label>
            <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All' : s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary py-2.5">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-14 h-14 text-sage/30 mb-4" />
          <p className="text-forest font-bold">No applications found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-forest/5 border-b border-sage/20">
                  {['#', 'Student', 'Company', 'Programme', 'Type', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-hunter/60 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {apps.map((app, i) => (
                  <tr key={app.application_id} className="hover:bg-fern/5 transition-colors animate-slide-in"
                    style={{ animationDelay: `${i * 0.03}s` }}>
                    <td className="px-4 py-3 text-sage/60 font-mono text-xs">#{app.application_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-forest">{app.student_name}</p>
                      <p className="text-xs text-sage/60">{app.roll_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-hunter">{app.company_name}</p>
                      {app.tutor_name && <p className="text-xs text-sage/60">Tutor: {app.tutor_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-hunter/70">{app.programme}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-fern/10 text-fern rounded-full">
                        {app.duration_type === 'summer' ? '☀️' : '🎓'} {app.duration_type === 'summer' ? 'Summer' : '6-Month'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${
                        app.status === 'approved' ? 'badge-approved' :
                        app.status === 'rejected' ? 'badge-rejected' :
                        app.status === 'pending_tutor' ? 'badge-pending' : 'badge-draft'
                      }`}>
                        {app.status === 'approved' ? '✅' : app.status === 'rejected' ? '❌' : app.status === 'pending_tutor' ? '⏳' : '📝'}
                        &nbsp;{app.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-sage/60">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handlePDF(app.application_id)}
                        disabled={pdfLoading === app.application_id}
                        className="btn-ghost py-1.5 px-2.5 text-xs">
                        {pdfLoading === app.application_id
                          ? <span className="w-3.5 h-3.5 border-2 border-fern/30 border-t-fern rounded-full animate-spin" />
                          : <FileDown className="w-3.5 h-3.5" />}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
