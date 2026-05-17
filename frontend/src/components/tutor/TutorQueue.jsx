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
      decision: decision,           // 'approve' or 'reject'
      remarks: remarks[appId] || '' 
    });
    
    showToast(
      `Application ${decision === 'approve' ? '✅ Approved' : '❌ Rejected'}`, 
      decision === 'approve' ? 'success' : 'error'
    );
    
    load();                    
    setExpanded(null);
    setRemarks(r => ({ ...r, [appId]: '' }));
  } catch (err) {
    console.error(err);
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
  className="btn-secondary py-2 px-3 text-xs flex-shrink-0 flex items-center gap-1"
>
  {isExpanded ? (
    <>
      <ChevronUp className="w-4 h-4" />
      Hide
    </>
  ) : (
    <>
      <ChevronDown className="w-4 h-4" />
      Review
    </>
  )}
</button>
                </div>

                {/* Expanded Content */}
                {/* Expanded Content - Detailed Review */}
{/* Expanded Content - Full Verification View */}
{isExpanded && (
  <div className="px-6 pb-8 pt-4 border-t border-sage/20 bg-white">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Student Information */}
      <div className="bg-bone p-6 rounded-3xl">
        <h4 className="font-semibold mb-4 flex items-center gap-2 text-forest">
          👤 Student Information
        </h4>
        <div className="space-y-3 text-sm">
          <p><strong>Name:</strong> {app.student_name}</p>
          <p><strong>Roll No:</strong> {app.roll_number}</p>
          <p><strong>Email:</strong> {app.student_email}</p>
          <p><strong>CGPA:</strong> {app.cgpa || '—'}</p>
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
          <p><strong>Stipend:</strong> {app.stipend_amount ? `₹${app.stipend_amount}` : 'Not Mentioned'}</p>
          <p><strong>How Obtained:</strong> {app.how_obtained || '—'}</p>
        </div>
      </div>

      {/* Company Address */}
      <div className="lg:col-span-2 bg-bone p-6 rounded-3xl">
        <h4 className="font-semibold mb-3">📍 Company Address</h4>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {app.company_address || app.co_address || 'No address provided'}
        </p>
        <p className="mt-2 text-sm">
          {app.company_city}, {app.company_state}, {app.company_country}
        </p>
      </div>

      {/* Remarks */}
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

      {/* Actions */}
      <div className="lg:col-span-2 flex flex-wrap gap-4 pt-6">
        <button 
          onClick={() => handlePDF(app.application_id)}
          disabled={pdfLoading === app.application_id}
          className="flex-1 py-4 border border-gray-400 hover:bg-gray-100 rounded-2xl font-medium flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" />
          {pdfLoading === app.application_id ? 'Generating...' : 'Preview PDF'}
        </button>

        <button 
          onClick={() => decide(app.application_id, 'approve')}
          disabled={actionLoading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-lg"
        >
          ✅ Approve & Send to Student
        </button>

        <button 
          onClick={() => decide(app.application_id, 'reject')}
          disabled={actionLoading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-lg"
        >
          ❌ Reject Application
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

export default TutorQueue;