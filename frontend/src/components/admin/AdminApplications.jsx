import React, { useState, useEffect } from 'react';
import { Search, Download, Unlock, Trash2, FileDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api.js';

const AdminApplications = () => {
  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfLoading, setPdfLoading]       = useState(null);
  const [toast, setToast]                 = useState(null);
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [workModeFilter, setWorkModeFilter] = useState('all');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

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

  useEffect(() => { 
  setWorkModeFilter('all');
  fetchApplications(); 
}, [statusFilter]);

  const filtered = applications.filter((app) => {
  const q = search.trim().toLowerCase();
  const matchesSearch = !q || (
    app.student_name?.toLowerCase().includes(q)        ||
    app.company_name?.toLowerCase().includes(q)        ||
    app.company_name_manual?.toLowerCase().includes(q) ||
    app.roll_number?.toLowerCase().includes(q)         ||
    app.ref_number?.toLowerCase().includes(q)
  );
  const matchesMode = workModeFilter === 'all' || app.work_mode?.toLowerCase().trim() === workModeFilter;
  return matchesSearch && matchesMode;
});

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

  const handleExcelDownload = () => {
    const toExport = filtered.filter(a => selectedIds.has(a.application_id));
    if (toExport.length === 0) return showToast('Select at least one row', 'error');

    const rows = toExport.map(app => ({
      'Ref No.'       : app.application_id || '-',
      'Roll No.'      : app.roll_number || '-',
      'Student Name'  : app.student_name || '-',
      'Programme'     : app.programme || '-',
      'Department'    : app.department || '-',
      'Type'          : app.duration_type === 'summer' ? 'Summer' : '6-Month',
      'Company'       : app.company_name || app.company_name_manual || '-',
      'Role'          : app.role_title || '-',
      'Work Mode'     : app.work_mode || '-',
      'Start Date'    : app.start_date ? app.start_date.split('T')[0] : '-',
      'End Date'      : app.end_date   ? app.end_date.split('T')[0]   : '-',
      'Stipend (Rs)'  : app.stipend_amount ?? '-',
      'CGPA'          : app.cgpa || '-',
      'Semesters'     : app.semester_completed || '-',
      'Tutor Name'  : app.tutor_name || app.tutor_contact_email || '-',
      'Tutor Email' : app.tutor_contact_email || app.tutor_email || '-',
      'Status'        : app.status?.replace('_', ' ') || '-',
      'Submitted At'  : app.submitted_at ? app.submitted_at.split('T')[0] : '-',
      'Tutor Remarks' : app.tutor_remarks || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');

    const fileName = 'PSG_Internship_Applications_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
    showToast('Downloaded ' + toExport.length + ' row(s) as Excel');
  };

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
      await api.delete('/admin/applications/' + id);
      showToast('Application deleted');
      fetchApplications();
    } catch {
      showToast('Failed to delete', 'error');
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
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ application_id }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server error: ' + response.status);
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Received empty PDF from server.');
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = 'Internship_' + String(application_id).replace(/\//g, '_') + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('PDF Downloaded Successfully!');
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
      pending_tutor: 'badge-pending',
      draft:         'badge-pending',
    };
    return map[status] || 'badge-pending';
  };

  const allSelected  = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {toast && (
        <div className={['toast fixed top-5 right-5 z-[9999] text-white', toast.type === 'error' ? 'bg-red-600' : 'bg-fern'].join(' ')}>
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

          <button
            onClick={handleExcelDownload}
            disabled={!someSelected}
            className={['flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all', someSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'].join(' ')}
            title={someSelected ? 'Download ' + selectedIds.size + ' selected row(s)' : 'Select rows to download'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {someSelected ? 'Excel (' + selectedIds.size + ')' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card border border-sage/20 overflow-hidden">
          <div className="flex gap-2 p-4 border-b border-sage/20">
  {['all', 'remote', 'hybrid', 'on_site'].map(mode => (
    <button
      key={mode}
      onClick={() => setWorkModeFilter(mode)}
      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
        workModeFilter === mode
          ? 'bg-fern text-white border-fern'
          : 'bg-white text-sage border-sage/30 hover:border-fern hover:text-fern'
      }`}
    >
      {mode === 'all' ? 'All' : mode === 'on_site' ? 'On Site' : mode.charAt(0).toUpperCase() + mode.slice(1)}
    </button>
  ))}
</div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sage/70">No applications found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">

                <thead>
                  <tr className="bg-bone border-b border-sage/20 text-xs text-sage/100 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-fern cursor-pointer"
                        title="Select all"
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
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">PDF</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((app) => {
                    const isSelected = selectedIds.has(app.application_id);
                    return (
                      <tr
                        key={app.application_id}
                        className={['border-b border-sage/10 last:border-0 transition-colors cursor-pointer', isSelected ? 'bg-emerald-50' : 'hover:bg-bone/40'].join(' ')}
                        onClick={() => toggleRow(app.application_id)}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(app.application_id)}
                            className="w-4 h-4 accent-fern cursor-pointer"
                          />
                        </td>

                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {app.ref_number || app.application_id || '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {app.roll_number || '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-forest whitespace-nowrap">
                          {app.student_name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                            {app.duration_type === 'summer' ? 'Summer' : '6-Month'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[140px] truncate" title={app.company_name || app.company_name_manual}>
                          {app.company_name || app.company_name_manual || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={statusBadge(app.status) + ' badge'}>
                            {app.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {(app.offer_letter_full_url || app.offer_letter_url) ? (
                            <a
                              href={app.offer_letter_full_url || 'http://localhost:5001' + app.offer_letter_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-fern hover:underline font-medium"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View
                            </a>
                          ) : <span className="text-sage/40 text-xs">-</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {app.parent_permission_url ? (
                            <a
                              href={'http://localhost:5001' + app.parent_permission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-fern hover:underline font-medium"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View
                            </a>
                          ) : <span className="text-sage/40 text-xs">-</span>}
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
                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
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
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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