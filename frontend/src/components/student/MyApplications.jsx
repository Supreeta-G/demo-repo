import React, { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, FileDown, Lock, Unlock, Building2 } from 'lucide-react';
import api from '../../api.js';
import { generateInternshipPDF } from './pdfGenerator.js';

const statusConfig = {
  draft:         { label: 'Draft',           cls: 'badge-draft',    Icon: FileText, emoji: '📝' },
  pending_tutor: { label: 'Pending Tutor',   cls: 'badge-pending',  Icon: Clock,    emoji: '⏳' },
  approved:      { label: 'Approved',        cls: 'badge-approved', Icon: CheckCircle, emoji: '✅' },
  rejected:      { label: 'Rejected',        cls: 'badge-rejected', Icon: XCircle,  emoji: '❌' },
  cancelled:     { label: 'Cancelled',       cls: 'badge-draft',    Icon: XCircle,  emoji: '🚫' },
};

const MyApplications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    api.get('/student/applications')
      .then(({ data }) => setApps(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePDF = async (app) => {
    if (app.status !== 'approved') {
      showToast('PDF download is only available after tutor approval.', 'error');
      return;
    }
    setPdfLoading(app.application_id);
    try {
      // Track download in backend
      await api.post('/applications/pdf-download', { application_id: app.application_id });
      const { data } = await api.get(`/applications/${app.application_id}`);
      await generateInternshipPDF(data, true);
      showToast('PDF downloaded successfully! ✓');
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to generate PDF.', 'error');
    } finally { setPdfLoading(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto page-enter">
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-forest">My Applications</h1>
        <p className="text-sage/80 text-sm mt-1">{apps.length} application{apps.length !== 1 ? 's' : ''} found</p>
      </div>

      {apps.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-14 h-14 text-sage/30 mb-4" />
          <p className="text-forest font-bold text-lg">No applications yet</p>
          <p className="text-sage/70 text-sm mt-1 max-w-xs">Submit your first internship application to see it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app, i) => {
            const cfg = statusConfig[app.status] || statusConfig.draft;
            const canDownload = app.status === 'approved';

            return (
              <div key={app.application_id} className="card-hover animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex items-start gap-4">
                  {/* Status indicator bar */}
                  <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${
                    app.status === 'approved' ? 'bg-emerald-400' :
                    app.status === 'rejected' ? 'bg-red-400' :
                    app.status === 'pending_tutor' ? 'bg-amber-400' : 'bg-gray-300'
                  }`} />

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Building2 className="w-4 h-4 text-fern flex-shrink-0" />
                          <h3 className="font-bold text-forest text-base">{app.company_name || 'Draft Application'}</h3>
                          <span className={`badge ${cfg.cls}`}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        </div>
                        {app.role_title && <p className="text-sm text-hunter/60 ml-6">{app.role_title}</p>}
                      </div>

                      {/* PDF Button */}
                      <button
                        onClick={() => handlePDF(app)}
                        disabled={pdfLoading === app.application_id || !canDownload}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                          ${canDownload
                            ? 'bg-fern/10 border-fern/30 text-fern hover:bg-fern hover:text-white cursor-pointer shadow-sm'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                        title={canDownload ? 'Download PDF' : 'Available after approval'}>
                        {pdfLoading === app.application_id
                          ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          : canDownload ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {canDownload ? 'Download PDF' : 'PDF Locked'}
                      </button>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2 ml-6 mb-3">
                      <span className="bg-fern/10 text-fern text-xs px-2.5 py-1 rounded-full font-medium">
                        {app.duration_type === 'summer' ? '☀️ Summer' : '🎓 Final Semester'}
                      </span>
                      {app.work_mode && (
                        <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                          {app.work_mode === 'on_site' ? '🏢' : app.work_mode === 'remote' ? '💻' : '🔄'} {app.work_mode.replace('_', '-')}
                        </span>
                      )}
                      {app.company_city && (
                        <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                          📍 {app.company_city}
                        </span>
                      )}
                      {app.start_date && (
                        <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                          🗓 {new Date(app.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          {app.end_date ? ` → ${new Date(app.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}` : ''}
                        </span>
                      )}
                      {app.tutor_name && (
                        <span className="bg-sage/20 text-forest text-xs px-2.5 py-1 rounded-full">
                          👤 {app.tutor_name}
                        </span>
                      )}
                    </div>

                    {/* Tutor remarks */}
                    {app.tutor_remarks && (
                      <div className={`ml-6 p-3 rounded-xl text-xs border ${
                        app.status === 'approved'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}>
                        <span className="font-bold">Tutor Remarks: </span>{app.tutor_remarks}
                      </div>
                    )}

                    {/* PDF available notice */}
                    {app.status === 'approved' && (
                      <div className="ml-6 mt-2 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                        <FileDown className="w-3.5 h-3.5" />
                        Your PDF approval letter is ready for download!
                      </div>
                    )}
                    {app.status === 'pending_tutor' && (
                      <div className="ml-6 mt-2 flex items-center gap-2 text-xs text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                        Waiting for tutor review. You'll receive an email once decided.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-sage/10 flex flex-wrap gap-4 text-[11px] text-sage/60 ml-6">
                  <span>App #{app.application_id}</span>
                  <span>Created: {new Date(app.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  {app.submitted_at && (
                    <span>Submitted: {new Date(app.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  )}
                  {app.pdf_download_count > 0 && (
                    <span>Downloaded {app.pdf_download_count} time{app.pdf_download_count > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
