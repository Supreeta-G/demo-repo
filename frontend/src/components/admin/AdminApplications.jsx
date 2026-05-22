import React, { useState, useEffect } from 'react';
import {
  Search, Download, Unlock, Trash2,
  ChevronDown, ChevronUp, Building2,
  FileDown, GraduationCap, Calendar,
  MapPin, Phone, Mail, BadgeCheck,
  Clock, XCircle, CheckCircle
} from 'lucide-react';
import api from '../../api.js';

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [expanded, setExpanded]         = useState(null);
  const [pdfLoading, setPdfLoading]     = useState(null);
  const [toast, setToast]               = useState(null);

  // ── Toast helper ────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch applications ───────────────────────────────────────────
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
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

  useEffect(() => { fetchApplications(); }, [search, statusFilter]);

  // ── Actions ──────────────────────────────────────────────────────
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
      if (expanded === id) setExpanded(null);
      fetchApplications();
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── PDF Download (same logic as TutorQueue) ──────────────────────
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

  // ── Status badge helper ──────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      approved:      'badge-approved',
      rejected:      'badge-rejected',
      pending_tutor: 'badge-pending',
      draft:         'badge-pending',
    };
    return map[status] || 'badge-pending';
  };

  const statusIcon = (status) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-sage" />
            <input
              type="text"
              placeholder="Search student or company..."
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

      {/* Table / Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {applications.length === 0 && (
            <div className="card text-center py-16 text-sage/70">No applications found</div>
          )}

          {applications.map((app, i) => {
            const isExpanded = expanded === app.application_id;

            return (
              <div
                key={app.application_id}
                className="card border border-sage/20 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* ── Row summary ── */}
                <div className="flex items-start gap-4 p-4">

                  {/* Status stripe */}
                  <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${
                    app.status === 'approved' ? 'bg-emerald-400' :
                    app.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />

                  {/* Student + company info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-forest text-base">{app.student_name}</span>
                      <span className="text-sage/60 text-sm">· {app.roll_number}</span>
                      <span className={`badge ${statusBadge(app.status)}`}>
                        {app.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs mt-1">
                      <span className="flex items-center gap-1 bg-fern/10 text-fern px-2.5 py-1 rounded-full">
                        <Building2 className="w-3 h-3" />
                        {app.company_name || app.company_name_manual}
                      </span>
                      <span className="bg-sage/20 text-forest px-2.5 py-1 rounded-full">
                        {app.duration_type === 'summer' ? '☀️ Summer' : '🎓 6-Month'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* View Details toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : app.application_id)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                      title="View Details"
                    >
                      {isExpanded
                        ? <><ChevronUp className="w-4 h-4" /> Hide</>
                        : <><ChevronDown className="w-4 h-4" /> Details</>
                      }
                    </button>

                    {/* Download PDF */}
                    <button
                      onClick={() => handlePDF(app.application_id)}
                      disabled={pdfLoading === app.application_id}
                      className="btn-secondary text-xs px-3 py-1.5"
                      title="Download PDF"
                    >
                      {pdfLoading === app.application_id
                        ? <span className="w-4 h-4 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
                        : <Download className="w-4 h-4" />
                      }
                    </button>

                    {/* Unlock */}
                    {app.status !== 'approved' && (
                      <button
                        onClick={() => handleUnlock(app.application_id)}
                        disabled={actionLoading === app.application_id}
                        className="btn-secondary text-xs px-3 py-1.5 text-amber-600 hover:text-amber-700"
                        title="Unlock for editing"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(app.application_id)}
                      disabled={actionLoading === app.application_id}
                      className="btn-secondary text-xs px-3 py-1.5 text-red-600 hover:text-red-700"
                      title="Delete Application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Expanded detail panel (same as TutorQueue) ── */}
                {isExpanded && (
                  <div className="px-6 pb-8 pt-4 border-t border-sage/20 bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Student Information */}
                      <div className="bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-forest">
                          👤 Student Information
                        </h4>
                        <div className="space-y-3 text-sm">
                          <p><strong>Name:</strong> {app.student_name || '—'}</p>
                          <p><strong>Roll No:</strong> {app.roll_number || '—'}</p>
                          <p><strong>Email:</strong> {app.student_email || '—'}</p>
                          <p><strong>CGPA:</strong> {app.cgpa || app.student_cgpa || '—'}</p>
                          <p><strong>Semesters Completed:</strong> {app.semester_completed || '—'}</p>
                          <p><strong>Programme:</strong> {app.programme || '—'}</p>
                          <p><strong>Department:</strong> {app.department || '—'}</p>
                        </div>
                      </div>

                      {/* Internship Details */}
                      <div className="bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-forest">
                          <Building2 className="w-5 h-5" /> Internship Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <p><strong>Company:</strong> {app.company_name || app.company_name_manual || '—'}</p>
                          <p><strong>Role / Position:</strong> {app.role_title || '—'}</p>
                          <p><strong>Type:</strong> {app.duration_type === 'summer' ? 'Summer Internship' : '6-Month Internship'}</p>
                          <p><strong>Period:</strong> {app.start_date?.split('T')[0]} — {app.end_date?.split('T')[0]}</p>
                          <p><strong>Work Mode:</strong> {app.work_mode || '—'}</p>
                          <p><strong>Stipend:</strong> {app.stipend_amount ? `₹${app.stipend_amount} / month` : 'Not Mentioned'}</p>
                          <p><strong>Industry Guide:</strong> {app.guide_name_industry || '—'}</p>
                          <p><strong>Guide Contact:</strong> {app.guide_contact || '—'}</p>
                        </div>
                      </div>

                      {/* Company Address */}
                      <div className="bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-forest">
                          <MapPin className="w-4 h-4" /> Company Address
                        </h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {app.company_address || app.co_address || 'No address provided'}
                        </p>
                        <p className="mt-2 text-sm text-hunter/70">
                          {[app.company_city || app.co_city, app.company_state || app.co_state, app.company_country || app.co_country]
                            .filter(Boolean).join(', ')}
                        </p>
                      </div>

                      {/* Academic Status – 6-month only */}
                      {app.duration_type !== 'summer' && (
                        <div className="bg-bone p-6 rounded-3xl">
                          <h4 className="font-semibold mb-4 flex items-center gap-2 text-forest">
                            <GraduationCap className="w-5 h-5" /> Academic Status
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <p className="text-xs font-medium text-hunter/60 mb-1">RA / Arrear Courses</p>
                              <p>{app.ra_courses || 'None'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-hunter/60 mb-1">Redo Courses</p>
                              <p>{app.redo_courses || 'None'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-hunter/60 mb-1">Pending Courses</p>
                              <p>{app.pending_courses || 'None'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Offer Letter */}
                      {(app.offer_letter_url || app.offer_letter_full_url) && (
                        <div className="bg-green-50 border border-green-200 p-6 rounded-3xl">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
                            📄 Offer Letter
                          </h4>
                          <a
                            href={app.offer_letter_full_url || `http://localhost:5001${app.offer_letter_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline font-medium text-sm"
                          >
                            View Offer Letter <FileDown className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {/* Parent Permission Letter */}
                      {app.parent_permission_url && (
                        <div className="bg-green-50 border border-green-200 p-6 rounded-3xl">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
                            📄 Parent Permission Letter
                          </h4>
                          <a
                            href={`http://localhost:5001${app.parent_permission_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline font-medium text-sm"
                          >
                            View Parent Permission Letter <FileDown className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {/* Tutor Remarks */}
                      {app.tutor_remarks && (
                        <div className="lg:col-span-2 bg-amber-50 border border-amber-200 p-6 rounded-3xl">
                          <h4 className="font-semibold mb-2 text-amber-800">💬 Tutor Remarks</h4>
                          <p className="text-sm text-amber-900">{app.tutor_remarks}</p>
                        </div>
                      )}

                      {/* Status + Tutor info */}
                      <div className="lg:col-span-2 bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-4 text-forest">📋 Application Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-medium text-hunter/60 mb-1">Current Status</p>
                            <span className={`badge ${statusBadge(app.status)}`}>
                              {app.status?.replace('_', ' ')}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-hunter/60 mb-1">Tutor</p>
                            <p>{app.tutor_name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-hunter/60 mb-1">Submitted</p>
                            <p>{app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-hunter/60 mb-1">Last Updated</p>
                            <p>{app.updated_at ? new Date(app.updated_at).toLocaleDateString('en-IN') : '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      <div className="lg:col-span-2 flex flex-wrap gap-4 pt-2">
                        {/* Download PDF */}
                        <button
                          onClick={() => handlePDF(app.application_id)}
                          disabled={pdfLoading === app.application_id}
                          className="flex-1 min-w-[160px] py-4 border border-gray-400 hover:bg-gray-100 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                          {pdfLoading === app.application_id ? (
                            <>
                              <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileDown className="w-5 h-5" />
                              Download PDF
                            </>
                          )}
                        </button>

                        {/* Unlock */}
                        {app.status !== 'approved' && (
                          <button
                            onClick={() => handleUnlock(app.application_id)}
                            disabled={actionLoading === app.application_id}
                            className="flex-1 min-w-[160px] py-4 border border-amber-400 text-amber-600 hover:bg-amber-50 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                          >
                            <Unlock className="w-5 h-5" />
                            Unlock Form
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(app.application_id)}
                          disabled={actionLoading === app.application_id}
                          className="flex-1 min-w-[160px] py-4 border border-red-400 text-red-600 hover:bg-red-50 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete Permanently
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminApplications;