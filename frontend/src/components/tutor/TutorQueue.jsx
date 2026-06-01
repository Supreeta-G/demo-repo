import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, FileDown, ChevronDown, ChevronUp, Building2, Download, Search, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api.js';
import Pagination from '../../components/Pagination';

const TutorQueue = ({ filter }) => {
  const [apps, setApps]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(null);
  const [remarks, setRemarks]         = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfLoading, setPdfLoading]   = useState(null);
  const [toast, setToast]             = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [workModeFilter, setWorkModeFilter] = useState('all');

  // Search & selection (reviewed tab)
  const [search, setSearch]           = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Pending cards: 5 per page; Reviewed table: 10 per page
  const itemsPerPage = filter === 'pending_tutor' ? 5 : 10;

  // Modal state
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal]   = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [checks, setChecks] = useState({
    date: false,
    accommodation: false,
    stipend: false,
  });

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
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  // ── Filtered list for reviewed tab ──
  const filtered = apps.filter((app) => {
    const workModeMatch =
      workModeFilter === 'all' ||
      app.work_mode?.toLowerCase().trim() === workModeFilter.toLowerCase();

    const q = search.trim().toLowerCase();
    const searchMatch = !q || (
      app.student_name?.toLowerCase().includes(q)        ||
      app.company_name?.toLowerCase().includes(q)        ||
      app.company_name_manual?.toLowerCase().includes(q) ||
      app.roll_number?.toLowerCase().includes(q)         ||
      app.ref_number?.toLowerCase().includes(q)
    );

    return workModeMatch && searchMatch;
  });

  // Reset page when search or workModeFilter changes
  useEffect(() => { setCurrentPage(1); }, [search, workModeFilter]);

  // Pagination (uses filtered for reviewed, apps for pending)
  const listToPage    = filter === 'pending_tutor' ? apps : filtered;
  const totalPages    = Math.ceil(listToPage.length / itemsPerPage);
  const paginatedApps = listToPage.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Selection helpers ──
  const toggleRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.application_id)));
    }
  };

  const allSelected  = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  // ── Excel export ──
  const handleExcelDownload = () => {
    const toExport = filtered.filter(a => selectedIds.has(a.application_id));
    if (toExport.length === 0) return showToast('Select at least one row', 'error');

    const rows = toExport.map(app => ({
      'Ref No.'      : app.ref_number || app.application_id || '-',
      'Roll No.'     : app.roll_number || '-',
      'Student Name' : app.student_name || '-',
      'Programme'    : app.programme || '-',
      'Department'   : app.department || '-',
      'Type'         : app.duration_type === 'summer' ? 'Summer' : '6-Month',
      'Company'      : app.company_name || app.company_name_manual || '-',
      'Role'         : app.role_title || '-',
      'Work Mode'    : app.work_mode || '-',
      'Start Date'   : app.start_date ? app.start_date.split('T')[0] : '-',
      'End Date'     : app.end_date   ? app.end_date.split('T')[0]   : '-',
      'Stipend (Rs)' : app.stipend_amount ?? '-',
      'CGPA'         : app.cgpa || '-',
      'Semesters'    : app.semester_completed || '-',
      'Status'       : app.status?.replace('_', ' ') || '-',
      'Tutor Remarks': app.tutor_remarks || '-',
      'Submitted At' : app.submitted_at ? app.submitted_at.split('T')[0] : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reviewed');
    XLSX.writeFile(wb, 'PSG_Reviewed_Applications_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('Downloaded ' + toExport.length + ' row(s) as Excel');
  };

  // ── Modal handlers ──
  const openApproveModal = (appId) => {
    setChecks({ date: false, accommodation: false, stipend: false });
    setApproveModal(appId);
  };

  const openRejectModal = (appId) => {
    setRejectRemark(remarks[appId] || '');
    setRejectModal(appId);
  };

  const allChecked = checks.date && checks.accommodation && checks.stipend;

  const confirmApprove = async () => {
    if (!allChecked) return;
    const appId = approveModal;
    setApproveModal(null);
    setActionLoading(appId + 'approve');
    try {
      await api.post('/tutor/decision', {
        application_id: appId,
        decision: 'approve',
        remarks: remarks[appId] || '',
      });
      showToast('Application ✅ Approved', 'success');
      load();
      setExpanded(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectRemark.trim()) {
      return showToast('Please enter a reason for rejection', 'error');
    }
    const appId = rejectModal;
    setRejectModal(null);
    setActionLoading(appId + 'reject');
    try {
      await api.post('/tutor/decision', {
        application_id: appId,
        decision: 'reject',
        remarks: rejectRemark,
      });
      showToast('Application ❌ Returned', 'error');
      load();
      setExpanded(null);
      setRemarks(r => ({ ...r, [appId]: '' }));
    } catch (err) {
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
      showToast(err.message || 'Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(null);
    }
  };

  const statusBadge = (status) => {
    const map = {
      approved:      'badge-approved',
      rejected:      'badge-rejected',
      returned:      'badge-rejected',
      pending_tutor: 'badge-pending',
      draft:         'badge-pending',
    };
    return map[status] || 'badge-pending';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {/* ── Approve Confirmation Modal ── */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-forest mb-2">Confirm Approval</h2>
            <p className="text-sm text-sage/80 mb-6">
              Please verify all details before approving. Tick all checkboxes to proceed.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { key: 'date',          label: 'I have verified the internship dates' },
                { key: 'accommodation', label: 'I have verified the accommodation details' },
                { key: 'stipend',       label: 'I have verified the stipend amount' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={() => setChecks(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-5 h-5 accent-fern rounded"
                  />
                  <span className="text-sm text-forest">{label}</span>
                </label>
              ))}
            </div>

            {!allChecked && (
              <p className="text-xs text-red-500 mb-4">
                ⚠️ Please tick all checkboxes to enable approval.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="flex-1 py-3 border border-gray-300 rounded-2xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={!allChecked}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-semibold transition-all"
              >
                ✅ Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Comment Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-forest mb-2">Return Application</h2>
            <p className="text-sm text-sage/80 mb-6">
              Please provide a reason so the student can correct and resubmit.
            </p>

            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl h-36 resize-y focus:outline-none focus:border-fern text-sm"
              placeholder="Enter reason for returning this application..."
              value={rejectRemark}
              onChange={e => setRejectRemark(e.target.value)}
              autoFocus
            />

            {rejectRemark.trim() === '' && (
              <p className="text-xs text-red-500 mt-2 mb-2">
                ⚠️ Reason is required to return an application.
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-3 border border-gray-300 rounded-2xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectRemark.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-semibold transition-all"
              >
                ❌ Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════════════
          REVIEWED — tabular layout with search + excel
      ══════════════════════════════════════════ */}
      {filter !== 'pending_tutor' ? (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-forest">Reviewed Applications</h1>
              <p className="text-sage/70">
                {filtered.length} application{filtered.length !== 1 ? 's' : ''} reviewed by you
                {filtered.length > 0 && (
                  <span className="ml-2 text-sage/50">
                    — showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                  </span>
                )}
              </p>
            </div>

            {/* Search + Excel toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
              <button
                onClick={handleExcelDownload}
                disabled={!someSelected}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  someSelected
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                ].join(' ')}
                title={someSelected ? `Download ${selectedIds.size} selected row(s)` : 'Select rows to download'}
              >
                <FileSpreadsheet className="w-4 h-4" />
                {someSelected ? `Excel (${selectedIds.size})` : 'Excel'}
              </button>
            </div>
          </div>

          {apps.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-14 h-14 text-sage/30 mb-4" />
              <p className="text-forest font-bold text-lg">No reviewed applications yet.</p>
            </div>
          ) : (
            <>
              <div className="card border border-sage/20 overflow-hidden">

                {/* Work Mode Filter */}
                <div className="flex gap-2 mb-4 p-4 pb-0">
                  {['all', 'remote', 'hybrid', 'on_site'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setWorkModeFilter(mode)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all border ${
                        workModeFilter === mode
                          ? 'bg-fern text-white border-fern'
                          : 'bg-white text-sage border-sage/30 hover:border-fern hover:text-fern'
                      }`}
                    >
                      {mode === 'all' ? 'All' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-bone border-b border-sage/20 text-xs text-sage/100 uppercase tracking-wide">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="w-4 h-4 accent-fern cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Ref No.</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Roll No.</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Name</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Company</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Offer Letter</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Parent Form</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Remarks</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">UNDERTAKING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApps.map((app) => {
                        const isSelected = selectedIds.has(app.application_id);
                        return (
                          <tr
                            key={app.application_id}
                            onClick={() => toggleRow(app.application_id)}
                            className={`border-b border-sage/10 last:border-0 transition-colors cursor-pointer ${
                              isSelected ? 'bg-emerald-50' : 'hover:bg-bone/40'
                            }`}
                          >
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRow(app.application_id)}
                                className="w-4 h-4 accent-fern cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{app.ref_number || app.application_id || '—'}</td>
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{app.roll_number || '—'}</td>
                            <td className="px-4 py-3 font-medium text-forest whitespace-nowrap">{app.student_name || '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                                {app.duration_type === 'summer' ? 'Summer' : '6-Month'}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[140px] truncate" title={app.company_name || app.company_name_manual}>
                              {app.company_name || app.company_name_manual || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`badge ${statusBadge(app.status)}`}>
                                {app.status?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              {(app.offer_letter_full_url || app.offer_letter_url) ? (
                                <a
                                  href={app.offer_letter_full_url || `http://localhost:5001${app.offer_letter_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-fern hover:underline font-medium"
                                >
                                  <FileDown className="w-3.5 h-3.5" /> View
                                </a>
                              ) : <span className="text-sage/40 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              {app.parent_permission_url ? (
                                <a
                                  href={`http://localhost:5001${app.parent_permission_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-fern hover:underline font-medium"
                                >
                                  <FileDown className="w-3.5 h-3.5" /> View
                                </a>
                              ) : <span className="text-sage/40 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 max-w-[180px]">
                              {app.tutor_remarks
                                ? <span className="text-xs text-hunter/70 line-clamp-2" title={app.tutor_remarks}>{app.tutor_remarks}</span>
                                : <span className="text-sage/40 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handlePDF(app.application_id)}
                                disabled={pdfLoading === app.application_id}
                                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
                              >
                                {pdfLoading === app.application_id
                                  ? <span className="w-3.5 h-3.5 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
                                  : <Download className="w-3.5 h-3.5" />}
                                PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

      ) : (
        /* ══════════════════════════════════════════
            PENDING — card layout
        ══════════════════════════════════════════ */
        <div className="p-4 md:p-6 max-w-4xl mx-auto page-enter">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display text-forest">Pending Approvals</h1>
            <p className="text-sage/80 text-sm mt-1">
              {apps.length} application{apps.length !== 1 ? 's' : ''}
              {apps.length > 0 && ' awaiting your review'}
              {apps.length > itemsPerPage && (
                <span className="ml-2 text-sage/50">
                  — showing {Math.min((currentPage - 1) * itemsPerPage + 1, apps.length)}–{Math.min(currentPage * itemsPerPage, apps.length)}
                </span>
              )}
            </p>
          </div>

          {apps.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-14 h-14 text-sage/30 mb-4" />
              <p className="text-forest font-bold text-lg">You're all caught up!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedApps.map((app, i) => {
                  const isExpanded = expanded === app.application_id;
                  const isPending  = app.status === 'pending_tutor';

                  return (
                    <div key={app.application_id} className="card border border-sage/20 overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>

                      {/* Card Header */}
                      <div className="flex items-start gap-4 p-4">
                        <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${app.status === 'approved' ? 'bg-emerald-400' : app.status === 'returned' ? 'bg-red-400' : 'bg-amber-400'}`} />
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
                        <button onClick={() => setExpanded(isExpanded ? null : app.application_id)} className="btn-secondary py-2 px-3 text-xs flex-shrink-0 flex items-center gap-1">
                          {isExpanded ? <><ChevronUp className="w-4 h-4" /> Hide</> : <><ChevronDown className="w-4 h-4" /> Review</>}
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
                                <a href={app.offer_letter_full_url || `http://localhost:5001${app.offer_letter_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline font-medium">
                                  View Offer Letter <FileDown className="w-4 h-4" />
                                </a>
                              </div>
                            )}

                            {/* Parent Permission */}
                            {app.parent_permission_url && (
                              <div className="lg:col-span-2 bg-green-50 border border-green-200 p-6 rounded-3xl">
                                <h4 className="font-semibold mb-3">Parent Permission Letter</h4>
                                <a href={`http://localhost:5001${app.parent_permission_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-600 hover:underline font-medium">
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
                              <p className="mt-2 text-sm">{app.company_city}, {app.company_state}, {app.company_country}</p>
                            </div>
                            {/* Declined Offer Details */}
                            {app.has_declined_other && (
                              <div className="lg:col-span-2 bg-red-50 border border-red-200 p-6 rounded-3xl">
                                <h4 className="font-semibold mb-4 flex items-center gap-2 text-red-700">
                                  Declined Other Offer Details
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">
                                  This student has accepted another internship but declined it due to 
                                  academic/health/financial reasons. Details below.
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="w-full border border-red-200 text-sm rounded-xl overflow-hidden">
                                    <thead>
                                      <tr className="bg-red-100 text-red-800 text-xs uppercase">
                                        <th className="border border-red-200 px-4 py-3 text-left">Name & Address</th>
                                        <th className="border border-red-200 px-4 py-3 text-left">From</th>
                                        <th className="border border-red-200 px-4 py-3 text-left">To</th>
                                        <th className="border border-red-200 px-4 py-3 text-left">Industry Guide</th>
                                        <th className="border border-red-200 px-4 py-3 text-left">Dept. Guide</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="bg-white">
                                        <td className="border border-red-200 px-4 py-3">
                                          {app.declined_company_details || '—'}
                                        </td>
                                        <td className="border border-red-200 px-4 py-3 whitespace-nowrap">
                                          {app.declined_start_date ? app.declined_start_date.split('T')[0] : '—'}
                                        </td>
                                        <td className="border border-red-200 px-4 py-3 whitespace-nowrap">
                                          {app.declined_end_date ? app.declined_end_date.split('T')[0] : '—'}
                                        </td>
                                        <td className="border border-red-200 px-4 py-3">
                                          {app.declined_guide_name || '—'}
                                        </td>
                                        <td className="border border-red-200 px-4 py-3">
                                          {app.declined_dept_guide || '—'}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {/* Action Buttons */}
                            {isPending && (
                              <div className="lg:col-span-2 flex gap-4 pt-6">
                                <button
                                  onClick={() => handlePDF(app.application_id)}
                                  disabled={pdfLoading === app.application_id}
                                  className="flex-1 py-4 border border-gray-400 hover:bg-gray-100 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                  {pdfLoading === app.application_id
                                    ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> Generating...</>
                                    : <><FileDown className="w-5 h-5" /> Download PDF</>}
                                </button>

                                <button
                                  onClick={() => openApproveModal(app.application_id)}
                                  disabled={!!actionLoading}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
                                >
                                  ✅ Approve
                                </button>

                                <button
                                  onClick={() => openRejectModal(app.application_id)}
                                  disabled={!!actionLoading}
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
                                >
                                  ❌ Return
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      )}
    </>
  );
};

export default TutorQueue;