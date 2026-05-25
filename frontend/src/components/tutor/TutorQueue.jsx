import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, FileDown, ChevronDown, ChevronUp, Building2, Download } from 'lucide-react';
import api from '../../api.js';

const TutorQueue = ({ filter }) => {
  const [apps, setApps]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(null);
  const [remarks, setRemarks]         = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfLoading, setPdfLoading]   = useState(null);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending_tutor' ? '/tutor/queue' : '/tutor/reviewed';
      const { data } = await api.get(endpoint);
      setApps(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (appId, decision) => {
    if (!appId) return showToast('Application ID not found!', 'error');
    const key = appId + decision;
    setActionLoading(key);
    try {
      await api.post('/tutor/decision', {
        application_id: appId,
        decision,
        remarks: remarks[appId] || '',
      });
      showToast(
        `Application ${decision === 'approve' ? '✅ Approved' : '❌ Rejected'}`,
        decision === 'approve' ? 'success' : 'error'
      );
      load();
      setExpanded(null);
      setRemarks(r => ({ ...r, [appId]: '' }));
    } catch (err) {
      console.error('Tutor Decision Error:', err);
      showToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

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
      showToast('PDF Downloaded Successfully!', 'success');
    } catch (err) {
      console.error('PDF Error:', err);
      showToast(err.message || 'Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(null);
    }
  };

  const statusBadge = (status) => {
    const map = {
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      returned: 'badge-rejected',
      pending_tutor: 'badge-pending',
      draft: 'badge-pending',
    };
    return map[status] || 'badge-pending';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
    </div>
  );

  // ── REVIEWED — tabular layout ─────────────────────────────────────
  if (filter !== 'pending_tutor') {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">

        {toast && (
          <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
            {toast.msg}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-forest">Reviewed Applications</h1>
          <p className="text-sage/70">
            {apps.length} application{apps.length !== 1 ? 's' : ''} reviewed by you
          </p>
        </div>

        {apps.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Clock className="w-14 h-14 text-sage/30 mb-4" />
            <p className="text-forest font-bold text-lg">No reviewed applications yet.</p>
          </div>
        ) : (
          <div className="card border border-sage/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">

                {/* Head */}
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
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Remarks</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">PDF</th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {apps.map((app) => (
                    <tr
                      key={app.application_id}
                      className="border-b border-sage/10 last:border-0 hover:bg-bone/40 transition-colors"
                    >
                      {/* Ref No */}
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {app.ref_number || app.application_id || '—'}
                      </td>

                      {/* Roll No */}
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

                      {/* Tutor Remarks */}
                      <td className="px-4 py-3 max-w-[180px]">
                        {app.tutor_remarks ? (
                          <span className="text-xs text-hunter/70 line-clamp-2" title={app.tutor_remarks}>
                            {app.tutor_remarks}
                          </span>
                        ) : (
                          <span className="text-sage/40 text-xs">—</span>
                        )}
                      </td>

                      {/* PDF */}
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

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PENDING — existing card layout ────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto page-enter">

      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-forest">Pending Approvals</h1>
        <p className="text-sage/80 text-sm mt-1">
          {apps.length} application{apps.length !== 1 ? 's' : ''}
          {apps.length > 0 && ' awaiting your review'}
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-14 h-14 text-sage/30 mb-4" />
          <p className="text-forest font-bold text-lg">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app, i) => {
            const isExpanded = expanded === app.application_id;
            const isPending  = app.status === 'pending_tutor';

            return (
              <div
                key={app.application_id}
                className="card border border-sage/20 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Card Header */}
                <div className="flex items-start gap-4 p-4">
                  <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${
                    app.status === 'approved' ? 'bg-emerald-400' :
                    app.status === 'returned'  ? 'bg-red-400'     : 'bg-amber-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-forest text-lg">{app.student_name}</span>
                      <span className="text-sage/60 text-sm">· {app.roll_number}</span>
                      <span className={`badge ${isPending ? 'badge-pending' : app.status === 'approved' ? 'badge-approved' : 'badge-rejected'}`}>
                        {isPending ? 'Pending' : app.status === 'approved' ? 'Approved' : 'Returned'}
                      </span>
                    </div>
                    <p className="text-sm text-hunter/60 mb-2">{app.programme} · {app.department}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1 bg-fern/10 text-fern px-2.5 py-1 rounded-full">
                        <Building2 className="w-3 h-3" /> {app.company_name || app.company_name_manual}
                      </span>
                      <span className="bg-sage/20 text-forest px-2.5 py-1 rounded-full">
                        {app.duration_type === 'summer' ? 'Summer' : '6-Month'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpanded(isExpanded ? null : app.application_id)}
                    className="btn-secondary py-2 px-3 text-xs flex-shrink-0 flex items-center gap-1"
                  >
                    {isExpanded
                      ? <><ChevronUp className="w-4 h-4" /> Hide</>
                      : <><ChevronDown className="w-4 h-4" /> Review</>
                    }
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-6 pb-8 pt-4 border-t border-sage/20 bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Student Info */}
                      <div className="bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-forest">👤 Student Information</h4>
                        <div className="space-y-3 text-sm">
                          <p><strong>Name:</strong> {app.student_name}</p>
                          <p><strong>Roll No:</strong> {app.roll_number}</p>
                          <p><strong>Email:</strong> {app.student_email}</p>
                          <p><strong>CGPA:</strong> {app.cgpa || app.student_cgpa || '—'}</p>
                          <p><strong>Semesters Completed:</strong> {app.semester_completed || '—'}</p>
                        </div>
                      </div>

                      {/* Internship Details */}
                      <div className="bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-forest">
                          <Building2 className="w-5 h-5" /> Internship Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <p><strong>Company:</strong> {app.company_name || app.company_name_manual || '—'}</p>
                          <p><strong>Role / Position:</strong> {app.role_title}</p>
                          <p><strong>Type:</strong> {app.duration_type === 'summer' ? 'Summer Internship' : '6-Month Internship'}</p>
                          <p><strong>Period:</strong> {app.start_date?.split('T')[0]} — {app.end_date?.split('T')[0]}</p>
                          <p><strong>Work Mode:</strong> {app.work_mode}</p>
                          <p><strong>Stipend:</strong> {app.stipend_amount ? `₹${app.stipend_amount} / month` : 'Not Mentioned'}</p>
                        </div>
                      </div>

                      {/* Offer Letter */}
                      {(app.offer_letter_url || app.offer_letter_full_url) && (
                        <div className="lg:col-span-2 bg-green-50 border border-green-200 p-6 rounded-3xl">
                          <h4 className="font-semibold mb-3">Offer Letter</h4>
                          <a
                            href={app.offer_letter_full_url || `http://localhost:5001${app.offer_letter_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline font-medium"
                          >
                            View Offer Letter <FileDown className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {/* Parent Permission */}
                      {app.parent_permission_url && (
                        <div className="lg:col-span-2 bg-green-50 border border-green-200 p-6 rounded-3xl">
                          <h4 className="font-semibold mb-3">Parent Permission Letter</h4>
                          <a
                            href={`http://localhost:5001${app.parent_permission_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-green-600 hover:underline font-medium"
                          >
                            View Parent Permission Letter <FileDown className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {/* Academic Status — 6-Month only */}
                      {app.duration_type === 'six_month' && (
                        <div className="lg:col-span-2 bg-bone p-6 rounded-3xl">
                          <h4 className="font-semibold mb-4">Academic Status</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-medium text-hunter/60 mb-1">RA / Arrear Courses</p>
                              <p className="text-sm">{app.ra_courses || 'None'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-hunter/60 mb-1">Pending Courses</p>
                              <p className="text-sm">{app.pending_courses || 'None'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Company Address */}
                      <div className="lg:col-span-2 bg-bone p-6 rounded-3xl">
                        <h4 className="font-semibold mb-3">Company Address</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {app.company_address || app.co_address || 'No address provided'}
                        </p>
                        <p className="mt-2 text-sm">
                          {app.company_city}, {app.company_state}, {app.company_country}
                        </p>
                      </div>

                      {/* Remarks textarea */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-2 text-hunter/70">
                          Tutor Remarks / Verification Notes (Optional)
                        </label>
                        <textarea
                          className="w-full px-5 py-4 border border-gray-300 rounded-3xl h-32 resize-y focus:outline-none focus:border-fern"
                          placeholder="Write your verification comments, concerns, or approval notes here..."
                          value={remarks[app.application_id] || ''}
                          onChange={(e) => setRemarks(prev => ({ ...prev, [app.application_id]: e.target.value }))}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="lg:col-span-2 flex gap-4 pt-6">
                        <button
                          onClick={() => handlePDF(app.application_id)}
                          disabled={pdfLoading === app.application_id}
                          className="flex-1 py-4 border border-gray-400 hover:bg-gray-100 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

                        {isPending && (
                          <>
                            <button
                              onClick={() => decide(app.application_id, 'approve')}
                              disabled={actionLoading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-semibold"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => decide(app.application_id, 'reject')}
                              disabled={actionLoading}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-semibold"
                            >
                              ❌ Return
                            </button>
                          </>
                        )}
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

export default TutorQueue;