import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Save, Send, CheckCircle, AlertCircle, Building2, Calendar, User, BookOpen } from 'lucide-react';
import api from '../../api.js';

const SixMonthInternshipForm = () => {
  const [companies, setCompanies] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [companyMode, setCompanyMode] = useState('select');

  const [form, setForm] = useState({
    company_id: '',
    company_name_manual: '',
    role_title: '',
    company_address: '',
    company_city: '',
    company_state: '',
    company_country: 'India',
    company_phone: '',
    duration_type: 'six_month',
    work_mode: 'on_site',
    how_obtained: '',
    start_date: '',
    end_date: '',
    guide_name_industry: '',
    guide_department: '',
    guide_contact: '',
    cgpa: '',
    semester_completed: '',
    ra_courses: '',
    pending_courses: '',
    has_declined_other: false,
    declined_company_name: '',
    declined_start_date: '',
    declined_end_date: '',
    declined_guide_name: '',
    declined_guide_contact: '',
    student_note: '',
    tutor_id: '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // Load Companies, Tutors, Profile
  useEffect(() => {
    Promise.all([
      api.get('/companies'),
      api.get('/tutors'),
      api.get('/student/profile')
    ]).then(([c, t, p]) => {
      setCompanies(c.data.map(co => ({ value: co.company_id, label: co.name, ...co })));
      setTutors(t.data.map(tu => ({ value: tu.user_id, label: tu.full_name })));
      setProfile(p.data);
      setForm(f => ({ ...f, cgpa: p.data.cgpa || '' }));
    });
  }, []);

  const handleSaveDraft = async () => {
    if (!form.company_id && !form.company_name_manual) {
      showToast('Please select or enter a company', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/applications/draft', form);
      setSavedId(data.application_id);
      setStatus('draft');
      showToast('Draft saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save draft', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!savedId) {
      showToast('Please save as draft first', 'error');
      return;
    }
    if (!form.tutor_id) {
      showToast('Please select a tutor', 'error');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.post('/applications/submit', { application_id: savedId });
      setStatus('pending_tutor');
      showToast('Application submitted successfully! Tutor notified.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`toast fixed top-5 right-5 z-[9999] ${toast.type === 'error' ? 'bg-red-600' : 'bg-fern'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-display text-forest">Final Semester Internship</h1>
        <p className="text-sage/70">6-Month Project Work II</p>
      </div>

      {/* Company Details */}
      <div className="card">
        <h3 className="section-header"><Building2 className="w-5 h-5" /> Company / Organisation Details</h3>
        <div className="flex gap-2 mb-4">
          {['select', 'manual'].map(m => (
            <button key={m} onClick={() => { setCompanyMode(m); set('company_id', ''); set('company_name_manual', ''); }}
              className={`px-4 py-2 rounded-xl text-sm ${companyMode === m ? 'bg-fern text-white' : 'border border-sage/40'}`}>
              {m === 'select' ? 'Select from List' : 'Enter Manually'}
            </button>
          ))}
        </div>

        {companyMode === 'select' ? (
          <Select options={companies} onChange={opt => set('company_id', opt?.value)} placeholder="Search company..." />
        ) : (
          <input className="form-input" value={form.company_name_manual} onChange={e => set('company_name_manual', e.target.value)} placeholder="Company Name" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="form-label">Role / Position *</label>
            <input className="form-input" value={form.role_title} onChange={e => set('role_title', e.target.value)} placeholder="Software Engineer Intern" />
          </div>
          <div>
            <label className="form-label">Work Mode</label>
            <select className="form-input" value={form.work_mode} onChange={e => set('work_mode', e.target.value)}>
              <option value="on_site">On-Site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="card">
        <h3 className="section-header"><Calendar className="w-5 h-5" /> Internship Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Start Date *</label>
            <input type="date" className="form-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="form-label">End Date *</label>
            <input type="date" className="form-input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Industry Guide */}
      <div className="card">
        <h3 className="section-header"><User className="w-5 h-5" /> Industry Guide / Mentor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Guide Name</label>
            <input className="form-input" value={form.guide_name_industry} onChange={e => set('guide_name_industry', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Guide Contact</label>
            <input className="form-input" value={form.guide_contact} onChange={e => set('guide_contact', e.target.value)} placeholder="Email / Mobile" />
          </div>
        </div>
      </div>

      {/* Academic Details - Specific for Six Month */}
      <div className="card">
        <h3 className="section-header"><BookOpen className="w-5 h-5" /> Academic Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">CGPA *</label>
            <input type="number" step="0.01" className="form-input" value={form.cgpa} onChange={e => set('cgpa', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Semesters Completed</label>
            <input type="number" className="form-input" value={form.semester_completed} onChange={e => set('semester_completed', e.target.value)} />
          </div>
        </div>

        <div className="mt-6">
          <label className="form-label">RA / Arrear Courses (if any)</label>
          <input className="form-input" value={form.ra_courses} onChange={e => set('ra_courses', e.target.value)} placeholder="MA101 - Mathematics, CS202 - Data Structures" />
        </div>

        <div className="mt-4">
          <label className="form-label">Pending Courses of Current Semester</label>
          <input className="form-input" value={form.pending_courses} onChange={e => set('pending_courses', e.target.value)} placeholder="CS789 - Artificial Intelligence" />
        </div>

        {/* Declined Another Offer */}
        <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.has_declined_other} onChange={e => set('has_declined_other', e.target.checked)} />
            <span className="text-sm">I have accepted another internship but declined it due to academic/health/financial reasons</span>
          </label>

          {form.has_declined_other && (
            <div className="mt-5 space-y-4">
              <input className="form-input" placeholder="Company Name & Address" value={form.declined_company_name} onChange={e => set('declined_company_name', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="form-input" value={form.declined_start_date} onChange={e => set('declined_start_date', e.target.value)} />
                <input type="date" className="form-input" value={form.declined_end_date} onChange={e => set('declined_end_date', e.target.value)} />
              </div>
              <input className="form-input" placeholder="Guide Name & Contact Details" value={form.declined_guide_name} onChange={e => set('declined_guide_name', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Tutor Selection */}
      <div className="card">
        <h3 className="section-header"><User className="w-5 h-5" /> Faculty Tutor</h3>
        <Select options={tutors} onChange={opt => set('tutor_id', opt?.value)} placeholder="Select your tutor" />
      </div>

      <div className="flex gap-3 pt-6">
        <button onClick={handleSaveDraft} disabled={loading} className="btn-secondary flex-1">
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button onClick={handleSubmit} disabled={submitLoading || !savedId} className="btn-primary flex-1">
          Submit for Tutor Approval
        </button>
      </div>
    </div>
  );
};

export default SixMonthInternshipForm;