import React, { useState, useEffect } from 'react';
import { Search, Download, Unlock, Trash2, FileDown } from 'lucide-react';
import api from '../../api.js';

const AdminApplications = () => {
  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfLoading, setPdfLoading]       = useState(null);
  const [toast, setToast]                 = useState(null);

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch applications ────────────────────────────────────────────
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/applications', { params });
      setApplications(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [statusFilter]);

  // ── Client-side filter (search box matches name, company, roll number) ──
  const filtered = applications.filter((app) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      app.student_name?.toLowerCase().includes(q)        ||
      app.company_name?.toLowerCase().includes(q)        ||
      app.company_name_manual?.toLowerCase().includes(q) ||
      app.roll_number?.toLowerCase().includes(q)         ||
      app.ref_number?.toLowerCase().includes(q)
    );
  });

  // ── Actions ───────────────────────────────────────────────────────
  const handleUnlock = async (id) => {
    if (!confirm('Unlock this application for student editing?')) return;
    setActionLoading(id);
    try {
      await api.post('/admin/unlock', { application_id: id });
      showToast('Application unlocked successfully');
      fetchApplications();
    } catch {
      showToast('Failed to unlock', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this application?')) return;
    setActionLoading(id);
    try {
      await api.delete(`/admin/applications/${id}`);
      showToast('Application deleted');
      fetchApplications();
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── PDF Download ──────────────────────────────────────────────────
  const handlePDF = async (application_id) => {
    if (!application_id) return showToast('Application ID not found!', 'error');
    setPdfLoading(application_id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ application_id }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Received empty PDF from server.');

      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `Internship_${String(application_id).replace(/\//g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('PDF Downloaded Successfully!');
    } catch (err) {
      console.error('PDF Error:', err);
      showToast(err.message || 'Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(null);
    }
  };

  // ── Status badge helper ───────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      approved:      'badge-approved',
      rejected:      'badge-rejected',
      pending_tutor: 'badge-pending',
      draft:         'badge-pending',
    };
    return map[status] || 'badge-pending';
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Toast */}
      {toast && (
        <div
          className={`toast fixed top-5 right-5 z-[9999] ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-fern'
          } text-white`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-forest">All Applications</h1>
          <p className="text-sage/70">Manage &amp; monitor student internship applications</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Single search — matches name, company, roll number, ref number */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-sage" />
            <input
              type="text"
              placeholder="Search name, company or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full sm:w-48"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_tutor">Pending Tutor</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card border border-sage/20 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sage/70">No applications found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">

                {/* ── Head ── */}
                <thead>
                  <tr className="bg-bone border-b border-sage/20 text-xs text-sage/100 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Ref No.</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Company</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Offer Letter</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Parent Form</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">PDF</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                {/* ── Body ── */}
                <tbody>
                  {filtered.map((app) => (
                    <tr
                      key={app.application_id}
                      className="border-b border-sage/10 last:border-0 hover:bg-bone/40 transition-colors"
                    >
                      {/* Ref Number */}
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {app.ref_number || app.application_id || '—'}
                      </td>

                      {/* Roll Number */}
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {app.roll_number || '—'}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-forest whitespace-nowrap">
                        {app.student_name || '—'}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                          {app.duration_type === 'summer' ? 'Summer' : '6-Month'}
                        </span>
                      </td>

                      {/* Company */}
                      <td
                        className="px-4 py-3 max-w-[140px] truncate"
                        title={app.company_name || app.company_name_manual}
                      >
                        {app.company_name || app.company_name_manual || '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`badge ${statusBadge(app.status)}`}>
                          {app.status?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Offer Letter */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(app.offer_letter_full_url || app.offer_letter_url) ? (
                          <a
                            href={app.offer_letter_full_url || `http://localhost:5001${app.offer_letter_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-fern hover:underline font-medium"
                          >
                            <FileDown className="w-3.5 h-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-sage/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Parent Form */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {app.parent_permission_url ? (
                          <a
                            href={`http://localhost:5001${app.parent_permission_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-fern hover:underline font-medium"
                          >
                            <FileDown className="w-3.5 h-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-sage/40 text-xs">—</span>
                        )}
                      </td>

                      {/* PDF Download */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handlePDF(app.application_id)}
                          disabled={pdfLoading === app.application_id}
                          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
                          title="Download PDF"
                        >
                          {pdfLoading === app.application_id ? (
                            <span className="w-3.5 h-3.5 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          PDF
                        </button>
                      </td>

                      {/* Actions: Unlock + Delete */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {app.status !== 'approved' && (
                            <button
                              onClick={() => handleUnlock(app.application_id)}
                              disabled={actionLoading === app.application_id}
                              className="btn-secondary text-xs px-3 py-1.5 text-amber-600 hover:text-amber-700 disabled:opacity-50"
                              title="Unlock for editing"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(app.application_id)}
                            disabled={actionLoading === app.application_id}
                            className="btn-secondary text-xs px-3 py-1.5 text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="Delete Application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminApplications;