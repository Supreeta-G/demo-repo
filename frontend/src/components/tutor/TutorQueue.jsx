import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, FileDown, ChevronDown, ChevronUp, Building2, User, Calendar, Mail } from 'lucide-react';
import api from '../../api.js';
import { generateInternshipPDF } from '../student/pdfGenerator.js';

const TutorQueue = ({ filter }) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ==================== FIXED LOAD FUNCTION ====================
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tutor/queue');
      
      // Let backend handle filtering - more reliable
      if (filter === 'pending_tutor') {
        setApps(data.filter(a => a.status === 'pending_tutor'));
      } else {
        setApps(data.filter(a => a.status !== 'pending_tutor'));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]); // Re-load when switching between Pending & Reviewed

  const decide = async (appId, decision) => {
    const key = appId + decision;
    setActionLoading(key);
    try {
      await api.post('/tutor/decision', { 
        application_id: appId, 
        decision, 
        remarks: remarks[appId] || '' 
      });
      
      showToast(
        `Application ${decision === 'approve' ? '✅ Approved' : '❌ Rejected'}`, 
        decision === 'approve' ? 'success' : 'error'
      );
      
      // Refresh list immediately
      load();
      setExpanded(null);
      setRemarks(r => ({ ...r, [appId]: '' })); // Clear remarks
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePDF = async (appId) => {
    setPdfLoading(appId);
    try {
      const { data } = await api.get(`/applications/${appId}`);
      await generateInternshipPDF(data, true);
    } catch (e) {
      console.error(e);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto page-enter">
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-forest">
          {filter === 'pending_tutor' ? '⏳ Pending Approvals' : '✅ Reviewed Applications'}
        </h1>
        <p className="text-sage/80 text-sm mt-1">
          {apps.length} application{apps.length !== 1 ? 's' : ''}
          {filter === 'pending_tutor' && apps.length > 0 && ' awaiting your review'}
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-14 h-14 text-sage/30 mb-4" />
          <p className="text-forest font-bold text-lg">
            {filter === 'pending_tutor' ? "You're all caught up!" : 'No reviewed applications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app, i) => {
            const isExpanded = expanded === app.application_id;
            const isPending = app.status === 'pending_tutor';

            return (
              <div key={app.application_id} className="card border border-sage/20 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}>
                
                {/* Header */}
                <div className="flex items-start gap-4 p-4">
                  <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${
                    app.status === 'approved' ? 'bg-emerald-400' :
                    app.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-forest text-lg">{app.student_name}</span>
                      <span className="text-sage/60 text-sm">· {app.roll_number}</span>
                      <span className={`badge ${isPending ? 'badge-pending' : app.status === 'approved' ? 'badge-approved' : 'badge-rejected'}`}>
                        {isPending ? '⏳ Pending' : app.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                      </span>
                    </div>

                    <p className="text-sm text-hunter/60 mb-2">{app.programme} · {app.department}</p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1 bg-fern/10 text-fern px-2.5 py-1 rounded-full">
                        <Building2 className="w-3 h-3" /> {app.company_name}
                      </span>
                      <span className="bg-sage/20 text-forest px-2.5 py-1 rounded-full">
                        {app.duration_type === 'summer' ? '☀️ Summer' : '🎓 6-Month'}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setExpanded(isExpanded ? null : app.application_id)}
                    className="btn-secondary py-2 px-3 text-xs flex-shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Hide' : 'Review'}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-sage/20 animate-slide-in">
                    {/* ... (rest of your expanded content remains same) ... */}
                    {/* I'll keep it short here - you can keep your existing expanded panel */}

                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-bone rounded-xl">
                        <p className="text-xs font-semibold text-hunter/60 mb-2">STUDENT</p>
                        <p>{app.student_name}</p>
                        <p className="text-sm text-sage/70">{app.student_email}</p>
                      </div>
                      <div className="p-3 bg-bone rounded-xl">
                        <p className="text-xs font-semibold text-hunter/60 mb-2">INTERNSHIP</p>
                        <p>{app.company_name}</p>
                        <p className="text-sm text-sage/70">{app.role_title}</p>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-hunter/60 mb-1">
                        {isPending ? 'Your Remarks (Optional)' : 'Remarks'}
                      </label>
                      <textarea
                        className="form-input resize-none"
                        rows={3}
                        disabled={!isPending}
                        value={isPending ? (remarks[app.application_id] || '') : (app.tutor_remarks || '')}
                        onChange={e => setRemarks(r => ({ ...r, [app.application_id]: e.target.value }))}
                        placeholder="Add your comments here..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => handlePDF(app.application_id)} disabled={pdfLoading === app.application_id} className="btn-secondary">
                        {pdfLoading === app.application_id ? 'Generating...' : 'Preview PDF'}
                      </button>

                      {isPending && (
                        <>
                          <button 
                            onClick={() => decide(app.application_id, 'approve')}
                            disabled={actionLoading}
                            className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                          >
                            {actionLoading === (app.application_id + 'approve') ? 'Approving...' : 'Approve'}
                          </button>
                          <button 
                            onClick={() => decide(app.application_id, 'reject')}
                            disabled={actionLoading}
                            className="btn-danger"
                          >
                            {actionLoading === (app.application_id + 'reject') ? 'Rejecting...' : 'Reject'}
                          </button>
                        </>
                      )}
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