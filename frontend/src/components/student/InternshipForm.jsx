import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Select from 'react-select';
import {
  Save, Send, CheckCircle, AlertCircle, Building2, MapPin,
  Calendar, User, ChevronDown, BookOpen, Info, FileText, Lock
} from 'lucide-react';
import api from '../../api.js';

const WORK_MODES = [
  { value: 'on_site', label: '🏢 On-site' },
  { value: 'remote', label: '💻 Remote' },
  { value: 'hybrid', label: '🔄 Hybrid' },
];
const HOW_OBTAINED = [
  'Campus Placement', 'Self-Applied', 'PSG Alumni Referral', 'Faculty Referral',
  'Online Job Portal', 'Company Website', 'Internship Fair', 'Other',
];

const InternshipForm = () => {
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [companyMode, setCompanyMode] = useState('select'); // 'select' | 'manual'

  const [form, setForm] = useState({
    company_id: '',
    company_name_manual: '',
    role_title: '',
    intern_type: 'industry',
    company_address: '',
    company_city: '',
    company_state: '',
    company_country: 'India',
    company_phone: '',
    duration_type: location.state?.duration_type || 'summer',
    work_mode: 'on_site',
    how_obtained: '',
    start_date: '',
    end_date: '',
    attendance_days: '',
    guide_name_industry: '',
    guide_department: '',
    guide_contact: '',
    cgpa: '',
    semester_completed: '',
    ra_courses: '',
    pending_courses: '',
    has_declined_other: false,
    declined_company_details: '',
    stipend_amount: '',
    student_note: '',
    tutor_id: '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    Promise.all([api.get('/companies'), api.get('/tutors'), api.get('/student/profile')])
      .then(([c, t, p]) => {
        setCompanies(c.data.map(co => ({ value: co.company_id, label: co.name, ...co })));
        setTutors(t.data.map(tu => ({ value: tu.user_id, label: `${tu.full_name}` })));
        setProfile(p.data);
        setForm(f => ({
          ...f,
          cgpa: p.data.cgpa || '',
        }));
      }).catch(console.error);

    api.get('/student/applications').then(({ data }) => {
      const draft = data.find(a => a.status === 'draft');
      if (draft) {
        setSavedId(draft.application_id);
        setStatus(draft.status);
        setForm(f => ({
          ...f,
          company_id: draft.company_id || '',
          company_name_manual: draft.company_name_manual || '',
          role_title: draft.role_title || '',
          intern_type: draft.intern_type || 'industry',
          company_address: draft.company_address || '',
          company_city: draft.company_city || '',
          company_state: draft.company_state || '',
          company_country: draft.company_country || 'India',
          company_phone: draft.company_phone || '',
          duration_type: draft.duration_type || 'summer',
          work_mode: draft.work_mode || 'on_site',
          how_obtained: draft.how_obtained || '',
          start_date: draft.start_date?.slice(0, 10) || '',
          end_date: draft.end_date?.slice(0, 10) || '',
          attendance_days: draft.attendance_days || '',
          guide_name_industry: draft.guide_name_industry || '',
          guide_department: draft.guide_department || '',
          guide_contact: draft.guide_contact || '',
          cgpa: draft.cgpa || '',
          semester_completed: draft.semester_completed || '',
          ra_courses: draft.ra_courses || '',
          pending_courses: draft.pending_courses || '',
          has_declined_other: draft.has_declined_other || false,
          declined_company_details: draft.declined_company_details || '',
          stipend_amount: draft.stipend_amount || '',
          student_note: draft.student_note || '',
          tutor_id: draft.tutor_id || '',
        }));
        if (draft.company_name_manual) setCompanyMode('manual');
      }
    }).catch(() => {});
  }, []);

  // Auto-calculate attendance days
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const diff = Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24));
      if (diff > 0) setForm(f => ({ ...f, attendance_days: diff }));
    }
  }, [form.start_date, form.end_date]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSaveDraft = async () => {
    if (!form.duration_type) { showToast('Please select internship type.', 'error'); return; }
    if (!form.company_id && !form.company_name_manual) { showToast('Please select or enter a company.', 'error'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/applications/draft', form);
      setSavedId(data.application_id);
      setStatus('draft');
      showToast('Draft saved successfully! ✓');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save draft.', 'error');
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!savedId) { showToast('Save as draft first.', 'error'); return; }
    if (!form.tutor_id) { showToast('Please select a tutor before submitting.', 'error'); return; }
    setSubmitLoading(true);
    try {
      await api.post('/applications/submit', { application_id: savedId });
      setStatus('pending_tutor');
      showToast('Application submitted for tutor approval! 🎉');
    } catch (err) {
      showToast(err.response?.data?.error || 'Submission failed.', 'error');
    } finally { setSubmitLoading(false); }
  };

  const submitted = ['pending_tutor', 'approved', 'rejected'].includes(status);
  const isSummer = form.duration_type === 'summer';

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="section-header">
      <Icon className="w-4 h-4 text-fern" />
      <span>{title}</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 page-enter">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display text-forest">Internship Application</h1>
            <p className="text-sage/80 text-sm mt-1">
              {profile ? `${profile.full_name} · ${profile.roll_number || ''}` : 'Fill in your internship details below'}
            </p>
          </div>
          {status && (
            <span className={`badge text-sm py-1.5 px-3 ${
              status === 'draft' ? 'badge-draft' :
              status === 'pending_tutor' ? 'badge-pending' :
              status === 'approved' ? 'badge-approved' : 'badge-rejected'
            }`}>
              {status === 'draft' ? '📝' : status === 'pending_tutor' ? '⏳' : status === 'approved' ? '✅' : '❌'}
              &nbsp;{status.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>

        {/* Duration type toggle */}
        {!submitted && (
          <div className="mt-4 flex gap-3">
            {[['summer', '☀️ Summer Internship', 'Short Duration / Vacation'], ['six_month', '🎓 Final Semester', '6-Month Project Work']].map(([val, lbl, sub]) => (
              <button key={val} onClick={() => set('duration_type', val)}
                className={`flex-1 sm:flex-none flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm font-semibold
                  ${form.duration_type === val
                    ? 'border-fern bg-fern/10 text-forest shadow-md'
                    : 'border-sage/30 text-hunter/60 hover:border-sage bg-white/50'}`}>
                <span>{lbl}</span>
                <span className="text-[10px] font-normal text-hunter/40">{sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {submitted && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-3">
          <Lock className="w-4 h-4 flex-shrink-0" />
          This application has been submitted and is locked. {status === 'approved' && 'You can now download your approval PDF.'}
        </div>
      )}

      <div className="space-y-5">

        {/* 1. Company Details */}
        <div className="card animate-slide-up">
          <SectionHeader icon={Building2} title="Company / Organisation Details" />
          
          {!submitted && (
            <div className="flex gap-2 mb-4">
              {['select', 'manual'].map(m => (
                <button key={m} onClick={() => { setCompanyMode(m); set('company_id', ''); set('company_name_manual', ''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${companyMode === m ? 'bg-fern text-white border-fern' : 'border-sage/40 text-hunter/70 hover:border-fern'}`}>
                  {m === 'select' ? '🔍 Select from List' : '✏️ Enter Manually'}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyMode === 'select' ? (
              <div className="md:col-span-2">
                <label className="form-label">Company Name *</label>
                <Select
                  options={companies}
                  value={companies.find(c => c.value === form.company_id) || null}
                  onChange={opt => { set('company_id', opt?.value || ''); if (opt) { set('company_city', opt.city || ''); set('company_state', opt.state || ''); } }}
                  isDisabled={submitted}
                  placeholder="Search and select company..."
                  classNamePrefix="rs"
                  isClearable
                />
                <p className="text-[10px] text-sage/70 mt-1">Can't find your company? Switch to "Enter Manually"</p>
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="form-label">Company Name *</label>
                <input className="form-input" value={form.company_name_manual} disabled={submitted}
                  onChange={e => set('company_name_manual', e.target.value)} placeholder="Enter company name" />
              </div>
            )}

            <div>
              <label className="form-label">Role / Position</label>
              <input className="form-input" value={form.role_title} disabled={submitted}
                onChange={e => set('role_title', e.target.value)} placeholder="e.g. Software Engineering Intern" />
            </div>
            <div>
              <label className="form-label">Internship Type</label>
              <div className="flex gap-2">
                {[['industry', '🏭 Industry'], ['research', '🔬 Research']].map(([v, l]) => (
                  <label key={v} className={`flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-semibold
                    ${form.intern_type === v ? 'border-fern bg-fern/10 text-forest' : 'border-sage/30 text-hunter/60 hover:border-sage'}
                    ${submitted ? 'opacity-60 pointer-events-none' : ''}`}>
                    <input type="radio" name="intern_type" value={v} checked={form.intern_type === v}
                      onChange={() => !submitted && set('intern_type', v)} className="sr-only" />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">City</label>
              <input className="form-input" value={form.company_city} disabled={submitted}
                onChange={e => set('company_city', e.target.value)} placeholder="e.g. Chennai" />
            </div>
            <div>
              <label className="form-label">State</label>
              <input className="form-input" value={form.company_state} disabled={submitted}
                onChange={e => set('company_state', e.target.value)} placeholder="e.g. Tamil Nadu" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Company Full Address</label>
              <textarea className="form-input resize-none" rows={2} value={form.company_address} disabled={submitted}
                onChange={e => set('company_address', e.target.value)} placeholder="Full street address of the company" />
            </div>
            <div>
              <label className="form-label">Country</label>
              <input className="form-input" value={form.company_country} disabled={submitted}
                onChange={e => set('company_country', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Company Phone / Contact</label>
              <input className="form-input" value={form.company_phone} disabled={submitted}
                onChange={e => set('company_phone', e.target.value)} placeholder="Company contact number" />
            </div>
          </div>
        </div>

        {/* 2. Internship Duration & Mode */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <SectionHeader icon={Calendar} title="Duration, Mode & How Obtained" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={form.start_date} disabled={submitted}
                onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">End Date *</label>
              <input type="date" className="form-input" value={form.end_date} disabled={submitted}
                onChange={e => set('end_date', e.target.value)} />
            </div>
            {form.attendance_days && (
              <div className="md:col-span-2">
                <div className="p-3 bg-fern/10 border border-fern/20 rounded-xl text-sm text-forest flex items-center gap-2">
                  <Info className="w-4 h-4 text-fern flex-shrink-0" />
                  Duration: <strong>{form.attendance_days} days</strong> · Attendance will be needed for this period after reopening.
                </div>
              </div>
            )}
            <div>
              <label className="form-label">Work Mode *</label>
              <div className="flex gap-2">
                {WORK_MODES.map(({ value, label }) => (
                  <label key={value} className={`flex-1 flex items-center justify-center gap-1 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-semibold
                    ${form.work_mode === value ? 'border-fern bg-fern/10 text-forest' : 'border-sage/30 text-hunter/60 hover:border-sage'}
                    ${submitted ? 'opacity-60 pointer-events-none' : ''}`}>
                    <input type="radio" name="work_mode" value={value} checked={form.work_mode === value}
                      onChange={() => !submitted && set('work_mode', value)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Stipend (₹/month)</label>
              <input type="number" className="form-input" value={form.stipend_amount} disabled={submitted}
                onChange={e => set('stipend_amount', e.target.value)} placeholder="0 if unpaid" />
            </div>
            <div>
              <label className="form-label">How was the internship obtained?</label>
              <select className="form-input" value={form.how_obtained} disabled={submitted}
                onChange={e => set('how_obtained', e.target.value)}>
                <option value="">Select...</option>
                {HOW_OBTAINED.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Guide/Mentor Details */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <SectionHeader icon={User} title="Guide / Mentor in Industry" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Guide / Mentor Name *</label>
              <input className="form-input" value={form.guide_name_industry} disabled={submitted}
                onChange={e => set('guide_name_industry', e.target.value)} placeholder="Name of your industry guide" />
            </div>
            <div>
              <label className="form-label">Guide's Department</label>
              <input className="form-input" value={form.guide_department} disabled={submitted}
                onChange={e => set('guide_department', e.target.value)} placeholder="Department at company" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Guide Contact (Email / Mobile) *</label>
              <input className="form-input" value={form.guide_contact} disabled={submitted}
                onChange={e => set('guide_contact', e.target.value)} placeholder="guide@company.com or +91..." />
            </div>
          </div>
        </div>

        {/* 4. Academic Details */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <SectionHeader icon={BookOpen} title="Academic Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">CGPA (upto latest semester) *</label>
              <input type="number" step="0.01" min="0" max="10" className="form-input" value={form.cgpa} disabled={submitted}
                onChange={e => set('cgpa', e.target.value)} placeholder="e.g. 8.45" />
            </div>
            <div>
              <label className="form-label">Semesters Completed</label>
              <input type="number" min="1" max="8" className="form-input" value={form.semester_completed} disabled={submitted}
                onChange={e => set('semester_completed', e.target.value)} placeholder="e.g. 6" />
            </div>
            <div>
              <label className="form-label">RA Courses (if any)</label>
              <input className="form-input" value={form.ra_courses} disabled={submitted}
                onChange={e => set('ra_courses', e.target.value)} placeholder="Course code & title, or Nil" />
              <p className="text-[10px] text-sage/70 mt-1">Enter "Nil" if no RA courses</p>
            </div>
            <div>
              <label className="form-label">Pending Courses (current semester)</label>
              <input className="form-input" value={form.pending_courses} disabled={submitted}
                onChange={e => set('pending_courses', e.target.value)} placeholder="Course code & title, or Nil" />
            </div>
          </div>

          {/* Declined other offer */}
          <div className="mt-4 p-4 bg-bone rounded-xl border border-sage/20">
            <label className={`flex items-center gap-3 cursor-pointer ${submitted ? 'opacity-60' : ''}`}>
              <input type="checkbox" checked={form.has_declined_other} disabled={submitted}
                onChange={e => set('has_declined_other', e.target.checked)}
                className="w-4 h-4 accent-fern rounded" />
              <span className="text-sm text-forest font-medium">
                I have accepted another internship offer but have declined it due to academic/health/financial reasons.
              </span>
            </label>
            {form.has_declined_other && (
              <div className="mt-3">
                <label className="form-label">Details of Declined Company</label>
                <textarea className="form-input resize-none" rows={2} value={form.declined_company_details} disabled={submitted}
                  onChange={e => set('declined_company_details', e.target.value)}
                  placeholder="Company name, address, internship period, reason for declining..." />
              </div>
            )}
          </div>
        </div>

        {/* 5. Tutor Selection */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <SectionHeader icon={User} title="Tutor / Faculty Guide" />
          <div className="space-y-4">
            <div>
              <label className="form-label">Select Your Tutor for Approval *</label>
              <Select
                options={tutors}
                value={tutors.find(t => t.value === form.tutor_id) || null}
                onChange={opt => set('tutor_id', opt?.value || '')}
                isDisabled={submitted}
                placeholder="Search tutor by name..."
                classNamePrefix="rs"
                isClearable
              />
              <p className="text-xs text-sage/70 mt-1.5">
                Your application will be sent to this tutor for approval. Upon approval, you'll receive an email notification.
              </p>
            </div>
            <div>
              <label className="form-label">Note to Tutor (Optional)</label>
              <textarea className="form-input resize-none" rows={3} value={form.student_note} disabled={submitted}
                onChange={e => set('student_note', e.target.value)}
                placeholder="Any additional context or information for your tutor..." />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          {!submitted ? (
            <>
              <button onClick={handleSaveDraft} disabled={loading}
                className="btn-secondary">
                {loading ? <span className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
              <button onClick={handleSubmit} disabled={submitLoading || !savedId}
                className="btn-primary">
                {submitLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                Submit for Approval
              </button>
              {!savedId && (
                <p className="text-xs text-sage/70 self-center">Save as draft first before submitting</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-fern/10 border border-fern/20 rounded-xl text-sm text-forest">
              <CheckCircle className="w-4 h-4 text-fern" />
              Application submitted. Check <strong>My Applications</strong> for status and PDF download.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternshipForm;
